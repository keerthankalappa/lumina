import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { dayIndex, dayOfSeason, toDateKey } from "@/lib/dates";
import { ApiError } from "@/lib/errors";

type DeckRow = typeof schema.decks.$inferSelect;

async function bookmarkedIds(userId: string | undefined, targetType: "deck" | "affirmation") {
  if (!userId) return new Set<string>();
  const rows = await db()
    .select({ id: schema.bookmarks.targetId })
    .from(schema.bookmarks)
    .where(and(eq(schema.bookmarks.userId, userId), eq(schema.bookmarks.targetType, targetType)));
  return new Set(rows.map((r) => r.id));
}

function deckDto(d: DeckRow, cardCount: number, bookmarked: boolean) {
  return { ...d, cardCount, bookmarked };
}

export async function listDecks(opts: { q?: string; category?: string; userId?: string }) {
  const counts = db()
    .select({ deckId: schema.affirmations.deckId, n: sql<number>`count(*)`.as("n") })
    .from(schema.affirmations)
    .groupBy(schema.affirmations.deckId)
    .as("counts");

  const rows = await db()
    .select({ deck: schema.decks, n: counts.n })
    .from(schema.decks)
    .leftJoin(counts, eq(counts.deckId, schema.decks.id))
    .orderBy(asc(schema.decks.sortOrder));

  let filtered = rows;
  if (opts.q) {
    const needle = opts.q.toLowerCase();
    const matchingDeckIds = new Set(
      (
        await db()
          .select({ deckId: schema.affirmations.deckId })
          .from(schema.affirmations)
          // instr() is a plain substring search: no LIKE wildcards to escape.
          .where(sql`instr(lower(${schema.affirmations.text}), ${needle}) > 0`)
      ).map((r) => r.deckId),
    );
    filtered = filtered.filter(
      ({ deck }) =>
        matchingDeckIds.has(deck.id) ||
        [deck.title, deck.theme, deck.category, deck.description, deck.guide].some((f) => f.toLowerCase().includes(needle)),
    );
  }

  const categories = new Map<string, number>();
  for (const { deck } of filtered) categories.set(deck.category, (categories.get(deck.category) ?? 0) + 1);
  if (opts.category) filtered = filtered.filter(({ deck }) => deck.category === opts.category);

  const marks = await bookmarkedIds(opts.userId, "deck");
  return {
    items: filtered.map(({ deck, n }) => deckDto(deck, Number(n ?? 0), marks.has(deck.id))),
    categories: [...categories].map(([name, count]) => ({ name, count })),
  };
}

export async function getDeck(slug: string, userId?: string) {
  const deck = await db().query.decks.findFirst({ where: eq(schema.decks.slug, slug) });
  if (!deck) throw ApiError.notFound("Deck");
  const affirmations = await db()
    .select()
    .from(schema.affirmations)
    .where(eq(schema.affirmations.deckId, deck.id))
    .orderBy(asc(schema.affirmations.position));
  const marks = await bookmarkedIds(userId, "deck");
  return { ...deckDto(deck, affirmations.length, marks.has(deck.id)), affirmations };
}

export async function getDaily(dateKey: string | undefined, userId?: string) {
  const date = dateKey ?? toDateKey(new Date());
  const idx = dayIndex(date);

  const all = await db()
    .select({ a: schema.affirmations, d: schema.decks })
    .from(schema.affirmations)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.affirmations.deckId))
    .orderBy(asc(schema.affirmations.id));
  const actions = await db().select().from(schema.dailyActions).orderBy(asc(schema.dailyActions.id));
  if (!all.length || !actions.length) throw ApiError.notFound("Daily content");

  // Multiplicative hash spreads consecutive days across decks instead of walking one deck in order.
  const pick = all[(idx * 7919) % all.length]!;
  const action = actions[idx % actions.length]!;

  let practiced = false;
  if (userId) {
    const row = await db().query.practices.findFirst({
      where: and(eq(schema.practices.userId, userId), eq(schema.practices.practiceDate, date)),
    });
    practiced = Boolean(row);
  }
  return {
    date,
    dayOfSeason: dayOfSeason(date),
    affirmation: pick.a,
    deck: { slug: pick.d.slug, title: pick.d.title, theme: pick.d.theme, guide: pick.d.guide },
    action,
    practiced,
  };
}
