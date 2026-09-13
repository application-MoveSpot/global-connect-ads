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
  // Lance le dev server automatiquement si pas déjà démarré
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
