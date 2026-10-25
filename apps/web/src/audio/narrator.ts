/** Thin wrapper over the Web Speech API that reads affirmations in a calm, unhurried voice. */

const PREFERRED_VOICES = [
  /Google UK English Female/i,
  /Samantha/i,
  /Serena/i,
  /Karen/i,
  /Moira/i,
  /Microsoft (Aria|Jenny|Sonia|Libby)/i,
  /Female/i,
];

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // not loaded yet; try again next time
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  cachedVoice =
    PREFERRED_VOICES.map((re) => english.find((v) => re.test(v.name))).find(Boolean) ?? english[0] ?? voices[0] ?? null;
  return cachedVoice;
}

if (speechSupported()) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = undefined;
  });
}

/** Rough spoken duration, used for progress and timestamps when boundary events are unavailable. */
export function estimateSeconds(text: string, rate: number) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, words / (2.4 * rate));
}

export function speak(
  text: string,
  opts: { rate: number; volume: number; onEnd: () => void; onError?: () => void },
): () => void {
  if (!speechSupported()) {
    // Fallback: no speech engine — still advance on an estimated timer so the session flows.
    const t = window.setTimeout(opts.onEnd, estimateSeconds(text, opts.rate) * 1000);
    return () => clearTimeout(t);
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-US";
  u.rate = opts.rate * 0.92; // affirmations land better slightly slower than conversational speech
  u.pitch = 0.95;
  u.volume = opts.volume;
  let cancelled = false;
  u.onend = () => !cancelled && opts.onEnd();
  u.onerror = (e) => {
    if (cancelled || e.error === "interrupted" || e.error === "canceled") return;
    (opts.onError ?? opts.onEnd)();
  };
  synth.speak(u);
  return () => {
    cancelled = true;
    synth.cancel();
  };
}
