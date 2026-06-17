// Pack loader for Beopardy.
//
// THIS IS THE AI-GENERATION SEAM: a "pack" is plain JSON (see
// ./packs/trivia-classics.json for the shape). When AI generation is wired
// in, it just needs to produce objects of the same shape and register them
// here (or this module can be extended to read a directory / database).
const triviaClassics = require("./packs/trivia-classics.json");

const PACKS = [triviaClassics];

function listPacks() {
  return PACKS.map((p) => ({ id: p.id, title: p.title }));
}

function getPack(id) {
  return PACKS.find((p) => p.id === id) || null;
}

module.exports = { listPacks, getPack };
