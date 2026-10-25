import { route } from "@/lib/route";
import { DeckListQuery } from "@/openapi/schemas";
import { listDecks } from "@/services/content";

export const GET = route({ auth: "optional", query: DeckListQuery }, async ({ auth, query }) =>
  listDecks({ ...query, userId: auth?.user.id }),
);
