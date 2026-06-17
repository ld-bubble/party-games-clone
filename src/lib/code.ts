// Room codes: 4 unambiguous uppercase characters (no O/0/I/1 confusion).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeRoomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
