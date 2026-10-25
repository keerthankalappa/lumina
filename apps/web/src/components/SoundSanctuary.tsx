import { useNavigate } from "react-router";
import { useBookmark } from "../api/hooks";
import { SOUNDSCAPES } from "../audio/ambient";
import { formatTime, useAudio, type SleepSetting } from "../audio/AudioProvider";
import { speechSupported } from "../audio/narrator";
import { useAuth } from "../auth/AuthProvider";
import { Avatar, Icon, Modal, useToast } from "./ui";
import { Waveform } from "./Waveform";

const RATES = [0.8, 0.9, 1, 1.1];
const SLEEP: Array<{ value: SleepSetting; label: string }> = [
  { value: 5, label: "5m" },
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: "end", label: "End" },
];

function Slider({ label, icon, value, onChange }: { label: string; icon: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block rounded-md bg-white/80 p-3 shadow-sm">
      <span className="flex items-center justify-between text-label-md">
        <span className="flex items-center gap-1.5">
          <Icon name={icon} size={16} className="text-primary" /> {label}
        </span>
        <span className="text-on-surface-variant tabular-nums">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[#855300]"
      />
    </label>
  );
}

/** Full player — "Lumina Sound Sanctuary" from the design. */
export function SoundSanctuary() {
  const a = useAudio();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const bookmark = useBookmark();
  const t = a.track;
  if (!t) return null;
  const playing = a.status === "playing";
  const progress = a.total ? a.elapsed / a.total : 0;
  const currentId = t.lineIds?.[a.index];

  const saveCard = () => {
    if (!user) return navigate("/login?next=/gallery");
    if (!currentId) return;
    bookmark.mutate(
      { targetType: "affirmation", targetId: currentId, on: true },
      { onSuccess: () => toast("Mantra card saved to your sanctuary", "success") },
    );
  };

  return (
    <Modal open={a.playerOpen} onClose={() => a.setPlayerOpen(false)} label="Sound sanctuary player" className="w-full max-w-[880px]">
      <div className="overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary-container" />
            <span className="eyebrow text-primary">Lumina Sound Sanctuary</span>
            <span className="rounded-full bg-secondary-container/70 px-2.5 py-0.5 text-label-sm font-bold text-on-secondary-container">
              {t.lines.length} Cards
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-label-md" role="group" aria-label="Sleep timer">
              <Icon name="timer" size={16} className="text-on-surface-variant" />
              <span className="hidden text-on-surface-variant sm:inline">Sleep:</span>
              {SLEEP.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={a.sleep === s.value}
                  onClick={() => a.setSleep(a.sleep === s.value ? null : s.value)}
                  className={`rounded-full px-2 py-0.5 ${a.sleep === s.value ? "bg-primary text-white" : "hover:bg-surface-container"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => a.setPlayerOpen(false)} aria-label="Close player" className="icon-btn h-9 w-9">
              <Icon name="close" />
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Left: series art */}
          <div className="flex flex-col gap-5 bg-linear-to-br from-primary-fixed/50 via-surface-container-low to-secondary-container/40 p-6">
            <div className="flex items-center justify-between text-label-sm">
              <span className="eyebrow text-on-surface-variant">{t.subtitle}</span>
              <span className="flex items-center gap-1 text-secondary">
                <Icon name="verified" size={14} /> {speechSupported() ? "Voice Narration" : "Silent Mode"}
              </span>
            </div>
            <div className="glass mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-md">
              <div className={`relative flex h-[78%] w-[78%] items-center justify-center rounded-full border-2 border-dashed border-primary/30 ${playing ? "animate-spin-slow" : ""}`}>
                <div className="flex h-[70%] w-[70%] flex-col items-center justify-center rounded-full bg-radial from-primary-container to-primary text-white shadow-amber">
                  <Icon name="light_mode" size={28} />
                  <span className="mt-1 text-label-sm tracking-widest">432 HERTZ</span>
                </div>
              </div>
            </div>
            <div>
              <h2 className="font-serif text-headline-md">{t.title}</h2>
              {t.description && <p className="mt-2 text-body-sm text-on-surface-variant">{t.description}</p>}
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-slate-900/5 pt-4">
              <div className="flex items-center gap-2">
                <Avatar name={t.guide} size={36} />
                <div>
                  <p className="text-label-lg">{t.guide}</p>
                  <p className="text-body-sm text-on-surface-variant">Mindfulness Guide</p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-secondary-container/60 px-2.5 py-1 text-label-sm text-on-secondary-container">
                <Icon name="spa" size={14} /> Alpha Waves
              </span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between">
              <span className="eyebrow flex items-center gap-1.5 text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-secondary" /> Active acoustic waveform
              </span>
              <span className="text-label-md tabular-nums">
                <b>{formatTime(a.elapsed)}</b> / {formatTime(a.total)}
              </span>
            </div>
            <div className="rounded-full bg-surface-container-low px-4">
              <Waveform active={playing && a.ambientOn} progress={progress} bars={34} />
            </div>
            <div className="relative h-1.5 rounded-full bg-surface-container-high">
              <div className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-primary to-primary-container" style={{ width: `${progress * 100}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="rounded-full bg-surface-container-low px-3 py-1 text-label-md tabular-nums"
                aria-label="Narration speed"
                onClick={() => a.setRate(RATES[(RATES.indexOf(a.rate) + 1) % RATES.length]!)}
              >
                {a.rate.toFixed(1)}×
              </button>
              <div className="flex items-center gap-4">
                <button type="button" aria-label="Previous card" onClick={() => a.skip(-1)} disabled={a.index === 0} className="rounded-full p-2 hover:bg-surface-container-low disabled:opacity-40">
                  <Icon name="skip_previous" size={28} />
                </button>
                <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={a.toggle} className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-white shadow-amber transition-transform hover:scale-105 active:scale-95">
                  <Icon name={playing ? "pause" : "play_arrow"} fill size={34} />
                </button>
                <button type="button" aria-label="Next card" onClick={() => a.skip(1)} disabled={a.index >= t.lines.length - 1} className="rounded-full p-2 hover:bg-surface-container-low disabled:opacity-40">
                  <Icon name="skip_next" size={28} />
                </button>
              </div>
              <button type="button" aria-label={a.ambientOn ? "Mute ambient" : "Unmute ambient"} onClick={a.toggleAmbient} className="rounded-full p-2 hover:bg-surface-container-low">
                <Icon name={a.ambientOn ? "volume_up" : "volume_off"} />
              </button>
            </div>

            <section className="rounded-md bg-surface-container-low/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-label-lg">
                  <Icon name="tune" size={18} className="text-primary" /> Soundscape Immersion Mixer
                </h3>
                <span className="text-body-sm text-on-surface-variant">Binaural 432Hz mode</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Slider label="Voice Narration" icon="record_voice_over" value={a.voiceVolume} onChange={a.setVoiceVolume} />
                <Slider label="Ambient Soundscape" icon="self_improvement" value={a.ambientVolume} onChange={a.setAmbientVolume} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Atmosphere">
                <span className="eyebrow mr-1 text-on-surface-variant">Atmosphere:</span>
                {SOUNDSCAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={a.soundscape === s.id}
                    title={s.blurb}
                    onClick={() => a.setSoundscape(s.id)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-label-md transition-all ${
                      a.soundscape === s.id ? "bg-secondary text-white" : "bg-white hover:bg-surface-container"
                    }`}
                  >
                    <Icon name={s.icon} size={14} /> {s.name}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="eyebrow mb-2 text-on-surface-variant">Meditation progression</h3>
              <ol className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                {t.lines.map((line, i) => {
                  const done = i < a.index;
                  const now = i === a.index && a.status !== "idle";
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => a.seekLine(i)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-label-md transition-all ${
                          now ? "border border-primary-container bg-primary-fixed/50" : "bg-surface-container-low hover:bg-surface-container"
                        }`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-sm ${done ? "bg-secondary text-white" : now ? "bg-primary-container text-white" : "bg-white"}`}>
                          {done ? <Icon name="check" size={14} /> : now ? <Icon name="play_arrow" size={14} fill /> : i + 1}
                        </span>
                        <span className="line-clamp-1 flex-1">{line}</span>
                        {now && <span className="hidden rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white sm:inline">NOW PLAYING</span>}
                        <span className="shrink-0 font-mono text-[11px] text-on-surface-variant">{formatTime(a.offsets[i] ?? 0)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-900/5 pt-4">
              {currentId && (
                <button type="button" onClick={saveCard} className="btn-secondary px-3.5 py-1.5 text-label-md">
                  <Icon name="favorite" size={16} /> Save Mantra Card
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  a.setPlayerOpen(false);
                  navigate(`/studio?text=${encodeURIComponent(t.lines[a.index] ?? "")}`);
                }}
                className="btn-secondary px-3.5 py-1.5 text-label-md"
              >
                <Icon name="edit_note" size={16} /> Add Reflection to Studio
              </button>
              <span className="ml-auto flex items-center gap-1 text-body-sm text-on-surface-variant">
                <Icon name="headphones" size={16} /> Headphones recommended
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
