import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "lumina-test-"));
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: `file:${path.join(dir, "test.db")}`,
  SESSION_SECRET: "test-secret-test-secret-test-secret-123456",
  APP_ORIGIN: "http://app.test",
  GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_REDIRECT_URI: "http://app.test/api/v1/auth/google/callback",
  DEV_LOGIN_ENABLED: "1",
  TRUST_PROXY: "0",
});

beforeAll(async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db/client");
  const { seed } = await import("@/db/seed");
  await migrate(db(), { migrationsFolder: path.resolve(import.meta.dirname, "../drizzle") });
  await seed();
});
