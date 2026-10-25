import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ApiProblem, type Schemas } from "../api/client";
import { useCommunity, useCreateRipple, useDeleteRipple, useLight, useRipples, useStats } from "../api/hooks";
import { useAuth } from "../auth/AuthProvider";
import { Avatar, Icon, Skeleton, Spinner, useToast } from "../components/ui";
import { compact, shareText, timeAgo } from "../lib/format";

type Category = Schemas["RippleCategory"];
const CATEGORIES: Array<{ id: Category | ""; label: string; icon: string }> = [
  { id: "", label: "All Stories", icon: "public" },
  { id: "environment", label: "Environmental Actions", icon: "forest" },
  { id: "kindness", label: "Acts of Kindness", icon: "volunteer_activism" },
  { id: "mentorship", label: "Creative Mentorship", icon: "school" },
  { id: "local", label: "Local Change", icon: "location_city" },
];

function StatTile({ icon, tint, value, label }: { icon: string; tint: string; value: number; label: string }) {
  return (
    <div className="glass rounded-md p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tint}`}><Icon name={icon} /></span>
      <p className="mt-4 font-serif text-headline-md">{compact(value)}</p>
      <p className="text-label-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

function Compose({ initial, onDone }: { initial: string; onDone?: () => void }) {
  const { user } = useAuth();
  const create = useCreateRipple();
  const toast = useToast();
  const [category, setCategory] = useState<Category>("kindness");
  const [body, setBody] = useState(initial ? `Today I practised “${initial}”: ` : "");
  const [mantraTag, setMantraTag] = useState("");
  const [location, setLocation] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (initial) ref.current?.focus();
  }, [initial]);

  if (!user) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body-sm text-on-surface-variant">Sign in with Google to log your ripple and send light to others.</p>
        <Link to="/login?next=/ripple" className="btn-primary">Sign in to share</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { category, body: body.trim(), mantraTag: mantraTag.trim(), location: location.trim() },
      {
        onSuccess: () => {
          setBody("");
          setMantraTag("");
          toast("Your ripple is out in the world ✨", "success");
          onDone?.();
        },
        onError: (err) => toast(err instanceof ApiProblem ? (err.fieldErrors[0]?.message ?? err.message) : "Couldn’t share", "error"),
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <select className="field py-2.5 text-body-sm" value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="Category">
        {CATEGORIES.slice(1).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <textarea
        ref={ref}
        className="field min-h-28 resize-none text-body-sm"
        minLength={10}
        maxLength={600}
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What positive change did you spark today?"
        aria-label="Describe your ripple"
      />
      <div className="grid grid-cols-2 gap-2">
        <input className="field py-2 text-body-sm" maxLength={60} value={mantraTag} onChange={(e) => setMantraTag(e.target.value)} placeholder="Mantra tag" aria-label="Mantra tag" />
        <input className="field py-2 text-body-sm" maxLength={80} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City (optional)" aria-label="Location" />
      </div>
      <button type="submit" className="btn-primary" disabled={create.isPending || body.trim().length < 10}>
        <Icon name="add" /> Log a New Ripple Action
      </button>
    </form>
  );
}

function RippleCard({ r }: { r: Schemas["Ripple"] }) {
  const { user } = useAuth();
  const light = useLight();
  const del = useDeleteRipple();
  const toast = useToast();
  return (
    <article className="glass animate-rise rounded-lg p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={r.author.displayName} src={r.author.avatarUrl} size={40} />
          <div>
            <p className="text-label-lg">{r.author.displayName}</p>
            <p className="text-body-sm text-on-surface-variant">
              {r.location && `${r.location} • `}
              {timeAgo(r.createdAt)}
            </p>
          </div>
        </div>
        {r.mantraTag && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container-low px-3 py-1 text-label-sm text-on-surface-variant">
            <Icon name="auto_awesome" size={12} /> Mantra: {r.mantraTag}
          </span>
        )}
      </header>
      <p className="mt-4 whitespace-pre-line text-body-md">{r.body}</p>
      <footer className="mt-5 flex items-center justify-between text-label-md text-on-surface-variant">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-pressed={r.litByMe}
            disabled={!user || r.mine || light.isPending}
            title={r.mine ? "Your own ripple" : user ? "Send light" : "Sign in to send light"}
            onClick={() => light.mutate({ id: r.id, on: !r.litByMe })}
            className={`flex items-center gap-1 rounded-full px-2 py-1 transition-colors disabled:cursor-default ${r.litByMe ? "bg-primary-fixed text-primary" : "hover:bg-surface-container-low"}`}
          >
            <Icon name="lightbulb" fill={r.litByMe} size={18} /> {r.lights} Lights
          </button>
          <span className="flex items-center gap-1 capitalize"><Icon name="label" size={16} /> {r.category}</span>
        </div>
        <div className="flex items-center gap-1">
          {r.mine && (
            <button type="button" aria-label="Delete ripple" className="rounded-full p-1.5 hover:bg-error-container/50 hover:text-error" onClick={() => confirm("Delete this ripple?") && del.mutate(r.id)}>
              <Icon name="delete" size={18} />
            </button>
          )}
          <button
            type="button"
            aria-label="Share ripple"
            className="rounded-full p-1.5 hover:bg-surface-container-low"
            onClick={async () => {
              const msg = await shareText("A ripple on Lumina", r.body);
              if (msg) toast(msg);
            }}
          >
            <Icon name="share" size={18} />
          </button>
        </div>
      </footer>
    </article>
  );
}

