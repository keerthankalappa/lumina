import { env } from "@/env";
import { ApiError } from "@/lib/errors";
import { policies } from "@/lib/rate-limit";
import { json, route } from "@/lib/route";
import { createSession } from "@/lib/session";
import { DevLoginBody } from "@/openapi/schemas";
import { toUserDto, upsertDevUser } from "@/services/users";

export const POST = route({ body: DevLoginBody, rateLimit: policies.auth }, async ({ body, req }) => {
  if (!env().devLoginEnabled) throw ApiError.notFound("Endpoint");
  const { user } = await upsertDevUser(body.email, body.displayName);
  const session = await createSession(user.id, req.headers.get("user-agent"));
  return json({ user: toUserDto(user), csrfToken: session.csrfToken }, { headers: { "Set-Cookie": session.cookie } });
});
