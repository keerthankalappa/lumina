import { route } from "@/lib/route";
import { journalInsights } from "@/services/library";

export const GET = route({ auth: "required" }, async ({ auth }) => journalInsights(auth.user.id));
