import { env } from "@/env";
import { route } from "@/lib/route";

export const GET = route({}, async () => ({ google: env().googleConfigured, devLogin: env().devLoginEnabled }));
