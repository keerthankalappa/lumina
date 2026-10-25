import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAbsoluteFSPath } from "swagger-ui-dist";

const INIT = `window.ui = SwaggerUIBundle({
  url: "/api/openapi.json",
  dom_id: "#swagger-ui",
  deepLinking: true,
  withCredentials: true,
  persistAuthorization: false,
});`;

// Explicit allow-list: the route param never reaches the filesystem directly.
const ASSETS: Record<string, string> = {
  "swagger-ui.css": "text/css; charset=utf-8",
  "swagger-ui-bundle.js": "text/javascript; charset=utf-8",
};

export async function GET(_req: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  const cache = { "Cache-Control": "public, max-age=86400" };
  if (asset === "init.js") return new Response(INIT, { headers: { "Content-Type": "text/javascript; charset=utf-8", ...cache } });
  const type = ASSETS[asset];
  if (!type) return new Response("Not found", { status: 404 });
  const body = await readFile(path.join(getAbsoluteFSPath(), asset));
  return new Response(body, { headers: { "Content-Type": type, ...cache } });
}
