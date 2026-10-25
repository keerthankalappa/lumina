import { ApiError } from "@/lib/errors";
import { noContent, route } from "@/lib/route";
import { BookmarkBody } from "@/openapi/schemas";
import { removeBookmark } from "@/services/library";

export const DELETE = route<{ targetType: string; targetId: string }>({ auth: "required" }, async ({ auth, params }) => {
  const parsed = BookmarkBody.safeParse(params);
  if (!parsed.success) throw ApiError.fromZod(parsed.error);
  await removeBookmark(auth.user.id, parsed.data);
  return noContent();
});
