import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { ApiProblem } from "./api/client";
import { AudioProvider, useAudio } from "./audio/AudioProvider";
import type { SoundscapeId } from "./audio/ambient";
import { AuthProvider, RequireAuth, useAuth } from "./auth/AuthProvider";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/ui";
import "./index.css";
import { Account, Login, NotFound, Privacy, Welcome } from "./pages/Auth";
import { Gallery } from "./pages/Gallery";
import { Ripple } from "./pages/Ripple";
import { Sanctuary } from "./pages/Sanctuary";
import { Studio } from "./pages/Studio";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (401/404/422…) — only transient failures.
      retry: (count, err) => !(err instanceof ApiProblem && err.status < 500) && count < 2,
    },
  },
});

/** Applies the signed-in user's saved audio preferences to the player. */
function PreferenceSync() {
  const { user } = useAuth();
  const { setSoundscape, setRate } = useAudio();
  useEffect(() => {
    if (!user) return;
    setSoundscape(user.soundscape as SoundscapeId);
    setRate(user.narrationRate / 100);
  }, [user, setSoundscape, setRate]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AudioProvider>
            <ToastProvider>
              <PreferenceSync />
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Sanctuary />} />
                  <Route path="gallery" element={<Gallery />} />
                  <Route path="gallery/:slug" element={<Gallery />} />
                  <Route path="ripple" element={<Ripple />} />
                  <Route path="studio" element={<RequireAuth><Studio /></RequireAuth>} />
                  <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
                  <Route path="welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
                  <Route path="login" element={<Login />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </ToastProvider>
          </AudioProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
