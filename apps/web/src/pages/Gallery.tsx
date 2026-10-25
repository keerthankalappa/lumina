import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api, unwrap, type Schemas } from "../api/client";
import { keys, useBookmark, useDeck, useDecks } from "../api/hooks";
import { useAudio } from "../audio/AudioProvider";
import { useAuth } from "../auth/AuthProvider";
import { DeckArt } from "../components/DeckArt";
import { Icon, Modal, Skeleton, useToast } from "../components/ui";
import { shareText } from "../lib/format";
import type { StudioPalette } from "../lib/palettes";
import { downloadBlob, renderCard, slugify } from "../lib/renderCard";
import { deckTrack } from "../lib/tracks";

const WALLPAPER_PALETTE: Record<string, StudioPalette> = {
  "earth-dawn": "dawn-amber",
  "sand-gold": "dawn-amber",
  sunburst: "solstice",
  forest: "eucalyptus",
  "lake-dusk": "twilight",
  "peach-bloom": "solstice",
  "stone-mist": "midnight",
};

function useDeckActions() {
  const qc = useQueryClient();
  const audio = useAudio();
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const bookmark = useBookmark();

  const loadDeck = (slug: string) =>
    qc.fetchQuery({ queryKey: keys.deck(slug), queryFn: () => unwrap(api.GET("/decks/{slug}", { params: { path: { slug } } })) });

  return {
    play: async (slug: string, startAt = 0) => {
      try {
        audio.play(deckTrack(await loadDeck(slug)), startAt);
      } catch {
        toast("Couldn’t load that deck", "error");
      }
    },
    toggleBookmark: (deck: Schemas["DeckSummary"]) => {
      if (!user) return navigate("/login?next=/gallery");
      bookmark.mutate(
        { targetType: "deck", targetId: deck.id, on: !deck.bookmarked },
        { onSuccess: () => toast(deck.bookmarked ? "Removed from your studio" : "Saved to your studio", "success") },
      );
    },
    wallpaper: async (deck: Schemas["DeckSummary"], text = deck.epigraph) => {
      const blob = await renderCard({
        text,
        attribution: deck.title,
        palette: WALLPAPER_PALETTE[deck.palette] ?? "dawn-amber",
        aura: "luminous-glow",
        typography: "classical",
        footer: `Lumina • ${deck.category}`,
      });
      downloadBlob(blob, `lumina-${slugify(deck.title)}.png`);
      toast("Wallpaper downloaded", "success");
    },
  };
}

