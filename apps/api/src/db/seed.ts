import { and, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { seedActions, seedDecks, seedRipples } from "@/db/seed-data";
import { newId } from "@/lib/crypto";

const SYSTEM_EMAIL = "stories@lumina.invalid";

/** Idempotent: decks/actions are upserted by natural key; sample stories only on first run. */
export async function seed() {
  for (const [i, d] of seedDecks.entries()) {
    const { affirmations, ...deck } = d;
    const existing = await db().query.decks.findFirst({ where: eq(schema.decks.slug, d.slug) });
    const id = existing?.id ?? newId();
    const values = { ...deck, featured: deck.featured ?? false, sortOrder: i };
    if (existing) await db().update(schema.decks).set(values).where(eq(schema.decks.id, id));
    else await db().insert(schema.decks).values({ id, ...values });

    // Keep affirmation ids stable across re-seeds so bookmarks stay valid.
    const current = await db().select().from(schema.affirmations).where(eq(schema.affirmations.deckId, id));
    const byPosition = new Map(current.map((a) => [a.position, a]));
    for (const [position, text] of affirmations.entries()) {
      const row = byPosition.get(position);
      if (row) await db().update(schema.affirmations).set({ text, theme: deck.theme }).where(eq(schema.affirmations.id, row.id));
      else await db().insert(schema.affirmations).values({ id: newId(), deckId: id, text, theme: deck.theme, position });
    }
    await db()
      .delete(schema.affirmations)
      .where(and(eq(schema.affirmations.deckId, id), gte(schema.affirmations.position, affirmations.length)));
  }
  for (const a of seedActions) {
    await db().insert(schema.dailyActions).values(a).onConflictDoUpdate({ target: schema.dailyActions.id, set: a });
  }

  const system = await db().query.users.findFirst({ where: eq(schema.users.email, SYSTEM_EMAIL) });
  if (!system) {
    const id = newId();
    await db().insert(schema.users).values({ id, email: SYSTEM_EMAIL, displayName: "Lumina Stories", isSystem: true });
    const now = Date.now();
    await db()
      .insert(schema.ripples)
      .values(seedRipples.map((r, i) => ({ id: newId(), userId: id, ...r, createdAt: new Date(now - (i + 1) * 3_600_000) })));
  }
  return { decks: seedDecks.length, actions: seedActions.length };
}
