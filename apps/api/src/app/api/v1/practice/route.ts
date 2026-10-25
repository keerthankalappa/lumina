import { route } from "@/lib/route";
import { PracticeBody } from "@/openapi/schemas";
import { recordPractice } from "@/services/community";

export const POST = route({ auth: "required", body: PracticeBody }, async ({ auth, body }) =>
  recordPractice(auth.user.id, body.actionId, body.localDate),
);
