import { parseId } from "@/lib/params";
import { route } from "@/lib/route";
import { setLight } from "@/services/community";

type P = { id: string };

export const PUT = route<P>({ auth: "required" }, async ({ auth, params }) => setLight(auth.user.id, parseId(params.id), true));

export const DELETE = route<P>({ auth: "required" }, async ({ auth, params }) => setLight(auth.user.id, parseId(params.id), false));
