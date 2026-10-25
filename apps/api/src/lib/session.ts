import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db/client";
import type { User } from "@/db/schema";
import { env } from "@/env";
import { randomToken, sha256 } from "./crypto";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** `__Host-` prefix forces Secure, Path=/ and no Domain — only possible over HTTPS. */
export const sessionCookieName = () => (env().isProd ? "__Host-lumina_session" : "lumina_session");

export type AuthContext = { user: User; sessionId: string; csrfToken: string };

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${sessionCookieName()}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (env().isProd) parts.push("Secure");
  return parts.join("; ");
}

export const clearSessionCookie = () => sessionCookie("", 0);

export async function createSession(userId: string, userAgent: string | null) {
  const token = randomToken(32);
  const now = Date.now();
  const row = {
    id: sha256(token),
    userId,
    csrfToken: randomToken(24),
    userAgent: userAgent?.slice(0, 256) ?? null,
    lastSeenAt: new Date(now),
    expiresAt: new Date(now + SESSION_TTL_MS),
  };
  await db().insert(schema.sessions).values(row);
  // Opportunistic cleanup of this user's expired sessions.
  await db()
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), lt(schema.sessions.expiresAt, new Date(now))));
  return { token, cookie: sessionCookie(token, SESSION_TTL_MS / 1000), csrfToken: row.csrfToken };
}

export async function resolveSession(token: string | undefined): Promise<AuthContext | null> {
  if (!token || token.length > 128) return null;
  const id = sha256(token);
  const now = Date.now();
  const rows = await db()
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date(now))))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  // Sliding expiration, written at most once per day per session.
  if (now - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db()
      .update(schema.sessions)
      .set({ lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_TTL_MS) })
      .where(eq(schema.sessions.id, id));
  }
  return { user: row.user, sessionId: id, csrfToken: row.session.csrfToken };
}

export async function destroySession(sessionId: string) {
  await db().delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export async function destroyAllSessions(userId: string) {
  await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
