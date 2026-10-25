import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { api, ApiProblem, googleSignInUrl, setCsrfToken, unwrap } from "../api/client";
import { useUpdateProfile } from "../api/hooks";
import { SOUNDSCAPES, type SoundscapeId } from "../audio/ambient";
import { useAudio } from "../audio/AudioProvider";
import { sessionKey, useAuth } from "../auth/AuthProvider";
import { DeckArt } from "../components/DeckArt";
import { Icon, Modal, useToast } from "../components/ui";

const ERRORS: Record<string, string> = {
  access_denied: "Sign-in was cancelled. You can try again whenever you’re ready.",
  invalid_state: "Your sign-in session expired. Please try again.",
  email_unverified: "Your Google account’s email address isn’t verified yet.",
  email_domain_not_allowed: "This server only accepts certain email domains. Try your Gmail account.",
  invalid_id_token: "We couldn’t verify Google’s response. Please try again.",
  token_exchange_failed: "Google sign-in is temporarily unavailable. Please try again.",
};

/** Only same-app relative paths: never let `next` send the user to another site. */
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/");

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function Login() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const error = params.get("error");
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => unwrap(api.GET("/auth/providers")) });
  const [email, setEmail] = useState("");
  const [devError, setDevError] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  if (user) return <Navigate to={next} replace />;

  const devLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const s = await unwrap(api.POST("/auth/dev-login", { body: { email } }));
      setCsrfToken(s.csrfToken);
      qc.setQueryData(sessionKey, s);
      navigate(next);
    } catch (err) {
      setDevError(err instanceof ApiProblem ? err.message : "Sign-in failed");
    }
  };

  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-5 py-12 md:grid-cols-2 md:px-10 md:py-20">
      <div className="relative hidden overflow-hidden rounded-xl shadow-xl md:block">
        <DeckArt palette="earth-dawn" className="aspect-[4/5] w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-900/80 to-transparent p-8 pt-24">
          <p className="font-serif text-headline-md italic text-white">“In the center of action, I carry stillness like a river.”</p>
        </div>
      </div>
      <div className="glass mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl p-8 md:p-10">
        <div>
          <p className="eyebrow text-primary">Welcome to Lumina</p>
          <h1 className="mt-2 font-serif text-headline-lg-mobile">Enter your sanctuary</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Sign in or create your account with Google. Your first sign-in creates your private sanctuary — no password to remember.
          </p>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-error-container px-4 py-3 text-body-sm text-error">
            <Icon name="error" size={18} /> {ERRORS[error] ?? "Something went wrong signing you in. Please try again."}
          </p>
        )}

        {providers.data?.google !== false ? (
          <a
            href={googleSignInUrl(next)}
            className="flex items-center justify-center gap-3 rounded-full border border-slate-900/10 bg-white px-5 py-3.5 text-label-lg font-semibold shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
          >
            <GoogleMark /> Continue with Google
          </a>
        ) : (
          <p className="rounded-md bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
            Google sign-in isn’t configured on this server yet. Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>apps/api/.env.local</code>.
          </p>
        )}

        <ul className="flex flex-col gap-2 text-body-sm text-on-surface-variant">
          <li className="flex items-center gap-2"><Icon name="lock" size={16} className="text-secondary" /> We only receive your name, email and profile photo.</li>
          <li className="flex items-center gap-2"><Icon name="visibility_off" size={16} className="text-secondary" /> Journal entries are private to you.</li>
          <li className="flex items-center gap-2"><Icon name="delete_forever" size={16} className="text-secondary" /> Delete your account and data any time.</li>
        </ul>

        {providers.data?.devLogin && (
          <form onSubmit={devLogin} className="flex flex-col gap-2 border-t border-dashed border-outline-variant pt-5">
            <p className="eyebrow text-on-surface-variant">Local development sign-in</p>
            <div className="flex gap-2">
              <input type="email" required className="field py-2.5 text-body-sm" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email for development login" />
              <button className="btn-secondary shrink-0" type="submit">Enter</button>
            </div>
            {devError && <p className="text-body-sm text-error">{devError}</p>}
          </form>
        )}
        <p className="text-center text-body-sm text-on-surface-variant">
          By continuing you agree to our <Link to="/privacy" className="text-primary underline">privacy notice</Link>.
        </p>
      </div>
    </div>
  );
}

