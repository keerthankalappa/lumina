import { openApiDocument } from "@/openapi/document";

export function GET() {
  return new Response(JSON.stringify(openApiDocument(), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
