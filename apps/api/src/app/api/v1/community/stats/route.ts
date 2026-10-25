import { route } from "@/lib/route";
import { communityStats } from "@/services/community";

export const GET = route({}, async () => communityStats());
