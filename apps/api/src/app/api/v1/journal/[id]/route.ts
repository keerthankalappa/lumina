import { parseId } from "@/lib/params";
import { noContent, route } from "@/lib/route";
import { deleteJournal } from "@/services/library";

export const DELETE = route<{ id: string }>({ auth: "required" }, async ({ auth, params }) => {
  await deleteJournal(auth.user.id, parseId(params.id));
  return noContent();
});
