import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const API_TARGET = process.env.VITE_API_PROXY ?? "http://localhost:4000";

/**
 * Production Content-Security-Policy. Injected only into the built index.html because the Vite dev
 * server relies on inline scripts for HMR. Prefer sending the same policy as an HTTP header from
 * your host (see README) — `frame-ancestors` is only honoured as a header.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const cspPlugin = (): Plugin => ({
  name: "lumina-csp",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  server: {
    port: 5173,
    headers: securityHeaders,
    // Same-origin API in development: cookies stay first-party and SameSite=Lax just works.
    proxy: { "/api": { target: API_TARGET, xfwd: true } },
  },
  preview: {
    port: 4173,
    headers: { ...securityHeaders, "Content-Security-Policy": `${CSP}; frame-ancestors 'none'` },
    proxy: { "/api": { target: API_TARGET, xfwd: true } },
  },
  build: { sourcemap: false, target: "es2022" },
});
