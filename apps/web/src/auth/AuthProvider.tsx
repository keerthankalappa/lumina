import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { api, ApiProblem, setCsrfToken, unwrap, type Schemas } from "../api/client";

type AuthState = {
  user: Schemas["User"] | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export const sessionKey = ["session"] as const;

async function fetchSession() {
  try {
    const s = await unwrap(api.GET("/auth/session"));
    setCsrfToken(s.csrfToken);
    return s;
  } catch (e) {
    if (e instanceof ApiProblem && e.status === 401) {
      setCsrfToken(null);
      return null;
    }
    throw e;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const session = useQuery({ queryKey: sessionKey, queryFn: fetchSession, staleTime: 5 * 60_000, retry: 1 });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: sessionKey });
  }, [qc]);

  const signOut = useCallback(async () => {
    await api.POST("/auth/logout");
    setCsrfToken(null);
    qc.clear();
    window.location.assign("/");
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({ user: session.data?.user ?? null, loading: session.isLoading, signOut, refresh }),
    [session.data, session.isLoading, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Route guard: sends anonymous visitors to /login and brings them back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="mx-auto max-w-[1120px] px-5 py-24 text-center text-on-surface-variant">Opening your sanctuary…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
