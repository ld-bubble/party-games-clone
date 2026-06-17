// Beopardy — a safe, buzz-in trivia game for groups.
//
// Roles: the host PLAYS like everyone else. When someone buzzes, a random
// player who didn't buzz becomes the VERIFIER for that clue: they privately
// receive the answer (beopardy:answerinfo) and judge Correct/Wrong. The
// verifier is locked out of buzzing on that clue. Re-buzzes after a wrong
// answer reuse the same verifier so only one person gets "tainted" per clue.
//
// Identity: players are keyed by lowercase name (nameKey), NOT socket id, so a
// phone refresh mid-game keeps your score. All answer text lives in
// room.private and is only emitted privately to the verifier or broadcast
// after a clue resolves.
const { listPacks, getPack } = require("./packs");

const MIN_DD_WAGER = 100;

function nameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function keyOf(room, socketId) {
  const m = room.members.get(socketId);
  return m ? nameKey(m.name) : null;
}

function presentKeys(room) {
  return new Set([...room.members.values()].map((m) => nameKey(m.name)));
}

function emitToKey(io, room, key, event, payload) {
  for (const [id, m] of room.members) {
    if (nameKey(m.name) === key) io.to(id).emit(event, payload);
  }
}

function ensurePlayer(room, name) {
  const key = nameKey(name);
  if (!key) return null;
  if (!room.game.players[key]) room.game.players[key] = { name: String(name).trim(), score: 0 };
  return key;
}

function maxBoardValue(room) {
  let max = 0;
  for (const c of room.private.pack.categories) {
    for (const cl of c.clues) max = Math.max(max, cl.value);
  }
  return max;
}

// Random verifier among present players, excluding `excludeKey` (the buzzer /
// DD selector). Degenerate solo case: they self-verify.
function pickVerifier(room, excludeKey) {
  const pool = [...presentKeys(room)].filter((k) => k !== excludeKey);
  if (!pool.length) return excludeKey;
  return pool[Math.floor(Math.random() * pool.length)];
}

function activeClueData(room) {
  const g = room.game;
  if (!g.active) return null;
  return room.private.pack.categories[g.active.cat].clues[g.active.row];
}

function sendAnswerInfo(io, room, key) {
  const clue = activeClueData(room);
  if (!clue) return;
  emitToKey(io, room, key, "beopardy:answerinfo", { clue: clue.clue, answer: clue.answer });
}

function startFinalWager(room) {
  const g = room.game;
  g.phase = "final_wager";
  g.active = null;
  g.final = {
    category: room.private.pack.final.category,
    clue: null,
    answer: null,
    wagered: [],
    answered: [],
    reveals: null,
  };
  room.private.finalWagers = {};
  room.private.finalAnswers = {};
}

// Mark the active clue used, reveal its answer to everyone, optionally hand
// control to `controlToKey`, and return to the board (or Final if exhausted).
function resolveClue(room, controlToKey) {
  const g = room.game;
  const clue = activeClueData(room);
  g.board[g.active.cat].clues[g.active.row].used = true;
  g.revealedAnswer = { clue: clue.clue, answer: clue.answer, value: clue.value };
  if (controlToKey) g.controlKey = controlToKey;
  g.active = null;
  g.buzzedKey = null;
  g.verifierKey = null;
  g.lockedKeys = [];
  g.wager = null;
  const allUsed = g.board.every((c) => c.clues.every((cl) => cl.used));
  if (allUsed) startFinalWager(room);
  else g.phase = "board";
}

function maybeAdvanceFinal(room, force) {
  const g = room.game;
  const present = [...presentKeys(room)];
  if (g.phase === "final_wager") {
    const all = present.every((k) => k in room.private.finalWagers);
    if (all || force) {
      g.phase = "final_answer";
      g.final.clue = room.private.pack.final.clue;
    }
  } else if (g.phase === "final_answer") {
    const all = present.every((k) => k in room.private.finalAnswers);
    if (all || force) {
      g.phase = "final_judging";
      g.final.answer = room.private.pack.final.answer;
      g.final.reveals = Object.keys(room.private.finalWagers)
        .filter((k) => g.players[k])
        .map((k) => ({
          key: k,
          name: g.players[k].name,
          wager: room.private.finalWagers[k],
          answer: room.private.finalAnswers[k] ?? "(no answer)",
          correct: false,
        }));
    }
  }
}

function init(room) {
  const g = room.game;
  if (!g.phase) g.phase = "setup";
  if (!g.players) g.players = {};
  if (!g.packs) g.packs = listPacks();
  if (!g.lockedKeys) g.lockedKeys = [];
}

