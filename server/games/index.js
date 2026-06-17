// Server-side game registry. To add a new game, create a module that exports
// { id, init(room), register(io, socket, ctx) } and register it here. The
// client-facing catalog (name, blurb, emoji) lives in src/games/catalog.json.
const wheel = require("./wheel");
const disordered = require("./disordered");
const beopardy = require("./beopardy");
const twotruths = require("./twotruths");
const punchline = require("./punchline");

const GAMES = {
  [wheel.id]: wheel,
  [disordered.id]: disordered,
  [beopardy.id]: beopardy,
  [twotruths.id]: twotruths,
  [punchline.id]: punchline,
};

function getGame(id) {
  return GAMES[id];
}

module.exports = { getGame, GAMES };
