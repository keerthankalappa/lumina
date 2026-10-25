import { route } from "@/lib/route";
import { clearSessionCookie, destroySession } from "@/lib/session";

export const POST = route({ auth: "required" }, async ({ auth }) => {
  await destroySession(auth.sessionId);
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } });
});
