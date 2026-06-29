"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES } from "@/games/catalog";
import { makeRoomCode } from "@/lib/code";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [bannerVisible, setBannerVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("forkBannerDismissed") !== "true";
  });

  function dismissBanner(e: React.MouseEvent) {
    e.preventDefault();
    sessionStorage.setItem("forkBannerDismissed", "true");
    setBannerVisible(false);
  }

  function startGame(gameId: string) {
    const code = makeRoomCode();
    router.push(`/room/${code}?game=${gameId}`);
  }

  function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 3) router.push(`/room/${code}`);
  }

  return (
    <>
      {bannerVisible && (
        <div className="relative flex w-full items-center justify-center border-b border-violet-500/70 bg-gradient-to-r from-indigo-950 via-violet-900 to-purple-950 shadow-[0_1px_0_0_rgba(167,139,250,0.6),0_2px_16px_2px_rgba(139,92,246,0.55),0_4px_32px_4px_rgba(139,92,246,0.25)]">
          <a
            href="https://github.com/ld-bubble/party-games-clone"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:text-white hover:drop-shadow-[0_0_8px_rgba(216,180,254,0.8)]"
          >
            {/* GitHub mark SVG icon */}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Fork our repo!
          </a>
          <button
            onClick={dismissBanner}
            aria-label="Dismiss banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-violet-400 transition hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>
      )}
      <main className="mx-auto max-w-5xl px-6 pt-8 pb-14">
        <header className="mb-12 text-center">
          <div className="mb-3 inline-flex animate-float items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-violet-200">
            🎲 play together, instantly
          </div>
          <h1 className="bg-gradient-to-br from-white to-violet-300 bg-clip-text pb-1 text-5xl font-black leading-tight tracking-tight text-transparent sm:text-6xl">
            Party Games
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-violet-100/70">
            Quick, real-time multiplayer mini-games. Start a room, share the link,
            play in seconds.
          </p>
        </header>

        <form onSubmit={joinRoom} className="mx-auto mb-12 flex max-w-md gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Got a room code?"
            maxLength={6}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg tracking-widest outline-none transition focus:border-violet-400/50 focus:bg-white/10"
          />
          <button
            type="submit"
            className="rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/20"
          >
            Join
          </button>
        </form>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => {
            const live = game.status === "live";
            return (
              <button
                key={game.id}
                disabled={!live}
                onClick={() => live && startGame(game.id)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition enabled:hover:-translate-y-1 enabled:hover:border-white/20 enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div
                  className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-enabled:group-hover:opacity-60"
                  style={{ background: game.accent }}
                />
                <div className="mb-4 text-4xl">{game.emoji}</div>
                <h2 className="mb-1 text-xl font-bold">{game.name}</h2>
                <p className="mb-4 text-sm text-violet-100/60">{game.blurb}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-violet-100/40">
                    {game.minPlayers}+ players
                  </span>
                  {live ? (
                    <span className="font-semibold text-violet-300 transition group-hover:translate-x-0.5">
                      Start →
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-violet-100/50">
                      Coming soon
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <footer className="mt-16 text-center text-sm text-violet-100/30">
          An open-source real-time multiplayer games starter
        </footer>
      </main>
    </>
  );
}
