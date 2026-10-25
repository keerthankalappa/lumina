// Interactive API reference rendered from /api/openapi.json. Swagger UI is served from our own
// origin (see ./[asset]/route.ts), so the page needs no third-party scripts.
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lumina API Reference</title>
    <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/swagger-ui-bundle.js"></script>
    <script src="/api/docs/init.js"></script>
  </body>
</html>`;

const DOCS_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
  "connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

export function GET() {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": DOCS_CSP },
  });
}
