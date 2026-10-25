import "./load-env";
import { mkdirSync } from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "@/db/client";
import { env } from "@/env";

const url = env().DATABASE_URL;
if (url.startsWith("file:")) mkdirSync("data", { recursive: true });
await migrate(db(), { migrationsFolder: "./drizzle" });
console.log(`✓ migrations applied to ${url.replace(/\/\/.*@/, "//***@")}`);
