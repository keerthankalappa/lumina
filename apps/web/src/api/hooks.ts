import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { api, localDate, unwrap, type Schemas } from "./client";

export const keys = {
  daily: (date: string, authed: boolean) => ["daily", date, authed] as const,
  decks: (q: string, category: string) => ["decks", q, category] as const,
  deck: (slug: string) => ["deck", slug] as const,
  stats: ["me", "stats"] as const,
  community: ["community"] as const,
  ripples: (category: string) => ["ripples", category] as const,
  mantras: ["mantras"] as const,
  journal: ["journal"] as const,
  insights: ["journal", "insights"] as const,
};

export function useDaily() {
  const { user } = useAuth();
  const date = localDate();
  return useQuery({
    queryKey: keys.daily(date, Boolean(user)),
    queryFn: () => unwrap(api.GET("/daily", { params: { query: { date } } })),
  });
}

export function useDecks(q: string, category: string) {
  return useQuery({
    queryKey: keys.decks(q, category),
    queryFn: () => unwrap(api.GET("/decks", { params: { query: { q: q || undefined, category: category || undefined } } })),
    placeholderData: (prev) => prev,
  });
}

export function useDeck(slug: string | undefined) {
  return useQuery({
    queryKey: keys.deck(slug ?? ""),
    queryFn: () => unwrap(api.GET("/decks/{slug}", { params: { path: { slug: slug! } } })),
    enabled: Boolean(slug),
  });
}

export function useStats() {
  const { user } = useAuth();
  return useQuery({ queryKey: keys.stats, queryFn: () => unwrap(api.GET("/me/stats")), enabled: Boolean(user) });
}

export function useCommunity() {
  return useQuery({ queryKey: keys.community, queryFn: () => unwrap(api.GET("/community/stats")), refetchInterval: 60_000 });
}

export function useRipples(category: Schemas["RippleCategory"] | "") {
  return useInfiniteQuery({
    queryKey: keys.ripples(category),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      unwrap(api.GET("/ripples", { params: { query: { category: category || undefined, cursor: pageParam, limit: 10 } } })),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useMantras() {
  const { user } = useAuth();
  return useQuery({ queryKey: keys.mantras, queryFn: () => unwrap(api.GET("/mantras")), enabled: Boolean(user) });
}

export function useJournal() {
  const { user } = useAuth();
  return useQuery({ queryKey: keys.journal, queryFn: () => unwrap(api.GET("/journal")), enabled: Boolean(user) });
}

export function useInsights() {
  const { user } = useAuth();
  return useQuery({ queryKey: keys.insights, queryFn: () => unwrap(api.GET("/journal/insights")), enabled: Boolean(user) });
}

// ---------- Mutations ----------

export function usePractice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => unwrap(api.POST("/practice", { body: { actionId, localDate: localDate() } })),
    onSuccess: (stats) => {
      qc.setQueryData(keys.stats, stats);
      void qc.invalidateQueries({ queryKey: ["daily"] });
      void qc.invalidateQueries({ queryKey: keys.community });
    },
  });
}

export function useBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetType, targetId, on }: { targetType: "deck" | "affirmation"; targetId: string; on: boolean }) => {
      if (on) await unwrap(api.POST("/bookmarks", { body: { targetType, targetId } }));
      else await unwrap(api.DELETE("/bookmarks/{targetType}/{targetId}", { params: { path: { targetType, targetId } } }));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["decks"] });
      void qc.invalidateQueries({ queryKey: ["deck"] });
    },
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<Schemas["JournalBody"], "entryDate">) =>
      unwrap(api.POST("/journal", { body: { ...body, entryDate: localDate() } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["journal"] });
      void qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useDeleteJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE("/journal/{id}", { params: { path: { id } } })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["journal"] }),
  });
}

export function useSaveMantra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Schemas["MantraBody"] & { id?: string }) =>
      id
        ? unwrap(api.PATCH("/mantras/{id}", { params: { path: { id } }, body }))
        : unwrap(api.POST("/mantras", { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.mantras });
      void qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useDeleteMantra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE("/mantras/{id}", { params: { path: { id } } })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.mantras }),
  });
}

export function useCreateRipple() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["RippleBody"]) => unwrap(api.POST("/ripples", { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ripples"] });
      void qc.invalidateQueries({ queryKey: keys.community });
      void qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useDeleteRipple() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE("/ripples/{id}", { params: { path: { id } } })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ripples"] }),
  });
}

export function useLight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      on
        ? unwrap(api.PUT("/ripples/{id}/light", { params: { path: { id } } }))
        : unwrap(api.DELETE("/ripples/{id}/light", { params: { path: { id } } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ripples"] });
      void qc.invalidateQueries({ queryKey: keys.community });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["UpdateProfileBody"]) => unwrap(api.PATCH("/me", { body })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["session"] }),
  });
}
