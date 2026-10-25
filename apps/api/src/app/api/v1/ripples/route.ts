import { json, route } from "@/lib/route";
import { RippleBody, RippleListQuery } from "@/openapi/schemas";
import { createRipple, listRipples } from "@/services/community";

export const GET = route({ auth: "optional", query: RippleListQuery }, async ({ auth, query }) =>
  listRipples({ ...query, viewerId: auth?.user.id }),
);

export const POST = route({ auth: "required", body: RippleBody }, async ({ auth, body }) =>
  json(await createRipple(auth.user.id, body), { status: 201 }),
);
