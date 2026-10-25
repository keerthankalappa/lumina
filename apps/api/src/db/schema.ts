import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey();
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable(
  "users",
  {
    id: id(),
    googleSub: text("google_sub").unique(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    soundscape: text("soundscape").notNull().default("morning-mist"),
    narrationRate: integer("narration_rate").notNull().default(90), // percent of normal speed
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    // SHA-256 of the opaque cookie token. The raw token is never stored.
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    csrfToken: text("csrf_token").notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const decks = sqliteTable("decks", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  theme: text("theme").notNull(), // e.g. "Compassion" — the cover tag
  description: text("description").notNull(),
  epigraph: text("epigraph").notNull(),
  guide: text("guide").notNull(),
  palette: text("palette").notNull(),
  audioMinutes: integer("audio_minutes").notNull(),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const affirmations = sqliteTable(
  "affirmations",
  {
    id: id(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    theme: text("theme").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("affirmations_deck_idx").on(t.deckId)],
);

export const dailyActions = sqliteTable("daily_actions", {
  id: id(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  karma: integer("karma").notNull().default(40),
});

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["deck", "affirmation"] }).notNull(),
    targetId: text("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId] })],
);

export const mantras = sqliteTable(
  "mantras",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    attribution: text("attribution").notNull().default(""),
    intent: text("intent").notNull(),
    palette: text("palette").notNull(),
    typography: text("typography").notNull(),
    aura: text("aura").notNull(),
    microAction: text("micro_action").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("mantras_user_idx").on(t.userId, t.createdAt)],
);

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mood: text("mood", { enum: ["grounded", "expansive", "gentle", "reflective", "determined"] }).notNull(),
    body: text("body").notNull(),
    rippleAction: text("ripple_action").notNull().default(""),
    entryDate: text("entry_date").notNull(), // YYYY-MM-DD in the user's local calendar
    createdAt: createdAt(),
  },
  (t) => [index("journal_user_idx").on(t.userId, t.createdAt)],
);

export const practices = sqliteTable(
  "practices",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    practiceDate: text("practice_date").notNull(), // YYYY-MM-DD
    actionId: text("action_id").notNull(),
    karma: integer("karma").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.practiceDate] })],
);

export const ripples = sqliteTable(
  "ripples",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category", { enum: ["environment", "kindness", "mentorship", "local"] }).notNull(),
    body: text("body").notNull(),
    mantraTag: text("mantra_tag").notNull().default(""),
    location: text("location").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("ripples_created_idx").on(t.createdAt), index("ripples_user_idx").on(t.userId)],
);

export const rippleLights = sqliteTable(
  "ripple_lights",
  {
    rippleId: text("ripple_id")
      .notNull()
      .references(() => ripples.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.rippleId, t.userId] })],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
