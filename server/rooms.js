// In-memory room store. Rooms are ephemeral and live for the duration of a
// session — they're created on first join and discarded when everyone leaves.
// (Single-instance only. Add Redis here if you ever scale to multiple replicas.)
const rooms = new Map();

function makeRoom(code, gameId) {
  return {
    code,
    gameId,
    members: new Map(), // socketId -> { id, name }
    game: {}, // game-specific PUBLIC state, owned by the game module
    private: {}, // game-specific SECRET state — never sent to clients
    createdAt: Date.now(),
  };
}

function getOrCreateRoom(code, gameId) {
  let room = rooms.get(code);
  if (!room) {
    room = makeRoom(code, gameId);
    rooms.set(code, room);
  }
  return room;
}

function getRoom(code) {
  return rooms.get(code);
}

function removeRoom(code) {
  rooms.delete(code);
}

function publicState(room) {
  return {
    code: room.code,
    gameId: room.gameId,
    members: [...room.members.values()].map((m) => ({ id: m.id, name: m.name })),
    game: room.game,
  };
}

module.exports = { getOrCreateRoom, getRoom, removeRoom, publicState };