function register(io, socket, { room, broadcastState }) {
  const g = room.game;

  if (!g.hostId || !room.members.has(g.hostId)) g.hostId = socket.id;
  const myName = room.members.get(socket.id)?.name;
  if (myName) ensurePlayer(room, myName);

  // A refreshed verifier needs the answer again.
  const myKey = () => keyOf(room, socket.id);
  if (g.active && g.verifierKey && g.verifierKey === myKey()) {
    sendAnswerInfo(io, room, g.verifierKey);
  }

  const isHost = () => socket.id === g.hostId;

  socket.on("beopardy:start", ({ packId } = {}) => {
    if (!isHost() || (g.phase !== "setup" && g.phase !== "gameover")) return;
    const packs = listPacks();
    const pack = getPack(packId) || (packs[0] && getPack(packs[0].id));
    if (!pack) return;
    room.private.pack = pack;
    g.packId = pack.id;
    g.packTitle = pack.title;
    g.board = pack.categories.map((c) => ({
      name: c.name,
      clues: c.clues.map((cl) => ({ value: cl.value, used: false })),
    }));
    // Daily Double: random category, any row but the cheapest.
    const ddCat = Math.floor(Math.random() * g.board.length);
    const rows = pack.categories[ddCat].clues.length;
    const ddRow = 1 + Math.floor(Math.random() * (rows - 1));
    room.private.dd = { cat: ddCat, row: ddRow };
    g.players = {};
    for (const m of room.members.values()) ensurePlayer(room, m.name);
    g.controlKey = keyOf(room, g.hostId);
    g.active = null;
    g.buzzedKey = null;
    g.verifierKey = null;
    g.lockedKeys = [];
    g.wager = null;
    g.revealedAnswer = null;
    g.final = null;
    g.phase = "board";
    broadcastState();
  });

  socket.on("beopardy:select", ({ cat, row } = {}) => {
    if (g.phase !== "board") return;
    const me = myKey();
    if (me !== g.controlKey && !isHost()) return;
    const cell = g.board?.[cat]?.clues?.[row];
    if (!cell || cell.used) return;
    const clue = room.private.pack.categories[cat].clues[row];
    const isDD = room.private.dd.cat === cat && room.private.dd.row === row;
    g.revealedAnswer = null;
    g.active = { cat, row, value: clue.value, clue: clue.clue, isDD };
    g.buzzedKey = null;
    g.verifierKey = null;
    g.lockedKeys = [];
    g.wager = null;
    if (isDD) {
      // Only the controller answers a Daily Double; verifier assigned now.
      g.phase = "dd_wager";
      g.verifierKey = pickVerifier(room, g.controlKey);
      if (g.verifierKey !== g.controlKey) g.lockedKeys = [g.verifierKey];
      sendAnswerInfo(io, room, g.verifierKey);
    } else {
      g.phase = "clue";
    }
    broadcastState();
  });

  socket.on("beopardy:buzz", () => {
    if (g.phase !== "clue" || g.buzzedKey) return;
    const me = myKey();
    if (!me || g.lockedKeys.includes(me)) return;
    g.buzzedKey = me;
    if (!g.verifierKey) {
      g.verifierKey = pickVerifier(room, me);
      if (g.verifierKey !== me && !g.lockedKeys.includes(g.verifierKey)) {
        g.lockedKeys.push(g.verifierKey);
      }
      sendAnswerInfo(io, room, g.verifierKey);
    }
    g.phase = "judging";
    broadcastState();
  });

  socket.on("beopardy:judge", ({ correct } = {}) => {
    if (g.phase !== "judging" && g.phase !== "dd_judging") return;
    if (myKey() !== g.verifierKey) return;
    const isDD = g.phase === "dd_judging";
    const answererKey = g.buzzedKey;
    const p = g.players[answererKey];
    if (!p) return;
    const delta = isDD ? g.wager : g.active.value;
    io.to(room.code).emit("beopardy:verdict", {
      correct: !!correct,
      key: answererKey,
      name: p.name,
      delta,
    });
    if (correct) {
      p.score += delta;
      resolveClue(room, answererKey);
    } else {
      p.score -= delta;
      if (isDD) {
        // DD selector keeps control even when wrong.
        resolveClue(room, null);
      } else {
        if (!g.lockedKeys.includes(answererKey)) g.lockedKeys.push(answererKey);
        g.buzzedKey = null;
        const eligible = [...presentKeys(room)].filter((k) => !g.lockedKeys.includes(k));
        if (eligible.length === 0) resolveClue(room, null);
        else g.phase = "clue";
      }
    }
    broadcastState();
  });

  socket.on("beopardy:skip", () => {
    if (g.phase !== "clue" || g.buzzedKey) return;
    if (myKey() !== g.controlKey && !isHost()) return;
    resolveClue(room, null);
    broadcastState();
  });

  socket.on("beopardy:wager", ({ amount } = {}) => {
    if (g.phase !== "dd_wager") return;
    const me = myKey();
    if (me !== g.controlKey) return;
    const p = g.players[me];
    if (!p) return;
    let w = Math.round(Number(amount));
    if (!Number.isFinite(w)) return;
    w = Math.max(MIN_DD_WAGER, Math.min(Math.max(p.score, maxBoardValue(room)), w));
    g.wager = w;
    g.buzzedKey = me;
    g.phase = "dd_judging";
    broadcastState();
  });

  socket.on("beopardy:final_start", () => {
    if (!isHost() || g.phase !== "board") return;
    startFinalWager(room);
    broadcastState();
  });

  socket.on("beopardy:final_wager", ({ amount } = {}) => {
    if (g.phase !== "final_wager") return;
    const me = myKey();
    const p = g.players[me];
    if (!p) return;
    let w = Math.round(Number(amount));
    if (!Number.isFinite(w)) return;
    w = Math.max(0, Math.min(Math.max(p.score, 0), w));
    room.private.finalWagers[me] = w;
    if (!g.final.wagered.includes(me)) g.final.wagered.push(me);
    maybeAdvanceFinal(room);
    broadcastState();
  });

  socket.on("beopardy:final_answer", ({ text } = {}) => {
    if (g.phase !== "final_answer") return;
    const me = myKey();
    if (!me || !g.players[me]) return;
    if (!(me in room.private.finalWagers)) room.private.finalWagers[me] = 0;
    room.private.finalAnswers[me] = String(text || "").slice(0, 120);
    if (!g.final.answered.includes(me)) g.final.answered.push(me);
    maybeAdvanceFinal(room);
    broadcastState();
  });

  socket.on("beopardy:final_force", () => {
    if (!isHost()) return;
    if (g.phase !== "final_wager" && g.phase !== "final_answer") return;
    maybeAdvanceFinal(room, true);
    broadcastState();
  });

  socket.on("beopardy:final_mark", ({ key, correct } = {}) => {
    if (g.phase !== "final_judging" || !isHost() || !g.final?.reveals) return;
    const r = g.final.reveals.find((x) => x.key === key);
    if (r) r.correct = !!correct;
    broadcastState();
  });

  socket.on("beopardy:final_apply", () => {
    if (g.phase !== "final_judging" || !isHost() || !g.final?.reveals) return;
    for (const r of g.final.reveals) {
      const p = g.players[r.key];
      if (p) p.score += r.correct ? r.wager : -r.wager;
    }
    g.phase = "gameover";
    broadcastState();
  });

  socket.on("beopardy:newGame", () => {
    if (!isHost()) return;
    g.phase = "setup";
    g.board = null;
    g.active = null;
    g.final = null;
    g.revealedAnswer = null;
    g.buzzedKey = null;
    g.verifierKey = null;
    g.lockedKeys = [];
    g.wager = null;
    g.controlKey = null;
    g.players = {};
    for (const m of room.members.values()) ensurePlayer(room, m.name);
    broadcastState();
  });
}

