import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { env } from "@/env";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

// Reuse one client across hot reloads in dev.
const globalForDb = globalThis as unknown as { __luminaDb?: { client: Client; db: Db } };

export function db(): Db {
  if (!globalForDb.__luminaDb) {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = env();
    const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN || undefined });
    // SQLite does not enforce foreign keys unless asked to.
    void client.execute("PRAGMA foreign_keys = ON");
    globalForDb.__luminaDb = { client, db: drizzle(client, { schema }) };
  }
  return globalForDb.__luminaDb.db;
}

export { schema };
