import { z } from "zod";

// ---------- Shared primitives ----------

/** Trimmed user-supplied text without control characters (newlines/tabs allowed). */
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    // eslint-disable-next-line no-control-regex
    .refine((s) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s), "Contains control characters");

export const LocalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .meta({ id: "LocalDate", description: "Calendar date in the user's time zone.", example: "2026-10-25" });

export const Uuid = z.uuid().meta({ example: "8b1c9f2e-7d4a-4f8a-9c1e-2b3d4e5f6a7b" });

export const Mood = z
  .enum(["grounded", "expansive", "gentle", "reflective", "determined"])
  .meta({ id: "Mood", description: "Prevailing inner state for a journal check-in." });

export const RippleCategory = z
  .enum(["environment", "kindness", "mentorship", "local"])
  .meta({ id: "RippleCategory" });

export const Palette = z
  .enum(["dawn-amber", "eucalyptus", "twilight", "solstice", "midnight"])
  .meta({ id: "Palette", description: "Atmosphere & colour field of a visual mantra card." });

export const Typography = z.enum(["playfair", "jakarta", "classical"]).meta({ id: "Typography" });

export const Aura = z.enum(["luminous-glow", "petal-waves", "starlight", "raw-parchment"]).meta({ id: "Aura" });

export const Soundscape = z
  .enum(["morning-mist", "singing-bowls", "temple-chimes", "pine-forest-rain", "binaural-432"])
  .meta({ id: "Soundscape", description: "Ambient soundscape synthesised client-side." });