function onLeave(room, socketId, io) {
  const g = room.game;
  if (g.hostId === socketId) {
    const next = room.members.keys().next();
    g.hostId = next.done ? null : next.value;
  }
  if (!g.phase || g.phase === "setup" || g.phase === "gameover") return;
  const present = presentKeys(room);

  if (g.controlKey && !present.has(g.controlKey)) {
    g.controlKey = g.hostId ? keyOf(room, g.hostId) : null;
  }
  if (g.phase === "judging" && g.buzzedKey && !present.has(g.buzzedKey)) {
    // Answerer vanished mid-answer: reopen the buzzer for everyone else.
    g.buzzedKey = null;
    g.phase = "clue";
  }
  if (g.phase === "dd_judging" && g.buzzedKey && !present.has(g.buzzedKey)) {
    resolveClue(room, null); // DD selector vanished: reveal and move on
  }
  if (g.active && g.verifierKey && !present.has(g.verifierKey)) {
    const exclude = g.buzzedKey || g.controlKey;
    g.verifierKey = pickVerifier(room, exclude);
    if (g.verifierKey !== exclude && !g.lockedKeys.includes(g.verifierKey)) {
      g.lockedKeys.push(g.verifierKey);
    }
    if (io) sendAnswerInfo(io, room, g.verifierKey);
  }
  if (g.phase === "final_wager" || g.phase === "final_answer") {
    maybeAdvanceFinal(room); // a leaver may have been the one we waited on
  }
}

module.exports = { id: "beopardy", init, register, onLeave };
