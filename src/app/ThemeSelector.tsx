"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "party-games:theme";

type Theme = "light" | "dark" | "retro";

const THEMES: { id: Theme; label: string; emoji: string }[] = [
  { id: "light", label: "Light", emoji: "☀️" },
  { id: "dark", label: "Dark", emoji: "🌙" },
  { id: "retro", label: "Crazy Retro", emoji: "🌈" },
];

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>("dark");

  // Restore any saved theme on first paint.
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? (localStorage.getItem(THEME_KEY) as Theme | null)
        : null;
    const initial: Theme =
      saved && THEMES.some((t) => t.id === saved) ? saved : "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function pick(next: Theme) {
    console.log(`[ThemeSelector] switching to theme: "${next}"`);
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  }

  return (
    <div className="mx-auto mb-10 flex max-w-md items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => pick(t.id)}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
            theme === t.id
              ? "bg-white/20 text-white"
              : "text-violet-100/60 hover:bg-white/10"
          }`}
        >
          <span className="mr-1">{t.emoji}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