export const Problem = z
  .object({
    type: z.string().meta({ example: "https://lumina.app/problems/validation_failed" }),
    title: z.string().meta({ example: "Unprocessable Content" }),
    status: z.number().int().meta({ example: 422 }),
    detail: z.string(),
    instance: z.string(),
    code: z.string().meta({ example: "validation_failed" }),
    requestId: z.string(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .meta({ id: "Problem", description: "RFC 9457 problem details." });

// ---------- Auth & account ----------

export const User = z
  .object({
    id: Uuid,
    email: z.email(),
    displayName: z.string(),
    avatarUrl: z.url().nullable(),
    soundscape: Soundscape,
    narrationRate: z.number().int().min(50).max(150),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "User" });

export const SessionInfo = z
  .object({
    user: User,
    csrfToken: z.string().meta({ description: "Send as the X-CSRF-Token header on every POST/PATCH/PUT/DELETE." }),
  })
  .meta({ id: "SessionInfo" });

export const AuthProviders = z
  .object({ google: z.boolean(), devLogin: z.boolean() })
  .meta({ id: "AuthProviders" });

export const UpdateProfileBody = z
  .object({
    displayName: text(1, 60).optional(),
    soundscape: Soundscape.optional(),
    narrationRate: z.number().int().min(50).max(150).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field")
  .meta({ id: "UpdateProfileBody" });

export const DevLoginBody = z
  .object({ email: z.email().max(254), displayName: text(1, 60).optional() })
  .strict()
  .meta({ id: "DevLoginBody" });

// ---------- Content ----------

export const Affirmation = z
  .object({ id: Uuid, deckId: Uuid, text: z.string(), theme: z.string(), position: z.number().int() })
  .meta({ id: "Affirmation" });

export const DailyAction = z
  .object({ id: z.string(), title: z.string(), description: z.string(), karma: z.number().int() })
  .meta({ id: "DailyAction" });

export const DeckSummary = z
  .object({
    id: Uuid,
    slug: z.string(),
    title: z.string(),
    category: z.string(),
    theme: z.string(),
    description: z.string(),
    epigraph: z.string(),
    guide: z.string(),
    palette: z.string(),
    audioMinutes: z.number().int(),
    cardCount: z.number().int(),
    featured: z.boolean(),
    bookmarked: z.boolean(),
  })
  .meta({ id: "DeckSummary" });

export const Deck = DeckSummary.extend({ affirmations: z.array(Affirmation) }).meta({ id: "Deck" });

export const DeckListQuery = z.object({
  q: z.string().trim().max(80).optional().meta({ description: "Full-text search over titles, themes and affirmations." }),
  category: z.string().trim().max(40).optional(),
});

export const DeckList = z
  .object({ items: z.array(DeckSummary), categories: z.array(z.object({ name: z.string(), count: z.number().int() })) })
  .meta({ id: "DeckList" });

export const DailyQuery = z.object({ date: LocalDate.optional() });

export const Daily = z
  .object({
    date: LocalDate,
    dayOfSeason: z.number().int(),
    affirmation: Affirmation,
    deck: z.object({ slug: z.string(), title: z.string(), theme: z.string(), guide: z.string() }),
    action: DailyAction,
    practiced: z.boolean().meta({ description: "Whether the signed-in user already practised today's action." }),
  })
  .meta({ id: "Daily" });

// ---------- Bookmarks ----------

export const BookmarkBody = z
  .object({ targetType: z.enum(["deck", "affirmation"]), targetId: Uuid })
  .strict()
  .meta({ id: "BookmarkBody" });

export const Bookmark = BookmarkBody.extend({ createdAt: z.iso.datetime() }).meta({ id: "Bookmark" });

// ---------- Mantras (studio) ----------

export const MantraBody = z
  .object({
    text: text(3, 280),
    attribution: text(0, 80).default(""),
    intent: text(1, 60),
    palette: Palette,
    typography: Typography,
    aura: Aura,
    microAction: text(0, 200).default(""),
  })
  .strict()
  .meta({ id: "MantraBody" });

export const MantraPatch = z
  .object({
    text: text(3, 280),
    attribution: text(0, 80),
    intent: text(1, 60),
    palette: Palette,
    typography: Typography,
    aura: Aura,
    microAction: text(0, 200),
  })
  .partial()
  .strict()
  .meta({ id: "MantraPatch" });

export const Mantra = z
  .object({
    id: Uuid,
    text: z.string(),
    attribution: z.string(),
    intent: z.string(),
    palette: Palette,
    typography: Typography,
    aura: Aura,
    microAction: z.string(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Mantra" });

// ---------- Journal ----------

export const JournalBody = z
  .object({ mood: Mood, body: text(1, 2000), rippleAction: text(0, 200).default(""), entryDate: LocalDate })
  .strict()
  .meta({ id: "JournalBody" });

export const JournalEntry = z
  .object({
    id: Uuid,
    mood: Mood,
    body: z.string(),
    rippleAction: z.string(),
    entryDate: LocalDate,
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "JournalEntry" });

export const JournalInsights = z
  .object({
    days: z.array(z.object({ date: LocalDate, mood: Mood.nullable() })).meta({ description: "Last 30 days, oldest first." }),
    distribution: z.array(z.object({ mood: Mood, percent: z.number().int() })),
    regularity: z.number().int().meta({ description: "Percent of the last 30 days with a check-in." }),
    totalEntries: z.number().int(),
  })
  .meta({ id: "JournalInsights" });

// ---------- Practice & stats ----------

export const PracticeBody = z
  .object({ actionId: z.string().min(1).max(64), localDate: LocalDate })
  .strict()
  .meta({ id: "PracticeBody" });

export const Badge = z
  .object({ id: z.string(), name: z.string(), description: z.string(), earned: z.boolean() })
  .meta({ id: "Badge" });

export const UserStats = z
  .object({
    streak: z.number().int(),
    actionsLogged: z.number().int(),
    karma: z.number().int(),
    ripplesShared: z.number().int(),
    lightsReceived: z.number().int(),
    mantrasCrafted: z.number().int(),
    journalEntries: z.number().int(),
    beaconLevel: z.number().int(),
    badges: z.array(Badge),
  })
  .meta({ id: "UserStats" });

export const CommunityStats = z
  .object({
    actionsPracticed: z.number().int(),
    ripplesShared: z.number().int(),
    lightsGiven: z.number().int(),
    practitioners: z.number().int(),
    practicedToday: z.number().int(),
    challenge: z.object({
      title: z.string(),
      goal: z.number().int(),
      progress: z.number().int(),
      endsOn: LocalDate,
    }),
  })
  .meta({ id: "CommunityStats" });

// ---------- Ripples ----------

export const RippleBody = z
  .object({
    category: RippleCategory,
    body: text(10, 600),
    mantraTag: text(0, 60).default(""),
    location: text(0, 80).default(""),
  })
  .strict()
  .meta({ id: "RippleBody" });

export const Ripple = z
  .object({
    id: Uuid,
    category: RippleCategory,
    body: z.string(),
    mantraTag: z.string(),
    location: z.string(),
    createdAt: z.iso.datetime(),
    author: z.object({ id: Uuid, displayName: z.string(), avatarUrl: z.url().nullable() }),
    lights: z.number().int(),
    litByMe: z.boolean(),
    mine: z.boolean(),
  })
  .meta({ id: "Ripple" });

export const RippleListQuery = z.object({
  category: RippleCategory.optional(),
  cursor: z.string().max(128).optional().meta({ description: "Opaque cursor from `nextCursor`." }),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const RippleList = z
  .object({ items: z.array(Ripple), nextCursor: z.string().nullable() })
  .meta({ id: "RippleList" });

export const LightResult = z.object({ lights: z.number().int(), litByMe: z.boolean() }).meta({ id: "LightResult" });

export const Health = z.object({ status: z.literal("ok"), time: z.iso.datetime() }).meta({ id: "Health" });

export const IdParam = z.object({ id: Uuid });
export const SlugParam = z.object({ slug: z.string().max(80) });
