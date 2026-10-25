import { parseId } from "@/lib/params";
import { noContent, route } from "@/lib/route";
import { MantraPatch } from "@/openapi/schemas";
import { deleteMantra, getMantra, updateMantra } from "@/services/library";


type P = { id: string };

export const GET = route<P>({ auth: "required" }, async ({ auth, params }) => getMantra(auth.user.id, parseId(params.id)));

export const PATCH = route<P, typeof MantraPatch>({ auth: "required", body: MantraPatch }, async ({ auth, params, body }) =>
  updateMantra(auth.user.id, parseId(params.id), body),
);

export const DELETE = route<P>({ auth: "required" }, async ({ auth, params }) => {
  await deleteMantra(auth.user.id, parseId(params.id));
  return noContent();
});
