// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Charge toutes les variables (sans préfixe VITE_) dans process.env pour les routes serveur.
// Ne jamais exposer ces valeurs au bundle client.
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

// Sanitize VITE_* env vars — trim trailing whitespace/newlines from CI secrets.
// GitHub Actions secrets set via `echo "${VALUE}" | wrangler secret put KEY` can carry a
// trailing newline. If that newline ends up in an HTTP header (e.g. Authorization: Bearer <jwt>\n)
// Chrome throws "Failed to execute 'fetch' on 'Window': Invalid value".
for (const key of Object.keys(process.env)) {
  if (key.startsWith("VITE_") && typeof process.env[key] === "string") {
    process.env[key] = (process.env[key] as string).replace(/[\x00-\x1F\x7F]/g, "").trim();
  }
}

// Valeurs PUBLIQUES (URL + clé publishable) : secours si .env est absent au build de publication.
const PUBLIC_SUPABASE_URL = (
  process.env["VITE_SUPABASE_URL"] || "https://phononlhfyljhhhvlmrm.supabase.co"
).replace(/[\x00-\x1F\x7F]/g, "").trim();
const PUBLIC_SUPABASE_KEY = (
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBob25vbmxoZnlsamhoaHZsbXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE0NTYsImV4cCI6MjA5Mjg5NzQ1Nn0.egR2cPj_5DoQtZv7Hs-OKt6gwotTDqWjxdG7sgmIBO4"
).replace(/[\x00-\x1F\x7F]/g, "").trim();
for (const [k, v] of [
  ["VITE_SUPABASE_URL", PUBLIC_SUPABASE_URL],
  ["SUPABASE_URL", PUBLIC_SUPABASE_URL],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", PUBLIC_SUPABASE_KEY],
  ["SUPABASE_PUBLISHABLE_KEY", PUBLIC_SUPABASE_KEY],
  ["VITE_SUPABASE_PROJECT_ID", "phononlhfyljhhhvlmrm"],
]) {
  if (!process.env[k]) process.env[k] = v;
}

export default defineConfig({
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_SUPABASE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify("phononlhfyljhhhvlmrm"),
    },
    plugins: [
      mcpPlugin(),
      sentryVitePlugin({
        org: process.env["SENTRY_ORG"],
        project: process.env["SENTRY_PROJECT"],
        authToken: process.env["SENTRY_AUTH_TOKEN"],
        // Upload source maps only in production builds
        disable: process.env["NODE_ENV"] !== "production" || !process.env["SENTRY_AUTH_TOKEN"],
        telemetry: false,
      }),
    ],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(
          process.cwd(),
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          process.cwd(),
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(process.cwd(), "node_modules/entities"),
      },
    },
  },
});
