import { route } from "@/lib/route";
import { DailyQuery } from "@/openapi/schemas";
import { getDaily } from "@/services/content";

export const GET = route({ auth: "optional", query: DailyQuery }, async ({ auth, query }) => getDaily(query.date, auth?.user.id));
