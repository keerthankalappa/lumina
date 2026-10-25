import { useEffect, useState } from "react";
import { Icon } from "./ui";

const PHASES = [
  { label: "Inhale deeply", seconds: 4 },
  { label: "Hold softly", seconds: 4 },
  { label: "Exhale slowly", seconds: 4 },
] as const;
const SESSION_SECONDS = 60;

/** 4-4-4 box-breathing pacer with a one-minute guided session. */
export function BreathingRing() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (elapsed >= SESSION_SECONDS) {
      setRunning(false);
      setElapsed(0);
    }
  }, [elapsed]);

  const cycle = elapsed % 12;
  const phaseIdx = cycle < 4 ? 0 : cycle < 8 ? 1 : 2;
  const phase = PHASES[phaseIdx]!;
  const secondsLeft = 4 - (cycle % 4);
  const scale = !running ? 0.9 : phaseIdx === 0 ? 0.78 + (cycle / 4) * 0.22 : phaseIdx === 1 ? 1 : 1 - ((cycle - 8) / 4) * 0.22;
  const progress = running ? elapsed / SESSION_SECONDS : 0;

  return (
    <div className="flex items-center gap-5 rounded-lg bg-secondary-container/25 p-5">
      <div className="relative h-20 w-20 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#d1fae5" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#006c4a"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 36}
            strokeDashoffset={2 * Math.PI * 36 * (1 - (running ? progress : 0.72))}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div
          className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-secondary-fixed text-on-secondary-container transition-transform duration-1000 ease-in-out"
          style={{ transform: `scale(${scale})`, boxShadow: running && phaseIdx === 1 ? "0 0 24px 6px rgba(16,185,129,0.25)" : undefined }}
        >
          <Icon name="air" size={16} />
          <span className="text-label-sm">{running ? `${secondsLeft}s` : "4s"}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="eyebrow text-secondary">4-4-4 Cadence</p>
        <p className="mt-1 text-label-lg text-on-surface" aria-live="polite">
          {running ? `${phase.label} (${secondsLeft}s)` : "Inhale deeply (4s)"}
        </p>
        <button type="button" onClick={() => { setElapsed(0); setRunning((r) => !r); }} className="btn-sage mt-2 px-4 py-1.5 text-label-md">
          {running ? "End Session" : "Begin 1-Min Breath"}
        </button>
      </div>
    </div>
  );
}