function DeckCard({ deck }: { deck: Schemas["DeckSummary"] }) {
  const navigate = useNavigate();
  const audio = useAudio();
  const actions = useDeckActions();
  const nowPlaying = audio.track?.deckSlug === deck.slug && audio.status === "playing" && audio.track.id.startsWith("deck:");

  return (
    <article className={`group flex flex-col overflow-hidden rounded-lg bg-white shadow-glass transition-all hover:-translate-y-1 hover:shadow-sheet ${nowPlaying ? "ring-2 ring-primary/40" : ""}`}>
      <div className="relative aspect-[3/2] overflow-hidden">
        <DeckArt palette={deck.palette} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute right-3 top-3 flex gap-1.5">
          <button type="button" className="icon-btn h-8 w-8 bg-white/85" aria-label={deck.bookmarked ? "Remove bookmark" : "Bookmark deck"} aria-pressed={deck.bookmarked} onClick={() => actions.toggleBookmark(deck)}>
            <Icon name="bookmark" fill={deck.bookmarked} size={16} />
          </button>
          <button type="button" className="icon-btn h-8 w-8 bg-white/85" aria-label="Download as wallpaper" onClick={() => void actions.wallpaper(deck)}>
            <Icon name="wallpaper" size={16} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          <span className="rounded-full bg-slate-900/60 px-2.5 py-1 text-label-sm text-white backdrop-blur">{deck.theme}</span>
          {nowPlaying && <span className="rounded-full bg-secondary px-2.5 py-1 text-label-sm text-white">● NOW PLAYING</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="eyebrow flex flex-wrap items-center gap-1.5 text-on-surface-variant">
          {deck.cardCount} cards • <Icon name="volume_up" size={13} className="text-secondary" />
          <span className="text-secondary">{deck.audioMinutes}m audio guide</span> • {deck.guide}
        </p>
        <h3 className="font-serif text-headline-sm text-on-surface">{deck.title}</h3>
        <p className="relative pl-4 font-serif text-body-sm italic text-on-surface-variant">
          <span className="absolute left-0 top-0 text-primary/40">“</span>
          {deck.epigraph}
        </p>
      </div>
      <div className="flex items-center justify-between border-t border-slate-900/5 px-5 py-3 text-label-md">
        <button type="button" className="flex items-center gap-2 font-semibold" onClick={() => (nowPlaying ? audio.setPlayerOpen(true) : void actions.play(deck.slug))}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-white">
            <Icon name={nowPlaying ? "graphic_eq" : "play_arrow"} fill size={16} />
          </span>
          {nowPlaying ? "Open Player" : "Play Meditation"}
        </button>
        <button type="button" className="flex items-center gap-1 text-primary hover:underline" onClick={() => navigate(`/gallery/${deck.slug}`)}>
          Explore Deck <Icon name="arrow_forward" size={16} />
        </button>
      </div>
    </article>
  );
}

function Spotlight({ deck }: { deck: Schemas["DeckSummary"] }) {
  const actions = useDeckActions();
  const toast = useToast();
  return (
    <section className="relative overflow-hidden rounded-xl bg-linear-to-br from-tertiary-fixed/40 via-white to-secondary-container/30 p-6 shadow-sheet md:p-10" aria-labelledby="spotlight-title">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <span className="eyebrow flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-primary shadow-sm">
            <Icon name="verified" size={14} /> Curator spotlight of the week
          </span>
          <h2 id="spotlight-title" className="font-serif text-headline-lg-mobile md:text-headline-lg">{deck.title}</h2>
          <p className="text-body-md text-on-surface-variant">{deck.description}</p>
          <div className="flex flex-wrap gap-4 rounded-md bg-white/60 px-4 py-3 text-label-md">
            <span className="flex items-center gap-1"><Icon name="style" size={16} /> {deck.cardCount} Cards</span>
            <span className="flex items-center gap-1"><Icon name="headphones" size={16} /> {deck.audioMinutes}m Audio</span>
            <span className="flex items-center gap-1"><Icon name="person" size={16} /> Curated by {deck.guide}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => void actions.play(deck.slug)}>
              <Icon name="auto_stories" size={18} /> Begin Deck Journey
            </button>
            <button type="button" className="btn-secondary" onClick={() => actions.toggleBookmark(deck)}>
              <Icon name="bookmark" fill={deck.bookmarked} size={18} /> {deck.bookmarked ? "Saved" : "Save to My Studio"}
            </button>
            <button
              type="button"
              className="icon-btn h-11 w-11 bg-white"
              aria-label="Share deck"
              onClick={async () => {
                const msg = await shareText(deck.title, `“${deck.epigraph}” — ${deck.title} on Lumina`);
                if (msg) toast(msg);
              }}
            >
              <Icon name="share" />
            </button>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-lg shadow-xl">
            <DeckArt palette={deck.palette} className="aspect-[4/3] w-full" />
            <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-linear-to-t from-slate-900/85 to-transparent p-5 pt-16">
              <p className="eyebrow text-secondary-fixed">Previewing card 01</p>
              <p className="mt-1 font-serif text-headline-sm italic text-white">“{deck.epigraph}”</p>
            </div>
          </div>
          <div className="sheet absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-2 text-label-md">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-container text-secondary">
              <Icon name="spa" size={16} />
            </span>
            Breath guide included
          </div>
        </div>
      </div>
    </section>
  );
}

