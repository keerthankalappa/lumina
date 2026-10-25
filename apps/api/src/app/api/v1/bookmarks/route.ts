import { noContent, route } from "@/lib/route";
import { BookmarkBody } from "@/openapi/schemas";
import { addBookmark, listBookmarks } from "@/services/library";

export const GET = route({ auth: "required" }, async ({ auth }) => listBookmarks(auth.user.id));

export const POST = route({ auth: "required", body: BookmarkBody }, async ({ auth, body }) => {
  await addBookmark(auth.user.id, body);
  return noContent();
});
