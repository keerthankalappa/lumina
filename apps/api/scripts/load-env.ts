import { existsSync } from "node:fs";

// Mirror Next.js: .env.local overrides .env. Real environment variables win over both.
for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);
