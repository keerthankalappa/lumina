import { z } from "zod";
import { ApiError } from "./errors";

/** Path ids are UUIDs; anything else is a 404 rather than a database lookup. */
export function parseId(raw: string): string {
  if (!z.uuid().safeParse(raw).success) throw ApiError.notFound();
  return raw;
}
