import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db, schema } from "@/db/client";
import type { User } from "@/db/schema";
import { newId } from "@/lib/crypto";
import type { GoogleProfile } from "@/lib/google";
import type { UpdateProfileBody } from "@/openapi/schemas";

export function toUserDto(u: User) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    soundscape: u.soundscape as never,
    narrationRate: u.narrationRate,
    createdAt: u.createdAt.toISOString(),
  };
}

/**
 * Finds the account for a Google identity, or registers a new one. An existing account with the
 * same verified email (e.g. created via dev login) is linked to the Google subject.
 */
export async function upsertGoogleUser(p: GoogleProfile): Promise<{ user: User; created: boolean }> {
  const bySub = await db().query.users.findFirst({ where: eq(schema.users.googleSub, p.sub) });
  if (bySub) {
    const [user] = await db()
      .update(schema.users)
      .set({ email: p.email, emailVerified: true, avatarUrl: p.picture, updatedAt: new Date() })
      .where(eq(schema.users.id, bySub.id))
      .returning();
    return { user: user!, created: false };
  }
  const byEmail = await db().query.users.findFirst({ where: eq(schema.users.email, p.email) });
  if (byEmail && !byEmail.isSystem) {
    const [user] = await db()
      .update(schema.users)
      .set({ googleSub: p.sub, emailVerified: true, avatarUrl: byEmail.avatarUrl ?? p.picture, updatedAt: new Date() })
      .where(eq(schema.users.id, byEmail.id))
      .returning();
    return { user: user!, created: false };
  }
  const [user] = await db()
    .insert(schema.users)
    .values({ id: newId(), googleSub: p.sub, email: p.email, emailVerified: true, displayName: p.name, avatarUrl: p.picture })
    .returning();
  return { user: user!, created: true };
}

export async function upsertDevUser(email: string, displayName?: string) {
  const normalized = email.toLowerCase();
  const existing = await db().query.users.findFirst({ where: eq(schema.users.email, normalized) });
  if (existing) return { user: existing, created: false };
  const [user] = await db()
    .insert(schema.users)
    .values({ id: newId(), email: normalized, displayName: displayName ?? normalized.split("@")[0]! })
    .returning();
  return { user: user!, created: true };
}

export async function updateProfile(userId: string, patch: z.infer<typeof UpdateProfileBody>) {
  const [user] = await db()
    .update(schema.users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.users.id, userId))
    .returning();
  return user!;
}

/** Permanently deletes the account; all owned rows cascade. */
export async function deleteAccount(userId: string) {
  await db().run("PRAGMA foreign_keys = ON");
  await db().delete(schema.users).where(eq(schema.users.id, userId));
}
