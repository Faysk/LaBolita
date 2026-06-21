import { createRequire } from "node:module";
import { dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const isDevelopment = process.env.NODE_ENV === "development";
const configRoot = dirname(fileURLToPath(import.meta.url));
const dependencyRoot = dirname(dirname(dirname(require.resolve("next/package.json"))));
// Worktrees can share node_modules with a parent folder, so Turbopack must cover both.
const workspaceRoot =
  configRoot === dependencyRoot || configRoot.startsWith(`${dependencyRoot}${sep}`)
    ? dependencyRoot
    : configRoot;
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDevelopment ? "'unsafe-eval'" : "",
].filter(Boolean).join(" ");

const nextConfig: NextConfig = {
  distDir: process.env.LABOLITA_BUILD_DIR ?? ".next",
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "font-src 'self' data:",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "img-src 'self' data: blob: https://*.googleusercontent.com",
              "object-src 'none'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
