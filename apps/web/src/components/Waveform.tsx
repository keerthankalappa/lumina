import { useEffect, useRef } from "react";
import { useAudio } from "../audio/AudioProvider";

/** Static silhouette used when nothing is playing (and for reduced-motion users). */
const SHAPE = [3, 5, 7, 4, 8, 9, 6, 7, 5, 3, 6, 8, 7, 4, 6, 8, 5, 3, 6, 7, 4, 2, 5, 6, 4, 2, 5, 7, 4, 3];

/**
 * Bars driven by the ambient engine's AnalyserNode while audio plays, falling back to a gentle
 * static shape. `progress` colours bars already "played".
 */
export function Waveform({ progress = 0, bars = 30, active, className = "", tall = false }: { progress?: number; bars?: number; active: boolean; className?: string; tall?: boolean }) {
  const { getAnalyser } = useAudio();
  const refs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const analyser = getAnalyser();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || !analyser || reduce) {
      refs.current.forEach((el, i) => el && (el.style.transform = `scaleY(${SHAPE[i % SHAPE.length]! / 10})`));
      return;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const t0 = performance.now();
    const draw = () => {
      analyser.getByteFrequencyData(data);
      const t = (performance.now() - t0) / 1000;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const bin = data[Math.floor((i / bars) * data.length * 0.6)] ?? 0;
        // Blend the spectrum with a slow sine so quiet soundscapes still visibly breathe.
        const v = 0.18 + (bin / 255) * 0.6 + 0.22 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.55));
        el.style.transform = `scaleY(${Math.min(1, v)})`;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [active, bars, getAnalyser]);

  return (
    <div className={`flex items-center gap-[3px] ${tall ? "h-14" : "h-10"} ${className}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`block h-full w-1 origin-center rounded-full transition-colors duration-300 ${i / bars < progress ? "bg-primary" : "bg-outline-variant"}`}
          style={{ transform: `scaleY(${SHAPE[i % SHAPE.length]! / 10})` }}
        />
      ))}
    </div>
  );
}
