"use client";

// Tiny synthesized sound effects via Web Audio — no asset files needed.
// The AudioContext is created lazily on first play (which always follows a
// user gesture like a tap/drag, so autoplay policies are satisfied).

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function note(
  c: AudioContext,
  freq: number,
  start: number,
  duration: number,
  volume = 0.18,
  type: OscillatorType = "triangle",
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// Quick playful "pop" with an upward pitch slide — played on every tile swap.
export function playSwap() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(290, t);
  osc.frequency.exponentialRampToValueAtTime(540, t + 0.07);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

// Urgent game-show buzzer blip — played when you buzz in.
export function playBuzz() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

// Two quick rising notes — correct answer.
export function playCorrect() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  note(c, 659.25, t, 0.12, 0.2, "triangle"); // E5
  note(c, 880, t + 0.1, 0.25, 0.2, "triangle"); // A5
}

// Low descending womp — wrong answer.
export function playWrong() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.3);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.4);
}

// Triumphant little fanfare — rising arpeggio into a held chord.
export function playFanfare() {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const C5 = 523.25,
    E5 = 659.25,
    G5 = 783.99,
    C6 = 1046.5;

  // Rising arpeggio
  [C5, E5, G5, C6].forEach((f, i) => {
    note(c, f, t0 + i * 0.11, 0.18, 0.2, "square");
  });

  // Final held chord with a sparkle on top
  [C5, E5, G5, C6].forEach((f) => note(c, f, t0 + 0.46, 0.7, 0.1, "triangle"));
  note(c, C6 * 2, t0 + 0.55, 0.5, 0.05, "sine");
}
