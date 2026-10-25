import type { NextConfig } from "next";

// API-only Next.js app. Every response gets a locked-down set of security headers;
// the docs page relaxes CSP for itself (see src/app/api/docs/route.ts).
const apiCsp = { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" };
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@libsql/client", "swagger-ui-dist"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Everything except the docs page (which sets its own, slightly wider CSP).
      { source: "/((?!api/docs).*)", headers: [apiCsp] },
    ];
  },
};

export default config;
