import { route } from "@/lib/route";
import { userStats } from "@/services/community";

export const GET = route({ auth: "required" }, async ({ auth }) => userStats(auth.user.id));
