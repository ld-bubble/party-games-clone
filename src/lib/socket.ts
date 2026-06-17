"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// Single shared connection. In the browser we connect to the same origin that
// serves the app, which is exactly what our custom server exposes.
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export interface Member {
  id: string;
  name: string;
}

export interface RoomState {
  code: string;
  gameId: string;
  members: Member[];
  game: Record<string, unknown>;
}
