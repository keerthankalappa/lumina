import { json, route } from "@/lib/route";
import { JournalBody } from "@/openapi/schemas";
import { createJournal, listJournal } from "@/services/library";

export const GET = route({ auth: "required" }, async ({ auth }) => listJournal(auth.user.id));

export const POST = route({ auth: "required", body: JournalBody }, async ({ auth, body }) =>
  json(await createJournal(auth.user.id, body), { status: 201 }),
);
