import { and, desc, eq, gte } from "drizzle-orm";
import type { z } from "zod";
import { db, schema } from "@/db/client";
import { newId } from "@/lib/crypto";
import { addDays, toDateKey } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import type { BookmarkBody, JournalBody, MantraBody, MantraPatch } from "@/openapi/schemas";

// ---------- Bookmarks ----------

export async function listBookmarks(userId: string) {
  const rows = await db()
    .select()
    .from(schema.bookmarks)
    .where(eq(schema.bookmarks.userId, userId))
    .orderBy(desc(schema.bookmarks.createdAt));
  return rows.map((r) => ({ targetType: r.targetType, targetId: r.targetId, createdAt: r.createdAt.toISOString() }));
}

export async function addBookmark(userId: string, b: z.infer<typeof BookmarkBody>) {
  const table = b.targetType === "deck" ? schema.decks : schema.affirmations;
  const exists = await db().select({ id: table.id }).from(table).where(eq(table.id, b.targetId)).limit(1);
  if (!exists.length) throw ApiError.notFound(b.targetType === "deck" ? "Deck" : "Affirmation");
  await db()
    .insert(schema.bookmarks)
    .values({ userId, ...b })
    .onConflictDoNothing();
}

export async function removeBookmark(userId: string, b: z.infer<typeof BookmarkBody>) {
  await db()
    .delete(schema.bookmarks)
    .where(
      and(
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.targetType, b.targetType),
        eq(schema.bookmarks.targetId, b.targetId),
      ),
    );
}

// ---------- Mantras ----------

type MantraRow = typeof schema.mantras.$inferSelect;
const mantraDto = (m: MantraRow) => {
  const { userId: _owner, ...rest } = m;
  return { ...rest, palette: m.palette as never, typography: m.typography as never, aura: m.aura as never, createdAt: m.createdAt.toISOString() };
};

export async function listMantras(userId: string) {
  const rows = await db()
    .select()
    .from(schema.mantras)
    .where(eq(schema.mantras.userId, userId))
    .orderBy(desc(schema.mantras.createdAt))
    .limit(100);
  return rows.map(mantraDto);
}

async function ownedMantra(userId: string, id: string) {
  const m = await db().query.mantras.findFirst({ where: and(eq(schema.mantras.id, id), eq(schema.mantras.userId, userId)) });
  // Same 404 whether it doesn't exist or belongs to someone else — no ID probing.
  if (!m) throw ApiError.notFound("Mantra");
  return m;
}

export async function getMantra(userId: string, id: string) {
  return mantraDto(await ownedMantra(userId, id));
}

export async function createMantra(userId: string, body: z.infer<typeof MantraBody>) {
  const [m] = await db().insert(schema.mantras).values({ id: newId(), userId, ...body }).returning();
  return mantraDto(m!);
}

export async function updateMantra(userId: string, id: string, patch: z.infer<typeof MantraPatch>) {
  await ownedMantra(userId, id);
  const [m] = await db().update(schema.mantras).set(patch).where(eq(schema.mantras.id, id)).returning();
  return mantraDto(m!);
}

export async function deleteMantra(userId: string, id: string) {
  await ownedMantra(userId, id);
  await db().delete(schema.mantras).where(eq(schema.mantras.id, id));
}

// ---------- Journal ----------

type JournalRow = typeof schema.journalEntries.$inferSelect;
const journalDto = (j: JournalRow) => {
  const { userId: _owner, ...rest } = j;
  return { ...rest, createdAt: j.createdAt.toISOString() };
};

export async function listJournal(userId: string, limit = 50) {
  const rows = await db()
    .select()
    .from(schema.journalEntries)
    .where(eq(schema.journalEntries.userId, userId))
    .orderBy(desc(schema.journalEntries.createdAt))
    .limit(limit);
  return rows.map(journalDto);
}

export async function createJournal(userId: string, body: z.infer<typeof JournalBody>) {
  const [j] = await db().insert(schema.journalEntries).values({ id: newId(), userId, ...body }).returning();
  return journalDto(j!);
}

export async function deleteJournal(userId: string, id: string) {
  const res = await db()
    .delete(schema.journalEntries)
    .where(and(eq(schema.journalEntries.id, id), eq(schema.journalEntries.userId, userId)))
    .returning({ id: schema.journalEntries.id });
  if (!res.length) throw ApiError.notFound("Journal entry");
}

const MOODS = ["grounded", "expansive", "gentle", "reflective", "determined"] as const;

export async function journalInsights(userId: string, today = toDateKey(new Date())) {
  const from = addDays(today, -29);
  const rows = await db()
    .select({ mood: schema.journalEntries.mood, date: schema.journalEntries.entryDate })
    .from(schema.journalEntries)
    .where(and(eq(schema.journalEntries.userId, userId), gte(schema.journalEntries.entryDate, from)))
    .orderBy(desc(schema.journalEntries.createdAt));

  const latestByDay = new Map<string, (typeof MOODS)[number]>();
  for (const r of rows) if (!latestByDay.has(r.date)) latestByDay.set(r.date, r.mood);

  const days = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(from, i);
    return { date, mood: latestByDay.get(date) ?? null };
  });
  const counts = Object.fromEntries(MOODS.map((m) => [m, 0])) as Record<(typeof MOODS)[number], number>;
  for (const r of rows) counts[r.mood] += 1;
  const total = rows.length;
  return {
    days,
    distribution: MOODS.map((mood) => ({ mood, percent: total ? Math.round((counts[mood] / total) * 100) : 0 })),
    regularity: Math.round((latestByDay.size / 30) * 100),
    totalEntries: total,
  };
}
