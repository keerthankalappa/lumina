import { route } from "@/lib/route";
import { getDeck } from "@/services/content";

export const GET = route<{ slug: string }>({ auth: "optional" }, async ({ auth, params }) => getDeck(params.slug, auth?.user.id));