export function Ripple() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [category, setCategory] = useState<Category | "">("");
  const feed = useRipples(category);
  const community = useCommunity();
  const stats = useStats();
  const c = community.data;
  const ripples = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const pct = c ? Math.min(100, Math.round((c.challenge.progress / c.challenge.goal) * 100)) : 0;
  const daysLeft = c ? Math.max(0, Math.ceil((Date.parse(`${c.challenge.endsOn}T23:59:59`) - Date.now()) / 86_400_000)) : 0;
  const composeRef = useRef<HTMLDivElement>(null);
  const toCompose = () => composeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-linear-to-b from-secondary-container/25 to-transparent blur-3xl" />
      <div className="relative mx-auto flex max-w-[1120px] flex-col gap-12 px-5 pb-16 pt-10 md:px-10">
        <header className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="eyebrow flex items-center gap-1.5 rounded-full bg-tertiary-fixed px-3 py-1 text-tertiary">
            <Icon name="cyclone" size={14} /> Collective momentum
          </span>
          <h1 className="font-serif text-headline-lg-mobile md:text-headline-lg">Community Ripple & Real-World Impact</h1>
          <p className="text-body-lg text-on-surface-variant">
            Affirmation into action. Discover how our collective intentions ripple out into tangible compassion, neighborhood restoration, and global aid.
          </p>
        </header>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile icon="volunteer_activism" tint="bg-primary-fixed text-primary" value={c?.actionsPracticed ?? 0} label="Actions practised" />
          <StatTile icon="waves" tint="bg-secondary-container text-secondary" value={c?.ripplesShared ?? 0} label="Ripples shared" />
          <StatTile icon="lightbulb" tint="bg-tertiary-fixed text-tertiary" value={c?.lightsGiven ?? 0} label="Lights given" />
          <StatTile icon="groups" tint="bg-surface-container-high text-on-surface" value={c?.practitioners ?? 0} label="Practitioners" />
        </div>

        {c && (
          <section className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sheet md:p-10" aria-labelledby="challenge">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-fixed/50 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-xl">
                <p className="text-label-sm">
                  <span className="eyebrow rounded-full bg-primary-fixed px-2.5 py-1 text-on-primary-fixed">
                    {new Date().toLocaleDateString(undefined, { month: "long" })} collective challenge
                  </span>
                  <span className="ml-2 text-on-surface-variant">• {daysLeft} days remaining</span>
                </p>
                <h2 id="challenge" className="mt-3 font-serif text-headline-md">{c.challenge.title}</h2>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  Goal: spark {compact(c.challenge.goal)} acts of unprompted community care this month. Every practised action and shared ripple counts.
                </p>
                <div className="mt-5">
                  <div className="flex justify-between text-label-md">
                    <span><b className="font-serif text-headline-sm">{compact(c.challenge.progress)}</b> / {compact(c.challenge.goal)} ripples</span>
                    <span className="text-primary">{pct}% Complete</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-surface-container-high">
                    <div className="h-full rounded-full bg-linear-to-r from-primary-container to-secondary transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button type="button" className="btn-primary" onClick={toCompose}>
                  <Icon name="add_task" /> Log Your Action for Challenge
                </button>
                <Link to="/" className="btn-secondary">
                  <Icon name="wb_sunny" /> Today’s Practice
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-label="Community feed" className="flex min-w-0 flex-col gap-5">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={category === cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-label-md transition-all ${category === cat.id ? "bg-on-surface text-white" : "bg-white shadow-sm hover:bg-surface-container-low"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {feed.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-48" />)}
            {!feed.isLoading && ripples.length === 0 && (
              <p className="rounded-lg bg-surface-container-low p-10 text-center text-on-surface-variant">No ripples here yet — yours could be the first.</p>
            )}
            {ripples.map((r) => <RippleCard key={r.id} r={r} />)}
            {feed.hasNextPage && (
              <button type="button" className="btn-secondary self-center" onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
                {feed.isFetchingNextPage ? <Spinner label="Loading" /> : "Load more stories"}
              </button>
            )}
          </section>

          <aside className="flex min-w-0 flex-col gap-6">
            <div ref={composeRef} className="rounded-lg bg-tertiary-fixed/50 p-6">
              <h2 className="flex items-center gap-2 font-serif text-headline-sm"><Icon name="flare" className="text-primary" /> Daily Spark</h2>
              <p className="mb-4 mt-1 text-body-sm text-on-surface-variant">What positive change did you spark today? No ripple is too small to begin an avalanche of good.</p>
              <Compose initial={params.get("compose") ?? ""} />
            </div>

            {user && stats.data && (
              <>
                <div className="glass rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-headline-sm">Your Footprint</h2>
                    <span className="rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-on-secondary-container">Beacon Lvl {stats.data.beaconLevel}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      [stats.data.actionsLogged, "Actions logged"],
                      [stats.data.lightsReceived, "Lights received"],
                      [stats.data.karma, "Karma"],
                      [stats.data.streak, "Day streak"],
                    ].map(([v, l]) => (
                      <div key={l} className="rounded-md bg-surface-container-low p-3">
                        <p className="font-serif text-headline-sm">{compact(Number(v))}</p>
                        <p className="text-label-sm text-on-surface-variant">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-headline-sm">Earned Badges</h2>
                    <span className="text-label-sm text-primary">
                      {stats.data.badges.filter((b) => b.earned).length} / {stats.data.badges.length} unlocked
                    </span>
                  </div>
                  <ul className="mt-4 flex flex-col gap-3">
                    {stats.data.badges.map((b) => (
                      <li key={b.id} className={`flex items-center gap-3 ${b.earned ? "" : "opacity-45 grayscale"}`}>
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${b.earned ? "bg-primary-fixed text-primary" : "bg-surface-container"}`}>
                          <Icon name={b.earned ? "workspace_premium" : "lock"} size={18} />
                        </span>
                        <span>
                          <span className="block text-label-lg">{b.name}</span>
                          <span className="text-body-sm text-on-surface-variant">{b.description}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
