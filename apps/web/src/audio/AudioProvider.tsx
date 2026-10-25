import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ambient, type SoundscapeId } from "./ambient";
import { estimateSeconds, speak } from "./narrator";

export type Track = {
  id: string;
  title: string;
  subtitle: string;
  guide: string;
  description?: string;
  palette?: string;
  lines: string[];
  /** Optional affirmation ids aligned with `lines`, for bookmarking the current card. */
  lineIds?: string[];
  deckSlug?: string;
};

type Status = "idle" | "playing" | "paused";
export type SleepSetting = 5 | 15 | 30 | "end" | null;

const GAP_SECONDS = 3; // a breath between affirmations

type AudioState = {
  track: Track | null;
  status: Status;
  index: number;
  elapsed: number;
  total: number;
  offsets: number[];
  rate: number;
  voiceVolume: number;
  ambientVolume: number;
  soundscape: SoundscapeId;
  ambientOn: boolean;
  sleep: SleepSetting;
  playerOpen: boolean;
  play: (track: Track, startAt?: number) => void;
  toggle: () => void;
  seekLine: (i: number) => void;
  skip: (delta: number) => void;
  stop: () => void;
  setRate: (r: number) => void;
  setVoiceVolume: (v: number) => void;
  setAmbientVolume: (v: number) => void;
  setSoundscape: (s: SoundscapeId) => void;
  toggleAmbient: () => void;
  setSleep: (s: SleepSetting) => void;
  setPlayerOpen: (open: boolean) => void;
  getAnalyser: () => AnalyserNode | null;
};

const Ctx = createContext<AudioState | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => performance.now());
  const [rate, setRateState] = useState(0.9);
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [ambientVolume, setAmbientVolumeState] = useState(0.65);
  const [soundscape, setSoundscapeState] = useState<SoundscapeId>("morning-mist");
  const [ambientOn, setAmbientOn] = useState(false);
  const [sleep, setSleepState] = useState<SleepSetting>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  const cancelSpeech = useRef<(() => void) | null>(null);
  const gapTimer = useRef<number | undefined>(undefined);
  const sleepTimer = useRef<number | undefined>(undefined);
  const lineStartedAt = useRef(0);
  const pausedAt = useRef(0);
  const ambientAutoStarted = useRef(false);
  // Latest values for callbacks that outlive a render (speech `onend`, timers).
  const live = useRef({ track, rate, voiceVolume, sleep, soundscape });
  live.current = { track, rate, voiceVolume, sleep, soundscape };

  const durations = useMemo(() => track?.lines.map((l) => estimateSeconds(l, rate) + GAP_SECONDS) ?? [], [track, rate]);
  const offsets = useMemo(() => durations.reduce<number[]>((acc, _d, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + durations[i - 1]!], []), [durations]);
  const total = durations.reduce((a, b) => a + b, 0);

  const halt = useCallback(() => {
    cancelSpeech.current?.();
    cancelSpeech.current = null;
    window.clearTimeout(gapTimer.current);
  }, []);

  const startAmbient = useCallback(async (id: SoundscapeId) => {
    try {
      await ambient.start(id);
      setAmbientOn(true);
    } catch {
      setAmbientOn(false);
    }
  }, []);

  const stopAmbient = useCallback(() => {
    ambient.stop();
    setAmbientOn(false);
    ambientAutoStarted.current = false;
  }, []);

  const finish = useCallback(() => {
    halt();
    setStatus("idle");
    setIndex(0);
    if (ambientAutoStarted.current || live.current.sleep === "end") stopAmbient();
    if (live.current.sleep === "end") setSleepState(null);
  }, [halt, stopAmbient]);

  const playLine = useCallback(
    (t: Track, i: number) => {
      halt();
      setIndex(i);
      setStatus("playing");
      lineStartedAt.current = performance.now();
      cancelSpeech.current = speak(t.lines[i]!, {
        rate: live.current.rate,
        volume: live.current.voiceVolume,
        onEnd: () => {
          gapTimer.current = window.setTimeout(() => {
            if (i + 1 < t.lines.length) playLine(t, i + 1);
            else finish();
          }, GAP_SECONDS * 1000);
        },
      });
    },
    [halt, finish],
  );

  const play = useCallback(
    (t: Track, startAt = 0) => {
      setTrack(t);
      if (!ambient.playing) {
        ambientAutoStarted.current = true;
        void startAmbient(live.current.soundscape);
      }
      playLine(t, Math.min(startAt, t.lines.length - 1));
    },
    [playLine, startAmbient],
  );

  const toggle = useCallback(() => {
    const t = live.current.track;
    if (!t) return;
    if (status === "playing") {
      halt();
      pausedAt.current = performance.now();
      setStatus("paused");
    } else {
      if (!ambient.playing) void startAmbient(live.current.soundscape);
      playLine(t, index); // speech engines can't reliably resume mid-sentence; restart the card
    }
  }, [status, index, halt, playLine, startAmbient]);

  const seekLine = useCallback(
    (i: number) => {
      const t = live.current.track;
      if (t && i >= 0 && i < t.lines.length) playLine(t, i);
    },
    [playLine],
  );

  const skip = useCallback((delta: number) => seekLine(index + delta), [seekLine, index]);

  const stop = useCallback(() => {
    finish();
    setTrack(null);
    setPlayerOpen(false);
  }, [finish]);

  const setSoundscape = useCallback(
    (s: SoundscapeId) => {
      setSoundscapeState(s);
      if (ambient.playing) void startAmbient(s);
    },
    [startAmbient],
  );

  const toggleAmbient = useCallback(() => {
    if (ambient.playing) stopAmbient();
    else {
      ambientAutoStarted.current = false;
      void startAmbient(live.current.soundscape);
    }
  }, [startAmbient, stopAmbient]);

  const setAmbientVolume = useCallback((v: number) => {
    setAmbientVolumeState(v);
    ambient.setVolume(v);
  }, []);

  const setSleep = useCallback(
    (s: SleepSetting) => {
      window.clearTimeout(sleepTimer.current);
      setSleepState(s);
      if (typeof s === "number") {
        sleepTimer.current = window.setTimeout(() => {
          halt();
          setStatus((st) => (st === "playing" ? "paused" : st));
          stopAmbient();
          setSleepState(null);
        }, s * 60_000);
      }
    },
    [halt, stopAmbient],
  );

  // Progress clock — only runs while something is playing.
  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => () => halt(), [halt]);

  const lineElapsed =
    status === "playing"
      ? (now - lineStartedAt.current) / 1000
      : status === "paused"
        ? (pausedAt.current - lineStartedAt.current) / 1000
        : 0;
  const elapsed = track ? Math.min(total, (offsets[index] ?? 0) + Math.min(lineElapsed, durations[index] ?? 0)) : 0;

  const value: AudioState = {
    track,
    status,
    index,
    elapsed,
    total,
    offsets,
    rate,
    voiceVolume,
    ambientVolume,
    soundscape,
    ambientOn,
    sleep,
    playerOpen,
    play,
    toggle,
    seekLine,
    skip,
    stop,
    setRate: setRateState,
    setVoiceVolume,
    setAmbientVolume,
    setSoundscape,
    toggleAmbient,
    setSleep,
    setPlayerOpen,
    getAnalyser: () => ambient.getAnalyser(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudio must be used inside <AudioProvider>");
  return ctx;
}

export const formatTime = (s: number) => {
  const sec = Math.max(0, Math.round(s));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
};
