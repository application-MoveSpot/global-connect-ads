import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "fs";

// En environnement CCR (cloud), Chromium est pré-installé à ce chemin.
// En CI GitHub Actions, Playwright installe son propre Chromium — pas d'executablePath.
const CCR_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const ccrLaunchOptions = existsSync(CCR_CHROMIUM)
  ? { executablePath: CCR_CHROMIUM, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
  : { args: ["--no-sandbox", "--disable-setuid-sandbox"] };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: ccrLaunchOptions,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: ccrLaunchOptions,
      },
    },
  ],
  // En CI : wrangler dev sert le Worker Cloudflare pré-buildé (output .output/server/).
  // vite preview est intercepté par @tanstack/start-plugin-core qui cherche dist/server/server.js
  // (chemin Nitro Node), introuvable car TanStack Start + Cloudflare sort dans .output/.
  // En local : réutilise un dev server existant ou en démarre un.
  webServer: {
    command: process.env.CI
      ? "WRANGLER_SEND_METRICS=false npx wrangler dev --config .output/server/wrangler.json --port 3000"
      : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
