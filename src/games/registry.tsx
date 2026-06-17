"use client";

import type { ComponentType } from "react";
import type { Socket } from "socket.io-client";
import type { Member } from "@/lib/socket";
import Wheel from "./wheel/Wheel";
import Disordered from "./disordered/Disordered";
import Beopardy from "./beopardy/Beopardy";
import TwoTruths from "./twotruths/TwoTruths";
import Punchline from "./punchline/Punchline";

export interface GameProps {
  socket: Socket;
  me: Member | null;
  members: Member[];
  game: Record<string, unknown>;
}

// Client-side game UIs, keyed by the same id used in catalog.json and on the
// server. Add a new game's component here when you build it.
export const GAME_COMPONENTS: Record<string, ComponentType<GameProps>> = {
  wheel: Wheel,
  disordered: Disordered,
  beopardy: Beopardy,
  "two-truths": TwoTruths,
  punchline: Punchline,
};
