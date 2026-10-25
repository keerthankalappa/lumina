import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useStats } from "../api/hooks";
import { SOUNDSCAPES } from "../audio/ambient";
import { useAudio } from "../audio/AudioProvider";
import { useAuth } from "../auth/AuthProvider";
import { NowPlayingBar } from "./NowPlayingBar";
import { SoundSanctuary } from "./SoundSanctuary";
import { Avatar, Icon } from "./ui";

const NAV = [
  { to: "/", label: "Daily Sanctuary", end: true },
  { to: "/gallery", label: "Wisdom Gallery" },
  { to: "/ripple", label: "Ripple & Impact" },
  { to: "/studio", label: "Mindset Studio" },
];

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Lumina home">
      <img src="/favicon.svg" alt="" className="h-8 w-8 transition-transform group-hover:rotate-12" />
      <span className="flex flex-col">
        <span className="font-serif text-headline-sm leading-none text-on-surface">Lumina</span>
        <span className="pt-1 text-[9px] font-bold uppercase leading-none tracking-[0.18em] text-primary">Mindset to Impact</span>
      </span>
    </Link>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (!user) {
    return (
      <Link to="/login" className="btn-primary px-4 py-2 text-label-md">
        Sign in
      </Link>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-0.5 ring-2 ring-secondary/40 transition-all hover:ring-secondary"
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size={32} />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-surface" />
      </button>
      {open && (
        <div role="menu" className="sheet absolute right-0 top-12 w-60 animate-rise rounded-md p-2">
          <div className="px-3 py-2">
            <p className="text-label-lg text-on-surface">{user.displayName}</p>
            <p className="truncate text-body-sm text-on-surface-variant">{user.email}</p>
          </div>
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-sm px-3 py-2 text-label-lg hover:bg-surface-container-low">
            <Icon name="tune" /> Account & preferences
          </Link>
          <a role="menuitem" href="/api/docs" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm px-3 py-2 text-label-lg hover:bg-surface-container-low">
            <Icon name="api" /> API reference
          </a>
          <button role="menuitem" type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-label-lg text-error hover:bg-error-container/50">
            <Icon name="logout" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const { soundscape, ambientOn, toggleAmbient } = useAudio();
  const { user } = useAuth();
  const stats = useStats();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  const scape = SOUNDSCAPES.find((s) => s.id === soundscape)!;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1120px] items-center justify-between gap-3 px-5 md:px-10">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3.5 py-2 text-label-md transition-all ${
                    isActive
                      ? "bg-primary-container font-bold text-white shadow-[0_4px_16px_-4px_rgba(245,158,11,0.3)]"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAmbient}
            aria-pressed={ambientOn}
            title={ambientOn ? "Pause ambient soundscape" : "Play ambient soundscape"}
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-container-low px-3.5 py-2 text-label-md transition-all hover:bg-surface-container md:flex"
          >
            <Icon name={ambientOn ? "graphic_eq" : "music_note"} className="text-secondary" size={18} />
            {scape.name}
            <span className={`h-2 w-2 rounded-full ${ambientOn ? "animate-pulse bg-secondary" : "bg-outline-variant"}`} />
          </button>
          {user && (
            <div className="hidden items-center gap-1.5 rounded-full bg-surface-container-low px-3.5 py-2 text-label-md xl:flex" title="Consecutive days with a practised action">
              <Icon name="local_fire_department" className="text-primary" size={18} />
              <span className="whitespace-nowrap">{stats.data?.streak ?? 0}-Day Ripple Streak</span>
            </div>
          )}
          <UserMenu />
          <button
            type="button"
            className="icon-btn lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Icon name={mobileOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t border-slate-900/5 bg-surface px-5 pb-5 lg:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `block rounded-md px-4 py-3 text-label-lg ${isActive ? "bg-primary-fixed text-on-primary-fixed" : "text-on-surface-variant"}`}
            >
              {n.label}
            </NavLink>
          ))}
          <button type="button" onClick={toggleAmbient} className="mt-2 flex w-full items-center gap-2 rounded-md px-4 py-3 text-label-lg text-secondary">
            <Icon name="graphic_eq" /> {ambientOn ? "Pause" : "Play"} {scape.name}
          </button>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 bg-surface-container-lowest py-14">
      <div className="mx-auto grid max-w-[1120px] gap-10 px-5 md:grid-cols-3 md:px-10">
        <div>
          <p className="font-serif text-headline-sm">Lumina</p>
          <p className="mt-2 max-w-xs text-body-sm text-on-surface-variant">
            An editorial sanctuary for intentional living, daily affirmations, and purposeful community momentum.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-3 text-label-md">
          <Link to="/" className="hover:text-primary">Sanctuary</Link>
          <Link to="/gallery" className="hover:text-primary">Wisdom</Link>
          <Link to="/ripple" className="hover:text-primary">Ripple Effect</Link>
          <Link to="/studio" className="hover:text-primary">Studio</Link>
          <a href="/api/docs" className="hover:text-primary">API Reference</a>
          <Link to="/privacy" className="hover:text-primary">Privacy</Link>
        </nav>
        <p className="text-body-sm text-on-surface-variant md:text-right">
          © {new Date().getFullYear()} Lumina Mindset Studio.
          <br />
          Audio is synthesised in your browser — nothing is recorded.
        </p>
      </div>
    </footer>
  );
}

export function Layout() {
  const { track } = useAudio();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className={`flex-1 pt-20 ${track ? "pb-28" : ""}`}>
        <Outlet />
      </main>
      <Footer />
      <NowPlayingBar />
      <SoundSanctuary />
    </div>
  );
}
