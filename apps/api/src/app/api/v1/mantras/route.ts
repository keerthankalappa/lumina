import { json, route } from "@/lib/route";
import { MantraBody } from "@/openapi/schemas";
import { createMantra, listMantras } from "@/services/library";

export const GET = route({ auth: "required" }, async ({ auth }) => listMantras(auth.user.id));

export const POST = route({ auth: "required", body: MantraBody }, async ({ auth, body }) =>
  json(await createMantra(auth.user.id, body), { status: 201 }),
);
