import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiProblem } from "../api/client";
import { useBookmark, useCommunity, useCreateJournal, useDaily, usePractice, useRipples } from "../api/hooks";
import { SOUNDSCAPES } from "../audio/ambient";
import { formatTime, useAudio } from "../audio/AudioProvider";
import { useAuth } from "../auth/AuthProvider";
import { BreathingRing } from "../components/BreathingRing";
import { Icon, Skeleton, useToast } from "../components/ui";
import { Waveform } from "../components/Waveform";
import { compact, greeting, seasonName, shareText, timeAgo } from "../lib/format";
import { MOODS, type MoodId } from "../lib/palettes";
import { dailyTrack } from "../lib/tracks";

function Hero() {
  const { user } = useAuth();
  const daily = useDaily();
  const audio = useAudio();
  const toast = useToast();
  const navigate = useNavigate();
  const bookmark = useBookmark();
  const [saved, setSaved] = useState(false);

  if (daily.isLoading) return <Skeleton className="h-[460px] rounded-xl" />;
  if (!daily.data) return <p className="text-error">We couldn’t load today’s mantra. Please refresh.</p>;
  const d = daily.data;
  const track = dailyTrack(d);
  const isThis = audio.track?.id === track.id;
  const playing = isThis && audio.status === "playing";
  const progress = isThis && audio.total ? audio.elapsed / audio.total : 0;

  const onPlay = () => (isThis ? audio.toggle() : audio.play(track));
  const onBookmark = () => {
    if (!user) return navigate("/login?next=/");
    bookmark.mutate(
      { targetType: "affirmation", targetId: d.affirmation.id, on: !saved },
      { onSuccess: () => { setSaved(!saved); toast(saved ? "Removed from saved mantras" : "Saved to your sanctuary", "success"); } },
    );
  };

  return (
    <section className="relative overflow-hidden rounded-xl bg-surface-container-lowest/85 p-6 shadow-xl backdrop-blur-xl md:p-14" aria-labelledby="daily-mantra">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-fixed/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-secondary-container/30 blur-3xl" />
      <div className="absolute right-6 top-6 z-10 flex gap-2 md:right-8 md:top-8">
        <button type="button" className="icon-btn" title="Bookmark affirmation" aria-pressed={saved} onClick={onBookmark}>
          <Icon name="bookmark" fill={saved} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Share sanctuary card"
          onClick={async () => {
            const msg = await shareText("Today’s Lumina mantra", `“${d.affirmation.text}”`);
            if (msg) toast(msg);
          }}
        >
          <Icon name="share" />
        </button>
      </div>

      <div className="relative z-[1] flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-2 pr-24">
          <span className="eyebrow rounded-full bg-primary-fixed px-4 py-1.5 text-on-primary-fixed">Daily Focal Mantra</span>
          <span className="eyebrow text-outline">• {d.deck.theme}</span>
        </div>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute -left-3 -top-10 select-none font-serif text-[120px] leading-none text-primary/10">“</span>
          <blockquote id="daily-mantra" className="max-w-4xl font-serif text-headline-lg-mobile italic text-on-surface md:text-headline-lg">
            “{d.affirmation.text}”
          </blockquote>
          <Link to="/gallery" className="mt-3 inline-block text-label-md text-primary hover:underline">
            From “{d.deck.title}” →
          </Link>
        </div>

        <div className="grid items-center gap-6 lg:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-surface-container-low/80 p-5 shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-white">
                  <Icon name="record_voice_over" size={18} />
                </span>
                <div>
                  <p className="text-label-lg">Guided by {d.deck.guide}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {isThis ? formatTime(audio.total) : "~1 min"} mindful immersion • {SOUNDSCAPES.find((s) => s.id === audio.soundscape)?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <button type="button" title="Previous repetition" className="p-1 hover:text-on-surface disabled:opacity-40" disabled={!isThis} onClick={() => audio.skip(-1)}>
                  <Icon name="skip_previous" />
                </button>
                <button type="button" onClick={onPlay} aria-label={playing ? "Pause narration" : "Play narration"} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-white shadow-md transition-transform hover:scale-105 active:scale-95">
                  <Icon name={playing ? "pause" : "play_arrow"} fill size={24} />
                </button>
                <button type="button" title="Next repetition" className="p-1 hover:text-on-surface disabled:opacity-40" disabled={!isThis} onClick={() => audio.skip(1)}>
                  <Icon name="skip_next" />
                </button>
              </div>
            </div>
            <Waveform active={playing && audio.ambientOn} progress={progress} bars={30} />
            <div className="flex items-center justify-between text-label-sm text-outline">
              <span className="tabular-nums">{formatTime(isThis ? audio.elapsed : 0)}</span>
              <button type="button" onClick={() => (isThis ? audio.setPlayerOpen(true) : audio.play(track))} className="flex items-center gap-1 text-on-surface-variant hover:text-primary">
                <Icon name="tune" size={14} /> Pad: {Math.round(audio.ambientVolume * 100)}% · Mixer
              </button>
              <span className="tabular-nums">{isThis ? formatTime(audio.total) : "--:--"}</span>
            </div>
          </div>
          <div className="lg:col-span-5">
            <BreathingRing />
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionCard() {
  const { user } = useAuth();
  const daily = useDaily();
  const practice = usePractice();
  const toast = useToast();
  const navigate = useNavigate();
  if (!daily.data) return null;
  const { action, practiced } = daily.data;

  const markPracticed = () => {
    if (!user) return navigate("/login?next=/");
    practice.mutate(action.id, {
      onSuccess: (s) => toast(`Beautiful. +${action.karma} karma — ${s.streak}-day streak`, "success"),
      onError: (e) => toast(e instanceof ApiProblem ? e.message : "Couldn’t save that", "error"),
    });
  };

  return (
    <section className="glass flex flex-col justify-between gap-6 rounded-xl p-6 md:flex-row md:items-center md:p-10" aria-labelledby="action-title">
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow rounded-full bg-secondary-container px-3 py-1 text-on-secondary-container">Action in the world</span>
          <span className="flex items-center gap-1 text-label-sm text-primary">
            <Icon name="bolt" size={14} /> +{action.karma} Community Karma
          </span>
        </div>
        <h2 id="action-title" className="mt-3 font-serif text-headline-md">{action.title}</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">{action.description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" onClick={markPracticed} disabled={practiced || practice.isPending} className="btn-sage">
          <Icon name={practiced ? "task_alt" : "radio_button_unchecked"} />
          {practiced ? "Practised today" : "Mark as Practiced"}
        </button>
        <Link to={`/ripple?compose=${encodeURIComponent(action.title)}`} className="btn-secondary">
          <Icon name="waves" size={18} /> Share Ripple
        </Link>
      </div>
    </section>
  );
}

function Intention() {
  const { user } = useAuth();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [body, setBody] = useState("");
  const create = useCreateJournal();
  const toast = useToast();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mood || !body.trim()) return toast("Choose a state and write a line first");
    create.mutate(
      { mood, body: body.trim(), rippleAction: "" },
      {
        onSuccess: () => {
          setBody("");
          setMood(null);
          toast("Saved privately to your journal", "success");
        },
        onError: (err) => toast(err instanceof ApiProblem ? err.message : "Couldn’t save", "error"),
      },
    );
  };

  return (
    <form onSubmit={save} className="glass flex min-w-0 flex-col gap-5 rounded-xl p-6 md:p-8" aria-labelledby="intent-title">
      <div className="flex items-center justify-between">
        <h2 id="intent-title" className="flex items-center gap-2 font-serif text-headline-sm">
          <Icon name="psychology_alt" className="text-primary" /> Daily Energy & Intention
        </h2>
        <span className="eyebrow text-on-surface-variant">Private</span>
      </div>
      <fieldset>
        <legend className="text-body-sm text-on-surface-variant">How does your internal sanctuary feel right now? Choose your prevailing state:</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button key={m.id} type="button" className="chip" aria-pressed={mood === m.id} onClick={() => setMood(m.id)}>
              {m.label} <span aria-hidden="true">{m.emoji}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2">
        <span className="text-label-lg">Where will your kindness be most needed before sunset?</span>
        <textarea
          className="field min-h-24 resize-none"
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write with tenderness. E.g., Offering patience to my team during deadline friction…"
        />
      </label>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Icon name="lock" size={14} /> Private to your journal
        </span>
        {user ? (
          <button type="submit" className="btn-primary px-5 py-2 text-label-md" disabled={create.isPending}>
            Save to Studio
          </button>
        ) : (
          <Link to="/login?next=/" className="btn-primary px-5 py-2 text-label-md">
            Sign in to save
          </Link>
        )}
      </div>
    </form>
  );
}

function Resonance() {
  const stats = useCommunity();
  const ripples = useRipples("");
  const moments = ripples.data?.pages[0]?.items.slice(0, 3) ?? [];
  const dots = ["bg-secondary-fixed-dim", "bg-primary-container", "bg-secondary"];

  return (
    <section className="glass flex min-w-0 flex-col gap-5 rounded-xl p-6 md:p-8" aria-labelledby="resonance-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="resonance-title" className="flex items-center gap-2 font-serif text-headline-sm">
            <Icon name="public" className="text-secondary" /> Global Resonance Today
          </h2>
          <p className="eyebrow mt-1 text-secondary">Unified awareness</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-headline-md text-primary">{compact(stats.data?.actionsPracticed ?? 0)}</p>
          <p className="text-label-sm text-on-surface-variant">{stats.data?.practicedToday ?? 0} practised today</p>
        </div>
      </div>
      <div>
        <p className="eyebrow mb-2 text-on-surface-variant">Live community moments</p>
        <ul className="flex flex-col gap-2">
          {moments.length === 0 && <li className="text-body-sm text-on-surface-variant">Be the first ripple today.</li>}
          {moments.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-body-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dots[i % 3]}`} />
              <span className="min-w-0 flex-1 truncate">
                <b className="font-semibold">{m.author.displayName}</b>
                {m.location ? ` from ${m.location.split(",")[0]}` : ""}: {m.body}
              </span>
              <span className="shrink-0 text-label-sm text-on-surface-variant">{timeAgo(m.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
      {stats.data && (
        <Link to="/ripple" className="mt-auto flex items-center justify-between gap-3 rounded-full bg-surface-container-low p-2 pl-3 hover:bg-surface-container">
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <Icon name="wb_twilight" />
            </span>
            <span>
              <span className="block text-label-lg">{stats.data.challenge.title}</span>
              <span className="text-body-sm text-on-surface-variant">
                {compact(stats.data.challenge.progress)} / {compact(stats.data.challenge.goal)} ripples this month
              </span>
            </span>
          </span>
          <span className="rounded-full bg-white px-4 py-1.5 text-label-md">Join</span>
        </Link>
      )}
    </section>
  );
}

export function Sanctuary() {
  const { user } = useAuth();
  const audio = useAudio();
  const daily = useDaily();
  const now = new Date();
  const scape = SOUNDSCAPES.find((s) => s.id === audio.soundscape)!;
  const firstName = user?.displayName.split(" ")[0];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-linear-to-b from-primary-fixed/30 via-surface-container-high/40 to-transparent blur-3xl" />
      <div className="relative mx-auto flex max-w-[1120px] flex-col gap-10 px-5 pb-16 pt-6 md:px-10">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow flex items-center gap-2 text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-container" />
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              {daily.data && ` • Day ${daily.data.dayOfSeason} of ${seasonName(now)}`}
            </p>
            <h1 className="mt-2 font-serif text-headline-lg-mobile md:text-headline-lg">
              {greeting(now)}
              {firstName ? `, ${firstName}.` : "."}{" "}
              <span className="font-normal italic text-on-surface-variant">The world awaits your calm presence.</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-4 py-2 text-label-md shadow-sm">
              <Icon name="spa" fill className="text-secondary" size={18} /> Ambient: {scape.name}
              <span className={`h-1.5 w-1.5 rounded-full ${audio.ambientOn ? "bg-secondary" : "bg-outline-variant"}`} />
            </span>
            <button type="button" aria-label={audio.ambientOn ? "Pause ambience" : "Play ambience"} onClick={audio.toggleAmbient} className="icon-btn h-9 w-9">
              <Icon name={audio.ambientOn ? "volume_up" : "volume_off"} size={18} />
            </button>
          </div>
        </section>

        <Hero />
        <ActionCard />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Intention />
          <Resonance />
        </div>
      </div>
    </div>
  );
}
