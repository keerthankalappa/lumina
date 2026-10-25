import { and, count, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db, schema } from "@/db/client";
import { newId } from "@/lib/crypto";
import { addDays, assertPlausibleLocalDate, toDateKey } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import type { RippleBody } from "@/openapi/schemas";

// ---------- Practice ----------

export async function recordPractice(userId: string, actionId: string, localDate: string) {
  const date = assertPlausibleLocalDate(localDate);
  const action = await db().query.dailyActions.findFirst({ where: eq(schema.dailyActions.id, actionId) });
  if (!action) throw ApiError.notFound("Action");
  const inserted = await db()
    .insert(schema.practices)
    .values({ userId, practiceDate: date, actionId, karma: action.karma })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) throw ApiError.conflict("You have already practised today’s action.");
  return userStats(userId, date);
}

/** Consecutive days with a practice, ending today (or yesterday if today isn't done yet). */
function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function userStats(userId: string, today = toDateKey(new Date())) {
  const [practiceRows, rippleRows, [lights], [mantras], [journal]] = await Promise.all([
    db().select({ date: schema.practices.practiceDate, karma: schema.practices.karma }).from(schema.practices).where(eq(schema.practices.userId, userId)),
    db().select({ category: schema.ripples.category }).from(schema.ripples).where(eq(schema.ripples.userId, userId)),
    db()
      .select({ n: count() })
      .from(schema.rippleLights)
      .innerJoin(schema.ripples, eq(schema.ripples.id, schema.rippleLights.rippleId))
      .where(eq(schema.ripples.userId, userId)),
    db().select({ n: count() }).from(schema.mantras).where(eq(schema.mantras.userId, userId)),
    db().select({ n: count() }).from(schema.journalEntries).where(eq(schema.journalEntries.userId, userId)),
  ]);

  const streak = computeStreak(practiceRows.map((p) => p.date), today);
  const karma = practiceRows.reduce((s, p) => s + p.karma, 0);
  const byCategory = (c: string) => rippleRows.filter((r) => r.category === c).length;
  const lightsReceived = lights?.n ?? 0;
  const badges = [
    { id: "first-light", name: "First Light", description: "Practised your first daily action", earned: practiceRows.length >= 1 },
    { id: "dawn-catalyst", name: "Dawn Catalyst", description: "7-day practice streak", earned: streak >= 7 },
    { id: "earth-steward", name: "Earth Steward", description: "Shared 5 environmental ripples", earned: byCategory("environment") >= 5 },
    { id: "bridge-builder", name: "Bridge Builder", description: "Shared 3 acts of kindness", earned: byCategory("kindness") >= 3 },
    { id: "studio-artisan", name: "Studio Artisan", description: "Crafted 3 personal mantras", earned: (mantras?.n ?? 0) >= 3 },
    { id: "reflective-soul", name: "Reflective Soul", description: "Wrote 10 journal reflections", earned: (journal?.n ?? 0) >= 10 },
  ];
  return {
    streak,
    actionsLogged: practiceRows.length,
    karma,
    ripplesShared: rippleRows.length,
    lightsReceived,
    mantrasCrafted: mantras?.n ?? 0,
    journalEntries: journal?.n ?? 0,
    beaconLevel: 1 + Math.floor((practiceRows.length + rippleRows.length * 2 + lightsReceived) / 10),
    badges,
  };
}

// ---------- Ripples ----------

const CHALLENGE = { title: "The Neighborhood Kindness Wave", goal: 10_000 };

function encodeCursor(createdAt: Date, id: string) {
  return Buffer.from(`${createdAt.getTime()}:${id}`).toString("base64url");
}
function decodeCursor(cursor: string): { t: number; id: string } | null {
  const [t, id] = Buffer.from(cursor, "base64url").toString().split(":");
  const n = Number(t);
  return Number.isFinite(n) && id ? { t: n, id } : null;
}

