import catalog from "./catalog.json";

export type GameStatus = "live" | "soon";

export interface GameMeta {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  accent: string;
  minPlayers: number;
  status: GameStatus;
}

export const GAMES: GameMeta[] = catalog as GameMeta[];

export function getGameMeta(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
