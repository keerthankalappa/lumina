import { parseId } from "@/lib/params";
import { noContent, route } from "@/lib/route";
import { deleteRipple } from "@/services/community";

export const DELETE = route<{ id: string }>({ auth: "required" }, async ({ auth, params }) => {
  await deleteRipple(auth.user.id, parseId(params.id));
  return noContent();
});