/** Shown once, right after Google registers a new account. */
export function Welcome() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const audio = useAudio();
  const update = useUpdateProfile();
  const navigate = useNavigate();
  const [scape, setScape] = useState<SoundscapeId>((user?.soundscape as SoundscapeId) ?? "morning-mist");
  const [rate, setRate] = useState(user?.narrationRate ?? 90);
  if (!user) return <Navigate to="/login" replace />;

  const finish = () =>
    update.mutate(
      { soundscape: scape, narrationRate: rate },
      {
        onSuccess: () => {
          audio.setSoundscape(scape);
          audio.setRate(rate / 100);
          navigate(next);
        },
      },
    );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-14">
      <div className="text-center">
        <p className="eyebrow text-primary">Account created</p>
        <h1 className="mt-2 font-serif text-headline-lg-mobile md:text-headline-lg">Welcome, {user.displayName.split(" ")[0]}.</h1>
        <p className="mt-2 text-body-lg text-on-surface-variant">Let’s tune your sanctuary. You can change these any time.</p>
      </div>
      <section className="glass rounded-xl p-6">
        <h2 className="font-serif text-headline-sm">Choose your ambient soundscape</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SOUNDSCAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={scape === s.id}
              onClick={() => {
                setScape(s.id);
                audio.setSoundscape(s.id);
                if (!audio.ambientOn) audio.toggleAmbient();
              }}
              className={`flex items-center gap-3 rounded-md p-3 text-left transition-all ${scape === s.id ? "bg-secondary-container/60 ring-2 ring-secondary" : "bg-surface-container-low hover:bg-surface-container"}`}
            >
              <Icon name={s.icon} className="text-secondary" />
              <span>
                <span className="block text-label-lg">{s.name}</span>
                <span className="text-body-sm text-on-surface-variant">{s.blurb}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-body-sm text-on-surface-variant">Tap one to preview it.</p>
      </section>
      <section className="glass rounded-xl p-6">
        <label className="flex items-center justify-between font-serif text-headline-sm" htmlFor="rate">
          Narration pace <span className="font-sans text-label-lg">{rate}%</span>
        </label>
        <input id="rate" type="range" min={70} max={120} step={5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-3 w-full accent-[#855300]" />
      </section>
      <button type="button" className="btn-primary self-center px-8 py-3.5" onClick={finish} disabled={update.isPending}>
        Enter my sanctuary <Icon name="arrow_forward" />
      </button>
    </div>
  );
}

export function Account() {
  const { user, signOut } = useAuth();
  const update = useUpdateProfile();
  const toast = useToast();
  const audio = useAudio();
  const [name, setName] = useState(user?.displayName ?? "");
  const [rate, setRate] = useState(user?.narrationRate ?? 90);
  const [scape, setScape] = useState<SoundscapeId>((user?.soundscape as SoundscapeId) ?? "morning-mist");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  if (!user) return null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { displayName: name.trim(), narrationRate: rate, soundscape: scape },
      {
        onSuccess: () => {
          audio.setRate(rate / 100);
          audio.setSoundscape(scape);
          toast("Preferences saved", "success");
        },
        onError: (err) => toast(err instanceof ApiProblem ? (err.fieldErrors[0]?.message ?? err.message) : "Couldn’t save", "error"),
      },
    );
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await unwrap(api.DELETE("/me"));
      setCsrfToken(null);
      window.location.assign("/?deleted=1");
    } catch {
      toast("Couldn’t delete your account. Please try again.", "error");
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-12">
      <h1 className="font-serif text-headline-lg-mobile md:text-headline-lg">Account & preferences</h1>
      <form onSubmit={save} className="glass flex flex-col gap-5 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
          <Icon name="mail" /> {user.email} <span className="rounded-full bg-secondary-container/60 px-2 py-0.5 text-label-sm text-on-secondary-container">Google verified</span>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-md">Display name</span>
          <input className="field py-2.5" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-md">Default soundscape</span>
          <select className="field py-2.5" value={scape} onChange={(e) => setScape(e.target.value as SoundscapeId)}>
            {SOUNDSCAPES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between text-label-md">Narration pace <span>{rate}%</span></span>
          <input type="range" min={70} max={120} step={5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-[#855300]" />
        </label>
        <div className="flex justify-between gap-2">
          <button type="button" className="btn-secondary" onClick={() => void signOut()}><Icon name="logout" /> Sign out</button>
          <button type="submit" className="btn-primary" disabled={update.isPending}>Save changes</button>
        </div>
      </form>

      <section className="rounded-xl border border-error/20 bg-error-container/30 p-6 md:p-8">
        <h2 className="font-serif text-headline-sm text-error">Delete account</h2>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Permanently removes your profile, mantras, journal, practice history, ripples and lights. This can’t be undone.
        </p>
        <button type="button" className="btn mt-4 bg-error text-white" onClick={() => setConfirmOpen(true)}>
          <Icon name="delete_forever" /> Delete my account
        </button>
      </section>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} label="Confirm account deletion" className="w-full max-w-md">
        <div className="rounded-lg bg-white p-6 shadow-2xl">
          <h2 className="font-serif text-headline-sm">Are you sure?</h2>
          <p className="mt-2 text-body-sm text-on-surface-variant">Type <b>DELETE</b> to confirm.</p>
          <input className="field mt-3 py-2.5" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Type DELETE to confirm" autoFocus />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button type="button" className="btn bg-error text-white" disabled={confirmText !== "DELETE" || deleting} onClick={() => void deleteAccount()}>
              Delete forever
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function Privacy() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-12 text-body-md">
      <h1 className="font-serif text-headline-lg-mobile md:text-headline-lg">Privacy notice</h1>
      <p>Lumina signs you in with Google using OpenID Connect. We receive your Google account ID, verified email, name and profile photo — nothing else, and no access to your Gmail or Drive.</p>
      <p>We store your mantras, journal entries, practice history and community ripples so the app works. Journal entries are visible only to you. Ripples you share are public to other members.</p>
      <p>Your session is held in a secure, HttpOnly cookie. We don’t use advertising or third-party tracking. All audio is generated in your browser; nothing is recorded or uploaded.</p>
      <p>You can delete your account and every piece of data linked to it at any time from <Link to="/account" className="text-primary underline">Account & preferences</Link>.</p>
    </article>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-5 py-24 text-center">
      <p className="font-serif text-display-hero text-primary-container">404</p>
      <h1 className="font-serif text-headline-md">This path hasn’t been walked yet.</h1>
      <Link to="/" className="btn-primary">Return to your sanctuary</Link>
    </div>
  );
}
