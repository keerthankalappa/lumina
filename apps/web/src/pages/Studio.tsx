import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiProblem, type Schemas } from "../api/client";
import { useDecks, useDeleteJournal, useDeleteMantra, useInsights, useJournal, useMantras, useSaveMantra } from "../api/hooks";
import { speak } from "../audio/narrator";
import { useAuth } from "../auth/AuthProvider";
import { Icon, useToast } from "../components/ui";
import { shareText } from "../lib/format";
import { MOODS, STUDIO_AURAS, STUDIO_PALETTES, STUDIO_TYPE, type StudioAura, type StudioPalette, type StudioTypography } from "../lib/palettes";
import { downloadBlob, renderCard, slugify } from "../lib/renderCard";

const INTENTS = ["Unapologetic Purpose", "Grounded Calm", "Courageous Compassion", "Creative Flow", "Restful Boundaries", "Abundant Gratitude"];
const MAX_TEXT = 280;

type Draft = {
  id?: string;
  text: string;
  attribution: string;
  intent: string;
  palette: StudioPalette;
  typography: StudioTypography;
  aura: StudioAura;
  microAction: string;
};

function auraStyle(aura: StudioAura, palette: StudioPalette): React.CSSProperties {
  const p = STUDIO_PALETTES[palette];
  switch (aura) {
    case "luminous-glow":
      return { backgroundImage: `radial-gradient(circle at 70% 20%, rgba(255,255,255,.65), transparent 45%), radial-gradient(circle at 20% 80%, rgba(255,255,255,.4), transparent 40%), linear-gradient(160deg, ${p.from}, ${p.to})` };
    case "petal-waves":
      return { backgroundImage: `repeating-radial-gradient(ellipse at 50% 120%, transparent 0 18px, ${p.accent}14 18px 20px), linear-gradient(160deg, ${p.from}, ${p.to})` };
    case "starlight":
      return { backgroundImage: `radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 15%, #fff, transparent), radial-gradient(2px 2px at 80% 70%, #fff, transparent), radial-gradient(1px 1px at 35% 85%, #fff, transparent), radial-gradient(1.5px 1.5px at 55% 50%, #ffffffaa, transparent), linear-gradient(160deg, ${p.from}, ${p.to})` };
    case "raw-parchment":
      return { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .08 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E"), linear-gradient(160deg, ${p.from}, ${p.to})` };
  }
}

function MantraPreview({ draft, compact = false }: { draft: Draft; compact?: boolean }) {
  const p = STUDIO_PALETTES[draft.palette];
  const t = STUDIO_TYPE[draft.typography];
  return (
    <div className={`aspect-[4/5] w-full overflow-hidden shadow-sheet transition-all duration-500 ${compact ? "rounded-lg p-4" : "rounded-xl p-8"}`} style={{ ...auraStyle(draft.aura, draft.palette), color: p.ink }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="eyebrow flex items-center gap-1.5 opacity-80">
            <Icon name="spa" size={14} /> Lumina Mindfulness
          </span>
          <span className="rounded-full bg-white/40 px-2.5 py-0.5 text-label-sm">{draft.intent}</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="font-serif text-6xl leading-none opacity-25" style={{ color: p.accent }} aria-hidden="true">“</span>
          <p
            className={`mt-2 text-balance leading-snug ${compact ? "line-clamp-6 text-[14px]" : "text-[clamp(18px,2.4vw,26px)]"}`}
            style={{ fontFamily: `"${t.family}"`, fontStyle: t.italic ? "italic" : "normal", fontWeight: t.weight }}
          >
            {draft.text || "Your mantra will appear here as you write…"}
          </p>
          {draft.attribution && (
            <p className="mt-5 font-serif text-body-sm italic" style={{ color: p.accent }}>
              — {draft.attribution} —
            </p>
          )}
        </div>
        <div className="flex items-center justify-between text-label-sm opacity-70">
          <span className="flex items-center gap-1"><Icon name="check_circle" size={14} /> Daily Sanctuary Grounding</span>
          <span>{new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, tag, children }: { n: number; title: string; tag: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass flex flex-col gap-5 rounded-lg p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-serif text-headline-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-fixed font-sans text-label-md text-primary">{n}</span>
          {title}
        </h2>
        <span className="eyebrow text-on-surface-variant">{tag}</span>
      </div>
      {children}
    </section>
  );
}

function Builder() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const decks = useDecks("", "");
  const save = useSaveMantra();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(() => ({
    text: params.get("text")?.slice(0, MAX_TEXT) ?? "I honor the rhythm of my own unfolding; I do not need to rush what is meant to grow with deep roots.",
    attribution: user ? `${user.displayName.split(" ")[0]}’s Morning Intention` : "",
    intent: INTENTS[0]!,
    palette: "dawn-amber",
    typography: "playfair",
    aura: "luminous-glow",
    microAction: "Take a 20-minute silent walk without phone and write one kind note.",
  }));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    if (params.get("text")) setParams({}, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    const onLoad = (e: Event) => {
      // Copy only editable fields: the API's strict schema rejects extras like `createdAt`.
      const { id, text, attribution, intent, palette, typography, aura, microAction } = (e as CustomEvent<Draft>).detail;
      setDraft({ id, text, attribution, intent, palette, typography, aura, microAction });
    };
    window.addEventListener("lumina:edit-mantra", onLoad);
    return () => window.removeEventListener("lumina:edit-mantra", onLoad);
  }, []);

  const inspire = () => {
    const pool = decks.data?.items.map((d) => d.epigraph) ?? [];
    if (pool.length) set("text", pool[Math.floor(Math.random() * pool.length)]!);
  };

  const onSave = () => {
    const { id, ...body } = draft;
    save.mutate(
      { id, ...body, text: body.text.trim() },
      {
        onSuccess: (m) => {
          set("id", m.id);
          toast(id ? "Mantra updated" : "Mantra saved to your sanctuary", "success");
        },
        onError: (e) => toast(e instanceof ApiProblem ? (e.fieldErrors[0]?.message ?? e.message) : "Couldn’t save", "error"),
      },
    );
  };

  const onExport = async () => {
    setBusy(true);
    try {
      downloadBlob(await renderCard(draft), `lumina-${slugify(draft.text)}.png`);
      toast("Print-ready PNG exported (1600×2000)", "success");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="flex flex-col gap-6">
        <Step n={1} title="Craft Your Mantra" tag="Editorial seed">
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md">Focal intent theme</span>
            <select className="field cursor-pointer py-3" value={draft.intent} onChange={(e) => set("intent", e.target.value)}>
              {INTENTS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-label-md">
              The inscription <span className={draft.text.length > MAX_TEXT - 20 ? "text-error" : "text-primary-fixed-dim"}>{draft.text.length} / {MAX_TEXT}</span>
            </span>
            <textarea className="field min-h-28 resize-none font-serif text-body-lg" maxLength={MAX_TEXT} value={draft.text} onChange={(e) => set("text", e.target.value)} />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-label-md">Attribution / sub-intention</span>
              <input className="field py-2.5" maxLength={80} value={draft.attribution} onChange={(e) => set("attribution", e.target.value)} placeholder="— Sarah’s Morning Intention" />
            </label>
            <button type="button" className="btn-secondary" onClick={inspire}>
              <Icon name="auto_fix_high" size={18} /> Draw Inspiration
            </button>
          </div>
        </Step>

        <Step n={2} title="Visual Art & Atmospheric Aura" tag="Generative canvas">
          <div>
            <p className="mb-2 text-label-md">Atmosphere & colour field</p>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Palette">
              {(Object.keys(STUDIO_PALETTES) as StudioPalette[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={draft.palette === k}
                  onClick={() => set("palette", k)}
                  className={`flex flex-col items-center gap-1.5 rounded-sm p-2 text-[11px] transition-all ${draft.palette === k ? "bg-primary-fixed/60 ring-2 ring-primary-container" : "bg-surface-container-low hover:bg-surface-container"}`}
                >
                  <span className="h-9 w-9 rounded-full shadow-inner" style={{ background: STUDIO_PALETTES[k].swatch }} />
                  <span className="truncate">{STUDIO_PALETTES[k].name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-label-md">Editorial typography</legend>
              <div className="flex flex-col gap-2">
                {(Object.keys(STUDIO_TYPE) as StudioTypography[]).map((k) => (
                  <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 ${draft.typography === k ? "bg-primary-fixed/50" : "bg-surface-container-low"}`}>
                    <input type="radio" name="typography" className="accent-[#855300]" checked={draft.typography === k} onChange={() => set("typography", k)} />
                    <span style={{ fontFamily: `"${STUDIO_TYPE[k].family}"`, fontStyle: STUDIO_TYPE[k].italic ? "italic" : "normal" }}>{STUDIO_TYPE[k].name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-label-md">Ambient aura pattern</legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STUDIO_AURAS) as StudioAura[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={draft.aura === k}
                    onClick={() => set("aura", k)}
                    className={`flex items-center gap-1.5 rounded-sm px-2.5 py-2 text-label-md ${draft.aura === k ? "bg-primary-fixed/60 text-primary ring-1 ring-primary-container" : "bg-surface-container-low hover:bg-surface-container"}`}
                  >
                    <Icon name={STUDIO_AURAS[k].icon} size={16} /> {STUDIO_AURAS[k].name}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-body-sm">Aspect: 4:5 Art Print <b className="text-secondary">· 300 DPI-ready</b></p>
            </fieldset>
          </div>
        </Step>

        <Step n={3} title="Paired Kinetic Ripple" tag={<span className="rounded-full bg-secondary-container px-2.5 py-1 normal-case text-on-secondary-container">Mindset → Reality</span>}>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md">What micro-action will ground this mantra today?</span>
            <span className="relative">
              <Icon name="directions_walk" className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
              <input className="field py-3 pl-11" maxLength={200} value={draft.microAction} onChange={(e) => set("microAction", e.target.value)} />
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary flex-1 py-3.5" onClick={onSave} disabled={!user || save.isPending || draft.text.trim().length < 3}>
              <Icon name="bookmark_added" /> {draft.id ? "Update Mantra" : "Save Mantra to My Sanctuary"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => void onExport()} disabled={busy}>
              <Icon name="download" size={18} /> Export Print
            </button>
            <button type="button" className="btn-secondary" onClick={() => speak(draft.text, { rate: (user?.narrationRate ?? 90) / 100, volume: 1, onEnd: () => undefined })}>
              <Icon name="record_voice_over" size={18} /> Hear It
            </button>
          </div>
        </Step>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start" aria-label="Live preview">
        <div className="flex items-center justify-between">
          <span className="eyebrow flex items-center gap-1.5 text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-secondary" /> Live sanctuary canvas
          </span>
          <button
            type="button"
            className="rounded-full p-1.5 hover:bg-surface-container-low"
            aria-label="Shuffle style"
            onClick={() => {
              const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;
              setDraft((d) => ({
                ...d,
                palette: pick(Object.keys(STUDIO_PALETTES) as StudioPalette[]),
                aura: pick(Object.keys(STUDIO_AURAS) as StudioAura[]),
                typography: pick(Object.keys(STUDIO_TYPE) as StudioTypography[]),
              }));
            }}
          >
            <Icon name="shuffle" />
          </button>
        </div>
        <MantraPreview draft={draft} />
        <div className="flex items-center justify-between rounded-full bg-surface-container-low py-2 pl-4 pr-2 text-body-sm">
          <span className="flex items-center gap-1.5"><Icon name="sync" size={16} className="text-primary" /> Auto-synced with your sanctuary</span>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-label-md"
            onClick={async () => {
              const msg = await shareText("My Lumina mantra", `“${draft.text}”${draft.attribution ? ` — ${draft.attribution}` : ""}`);
              if (msg) toast(msg);
            }}
          >
            <Icon name="share" size={16} /> Share Ripple
          </button>
        </div>
      </aside>
    </div>
  );
}

function SavedMantras() {
  const mantras = useMantras();
  const del = useDeleteMantra();
  const toast = useToast();
  if (!mantras.data?.length) return null;
  const edit = (m: Schemas["Mantra"]) => {
    window.dispatchEvent(new CustomEvent("lumina:edit-mantra", { detail: m }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <section aria-labelledby="saved-mantras">
      <h2 id="saved-mantras" className="mb-4 font-serif text-headline-md">Your Mantra Collection</h2>
      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {mantras.data.map((m) => (
          <article key={m.id} className="w-60 shrink-0 snap-start">
            <div className="scale-100 transition-transform hover:scale-[1.02]">
              <MantraPreview draft={m} compact />
            </div>
            <div className="mt-2 flex justify-between text-label-md">
              <button type="button" className="text-primary hover:underline" onClick={() => edit(m)}>Edit</button>
              <button type="button" className="text-on-surface-variant hover:text-primary" onClick={() => void renderCard(m).then((b) => downloadBlob(b, `lumina-${slugify(m.text)}.png`))}>
                Download
              </button>
              <button type="button" className="text-error/80 hover:text-error" onClick={() => confirm("Delete this mantra?") && del.mutate(m.id, { onSuccess: () => toast("Mantra deleted") })}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metrics() {
  const insights = useInsights();
  const journal = useJournal();
  const del = useDeleteJournal();
  const moodColor = Object.fromEntries(MOODS.map((m) => [m.id, m.color]));
  const moodLabel = Object.fromEntries(MOODS.map((m) => [m.id, m.label]));
  const data = insights.data;
  const top = data?.distribution.slice().sort((a, b) => b.percent - a.percent)[0];

  return (
    <section id="analytics" className="flex flex-col gap-6" aria-labelledby="metrics-title">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <p className="eyebrow text-secondary">Inner climate metrics</p>
          <h2 id="metrics-title" className="font-serif text-headline-md">30-Day Emotional Resonance & Journaling</h2>
        </div>
        <p className="text-body-sm text-on-surface-variant">Patterns from {data?.totalEntries ?? 0} personal check-ins this cycle.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="glass rounded-lg p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-serif text-headline-sm"><Icon name="calendar_month" className="text-primary" /> Sanctuary Rhythm</h3>
            <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-label-sm text-on-primary-fixed">{data?.regularity ?? 0}% Regularity</span>
          </div>
          <div className="grid grid-cols-10 gap-2" role="list" aria-label="Mood per day, last 30 days">
            {(data?.days ?? Array.from({ length: 30 }, () => ({ date: "", mood: null }))).map((d, i, all) => (
              <span
                role="listitem"
                key={i}
                title={d.date ? `${d.date}: ${d.mood ? moodLabel[d.mood] : "no check-in"}` : ""}
                className={`aspect-square rounded-full ${i === all.length - 1 ? "ring-2 ring-primary ring-offset-2" : ""}`}
                style={{ background: d.mood ? moodColor[d.mood] : "#e7eeff" }}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-label-sm text-on-surface-variant">
            {MOODS.map((m) => (
              <span key={m.id} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: m.color }} /> {m.label}</span>
            ))}
          </div>
        </div>
        <div className="glass rounded-lg p-6">
          <h3 className="mb-5 flex items-center justify-between font-serif text-headline-sm">Dominant Resonance <Icon name="spa" className="text-secondary" /></h3>
          <ul className="flex flex-col gap-4">
            {data?.distribution.map((d) => (
              <li key={d.mood}>
                <div className="flex justify-between text-label-md"><span>{moodLabel[d.mood]}</span><span>{d.percent}%</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.percent}%`, background: moodColor[d.mood] }} />
                </div>
              </li>
            ))}
          </ul>
          {top && top.percent > 0 && (
            <p className="mt-5 font-serif text-body-sm italic text-on-surface-variant">“Your sanctuary leans {moodLabel[top.mood]?.toLowerCase()} this month — honour what that is teaching you.”</p>
          )}
        </div>
      </div>

      <div id="journal" className="glass rounded-lg p-6">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-headline-sm"><Icon name="history_edu" className="text-primary" /> Recent Journal Reflections</h3>
        {!journal.data?.length ? (
          <p className="text-body-sm text-on-surface-variant">No reflections yet. Start one from the Daily Sanctuary.</p>
        ) : (
          <ul className="divide-y divide-slate-900/5">
            {journal.data.slice(0, 10).map((j) => (
              <li key={j.id} className="group flex gap-4 py-4">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: moodColor[j.mood] }} />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line text-body-md">{j.body}</p>
                  <p className="mt-1 text-label-sm text-primary">{moodLabel[j.mood]}{j.rippleAction && ` • Ripple: ${j.rippleAction}`}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <time className="text-label-sm text-on-surface-variant" dateTime={j.createdAt}>
                    {new Date(j.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </time>
                  <button type="button" aria-label="Delete reflection" className="text-on-surface-variant opacity-0 transition-opacity hover:text-error focus:opacity-100 group-hover:opacity-100" onClick={() => confirm("Delete this reflection?") && del.mutate(j.id)}>
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function Studio() {
  const journal = useJournal();
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-14 px-5 pb-16 pt-8 md:px-10">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-primary"><Icon name="architecture" size={14} /> Sacred atelier • Vol. IV</p>
          <h1 className="mt-2 font-serif text-headline-lg-mobile md:text-headline-lg">Mindset Studio & Growth Journal</h1>
          <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
            A private sanctuary to track your emotional landscape, compose custom personal affirmations, and generate bespoke contemplative art.
          </p>
        </div>
        <nav className="flex gap-1 rounded-full bg-surface-container-low p-1 text-label-md" aria-label="Studio sections">
          <a href="#builder" className="rounded-full bg-white px-4 py-2 shadow-sm">Studio Builder</a>
          <a href="#analytics" className="rounded-full px-4 py-2 hover:bg-white/60">Emotional Analytics</a>
          <a href="#journal" className="rounded-full px-4 py-2 hover:bg-white/60">Journal ({journal.data?.length ?? 0})</a>
        </nav>
      </header>
      <div id="builder"><Builder /></div>
      <SavedMantras />
      <Metrics />
    </div>
  );
}
