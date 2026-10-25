import { route } from "@/lib/route";
import { toUserDto } from "@/services/users";

export const GET = route({ auth: "required" }, async ({ auth }) => ({ user: toUserDto(auth.user), csrfToken: auth.csrfToken }));
