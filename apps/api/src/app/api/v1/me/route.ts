import { route } from "@/lib/route";
import { clearSessionCookie } from "@/lib/session";
import { UpdateProfileBody } from "@/openapi/schemas";
import { deleteAccount, toUserDto, updateProfile } from "@/services/users";

export const GET = route({ auth: "required" }, async ({ auth }) => toUserDto(auth.user));

export const PATCH = route({ auth: "required", body: UpdateProfileBody }, async ({ auth, body }) =>
  toUserDto(await updateProfile(auth.user.id, body)),
);

export const DELETE = route({ auth: "required" }, async ({ auth }) => {
  await deleteAccount(auth.user.id);
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } });
});