export async function listRipples(opts: { category?: string; cursor?: string; limit: number; viewerId?: string }) {
  const cur = opts.cursor ? decodeCursor(opts.cursor) : null;
  if (opts.cursor && !cur) throw ApiError.badRequest("Invalid cursor.");

  const where = and(
    opts.category ? eq(schema.ripples.category, opts.category as never) : undefined,
    cur
      ? or(
          lt(schema.ripples.createdAt, new Date(cur.t)),
          and(eq(schema.ripples.createdAt, new Date(cur.t)), lt(schema.ripples.id, cur.id)),
        )
      : undefined,
  );
  const rows = await db()
    .select({ r: schema.ripples, u: { id: schema.users.id, displayName: schema.users.displayName, avatarUrl: schema.users.avatarUrl } })
    .from(schema.ripples)
    .innerJoin(schema.users, eq(schema.users.id, schema.ripples.userId))
    .where(where)
    .orderBy(desc(schema.ripples.createdAt), desc(schema.ripples.id))
    .limit(opts.limit + 1);

  const page = rows.slice(0, opts.limit);
  const ids = page.map((p) => p.r.id);
  const lightCounts = ids.length
    ? await db()
        .select({ id: schema.rippleLights.rippleId, n: count() })
        .from(schema.rippleLights)
        .where(inArray(schema.rippleLights.rippleId, ids))
        .groupBy(schema.rippleLights.rippleId)
    : [];
  const mine =
    ids.length && opts.viewerId
      ? await db()
          .select({ id: schema.rippleLights.rippleId })
          .from(schema.rippleLights)
          .where(and(inArray(schema.rippleLights.rippleId, ids), eq(schema.rippleLights.userId, opts.viewerId)))
      : [];
  const countMap = new Map(lightCounts.map((l) => [l.id, l.n]));
  const litSet = new Set(mine.map((m) => m.id));
  const last = page.at(-1);
  return {
    items: page.map(({ r, u }) => ({
      id: r.id,
      category: r.category,
      body: r.body,
      mantraTag: r.mantraTag,
      location: r.location,
      createdAt: r.createdAt.toISOString(),
      author: u,
      lights: countMap.get(r.id) ?? 0,
      litByMe: litSet.has(r.id),
      mine: r.userId === opts.viewerId,
    })),
    nextCursor: rows.length > opts.limit && last ? encodeCursor(last.r.createdAt, last.r.id) : null,
  };
}

export async function createRipple(userId: string, body: z.infer<typeof RippleBody>) {
  const [r] = await db().insert(schema.ripples).values({ id: newId(), userId, ...body }).returning();
  const author = await db().query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, displayName: true, avatarUrl: true },
  });
  return {
    id: r!.id,
    category: r!.category,
    body: r!.body,
    mantraTag: r!.mantraTag,
    location: r!.location,
    createdAt: r!.createdAt.toISOString(),
    author: author!,
    lights: 0,
    litByMe: false,
    mine: true,
  };
}

export async function deleteRipple(userId: string, id: string) {
  const res = await db()
    .delete(schema.ripples)
    .where(and(eq(schema.ripples.id, id), eq(schema.ripples.userId, userId)))
    .returning({ id: schema.ripples.id });
  if (!res.length) throw ApiError.notFound("Ripple");
}

export async function setLight(userId: string, rippleId: string, on: boolean) {
  const ripple = await db().query.ripples.findFirst({ where: eq(schema.ripples.id, rippleId), columns: { userId: true } });
  if (!ripple) throw ApiError.notFound("Ripple");
  if (ripple.userId === userId) throw ApiError.forbidden("You can’t send light to your own ripple.");
  if (on) await db().insert(schema.rippleLights).values({ rippleId, userId }).onConflictDoNothing();
  else
    await db()
      .delete(schema.rippleLights)
      .where(and(eq(schema.rippleLights.rippleId, rippleId), eq(schema.rippleLights.userId, userId)));
  const [row] = await db().select({ n: count() }).from(schema.rippleLights).where(eq(schema.rippleLights.rippleId, rippleId));
  return { lights: row?.n ?? 0, litByMe: on };
}

export async function communityStats() {
  const today = toDateKey(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${monthStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  const [[actions], [ripples], [lights], [people], [todayCount], [monthRipples], [monthActions]] = await Promise.all([
    db().select({ n: count() }).from(schema.practices),
    db().select({ n: count() }).from(schema.ripples),
    db().select({ n: count() }).from(schema.rippleLights),
    db().select({ n: count() }).from(schema.users).where(eq(schema.users.isSystem, false)),
    db().select({ n: count() }).from(schema.practices).where(eq(schema.practices.practiceDate, today)),
    db().select({ n: count() }).from(schema.ripples).where(sql`${schema.ripples.createdAt} >= ${Date.parse(`${monthStart}T00:00:00Z`)}`),
    db().select({ n: count() }).from(schema.practices).where(sql`${schema.practices.practiceDate} >= ${monthStart}`),
  ]);
  return {
    actionsPracticed: actions?.n ?? 0,
    ripplesShared: ripples?.n ?? 0,
    lightsGiven: lights?.n ?? 0,
    practitioners: people?.n ?? 0,
    practicedToday: todayCount?.n ?? 0,
    challenge: {
      ...CHALLENGE,
      progress: (monthRipples?.n ?? 0) + (monthActions?.n ?? 0),
      endsOn: addDays(toDateKey(nextMonth), -1),
    },
  };
}
