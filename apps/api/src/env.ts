import { z } from "zod";

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const flag = z
  .enum(["0", "1", "true", "false", ""])
  .optional()
  .transform((v) => v === "1" || v === "true");

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_ORIGIN: z.url().default("http://localhost:5173"),
    ALLOWED_ORIGINS: csv,
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    DATABASE_URL: z.string().default("file:./data/lumina.db"),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional().default(""),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
    GOOGLE_REDIRECT_URI: z.url().default("http://localhost:5173/api/v1/auth/google/callback"),
    ALLOWED_EMAIL_DOMAINS: csv,
    TRUST_PROXY: flag,
    DEV_LOGIN_ENABLED: flag,
  })
  .transform((e) => ({
    ...e,
    isProd: e.NODE_ENV === "production",
    // Hard guard: the dev login can never be switched on in production.
    devLoginEnabled: e.DEV_LOGIN_ENABLED && e.NODE_ENV !== "production",
    googleConfigured: Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET),
    allowedOrigins: Array.from(new Set([new URL(e.APP_ORIGIN).origin, ...e.ALLOWED_ORIGINS.map((o) => new URL(o).origin)])),
  }));

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Validated configuration. Parsed lazily so `next build` works without runtime secrets. */
export function env(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** Test hook. */
export function resetEnvCache() {
  cached = undefined;
}