function DeckDetail({ slug, onClose }: { slug: string; onClose: () => void }) {
  const deck = useDeck(slug);
  const audio = useAudio();
  const actions = useDeckActions();
  const d = deck.data;
  return (
    <Modal open onClose={onClose} label={d?.title ?? "Deck"} className="w-full max-w-3xl">
      <div className="overflow-hidden rounded-lg bg-white shadow-2xl">
        {!d ? (
          <div className="p-10"><Skeleton className="h-64" /></div>
        ) : (
          <>
            <div className="relative">
              <DeckArt palette={d.palette} className="aspect-[3/1] w-full" />
              <button type="button" onClick={onClose} aria-label="Close" className="icon-btn absolute right-4 top-4 bg-white/90">
                <Icon name="close" />
              </button>
            </div>
            <div className="p-6 md:p-8">
              <p className="eyebrow text-primary">{d.category} • {d.cardCount} cards • {d.guide}</p>
              <h2 className="mt-2 font-serif text-headline-md">{d.title}</h2>
              <p className="mt-2 text-body-md text-on-surface-variant">{d.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => { audio.play(deckTrack(d)); audio.setPlayerOpen(true); }}>
                  <Icon name="play_arrow" fill /> Play all cards
                </button>
                <button type="button" className="btn-secondary" onClick={() => actions.toggleBookmark(d)}>
                  <Icon name="bookmark" fill={d.bookmarked} size={18} /> {d.bookmarked ? "Saved" : "Save deck"}
                </button>
              </div>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2">
                {d.affirmations.map((a, i) => (
                  <li key={a.id} className="group flex flex-col justify-between gap-3 rounded-md bg-parchment p-5">
                    <p className="font-serif text-body-lg italic leading-snug">“{a.text}”</p>
                    <div className="flex items-center justify-between text-label-sm text-on-surface-variant">
                      <span>Card {String(i + 1).padStart(2, "0")}</span>
                      <span className="flex gap-1">
                        <button type="button" className="rounded-full p-1.5 hover:bg-white hover:text-primary" aria-label="Play this card" onClick={() => audio.play(deckTrack(d), i)}>
                          <Icon name="play_circle" size={18} />
                        </button>
                        <button type="button" className="rounded-full p-1.5 hover:bg-white hover:text-primary" aria-label="Download card as wallpaper" onClick={() => void actions.wallpaper(d, a.text)}>
                          <Icon name="download" size={18} />
                        </button>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function Gallery() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const deferred = useDeferredValue(query.trim());
  const decks = useDecks(deferred, category);
  const allDecks = useDecks("", "");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const featured = allDecks.data?.items.find((d) => d.featured);
  const items = decks.data?.items ?? [];
  const total = allDecks.data?.items.length ?? 0;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[700px] rounded-full bg-linear-to-bl from-secondary-container/30 via-primary-fixed/30 to-transparent blur-3xl" />
      <div className="relative mx-auto flex max-w-[1120px] flex-col gap-12 px-5 pb-16 pt-8 md:px-10">
        <header className="flex flex-col gap-4">
          <p className="eyebrow text-primary">• Curated visual artifacts & audio transmissions</p>
          <h1 className="font-serif text-headline-lg-mobile md:text-headline-lg">Visual Wisdom & Thematic Decks</h1>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            Immerse yourself in curated collections of transformative mantras, fine editorial art, and contemplative audio tracks designed to shift
            perspective and foster world-positive change.
          </p>
          <label className="relative mt-2 max-w-xl">
            <span className="sr-only">Search decks</span>
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={80}
              placeholder="Search affirmations, emotions, changemakers, or themes…"
              className="w-full rounded-full bg-surface-container-low py-3 pl-12 pr-14 text-body-md outline-none focus:shadow-[0_0_0_4px_rgba(254,215,170,0.7)]"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded bg-surface-container-high px-1.5 text-label-sm text-on-surface-variant">⌘K</kbd>
          </label>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Collections">
            <button type="button" role="tab" aria-selected={!category} className="chip" onClick={() => setCategory("")}>
              All Collections ({total})
            </button>
            {(allDecks.data?.categories ?? []).map((c) => (
              <button key={c.name} type="button" role="tab" aria-selected={category === c.name} className="chip" onClick={() => setCategory(c.name)}>
                {c.name}
              </button>
            ))}
          </div>
        </header>

        {featured && !deferred && !category && <Spotlight deck={featured} />}

        <section aria-labelledby="archetypes">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-primary">Mindset portals</p>
              <h2 id="archetypes" className="font-serif text-headline-md">Explore Curated Archetypes</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Showing {items.length} of {total} collections
            </p>
          </div>
          {decks.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-96" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-lg bg-surface-container-low p-10 text-center text-on-surface-variant">
              No decks match “{deferred}”. Try “calm”, “earth” or “courage”.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((d) => <DeckCard key={d.id} deck={d} />)}
            </div>
          )}
        </section>

        <figure className="mx-auto max-w-2xl py-8 text-center">
          <div className="mx-auto mb-6 h-0.5 w-12 bg-primary-container/60" />
          <blockquote className="font-serif text-headline-md italic">“We do not merely absorb beauty; we become what we contemplate.”</blockquote>
          <figcaption className="eyebrow mt-3 text-on-surface-variant">The Lumina Studio Archive</figcaption>
        </figure>
      </div>
      {slug && <DeckDetail slug={slug} onClose={() => navigate("/gallery")} />}
    </div>
  );
}
