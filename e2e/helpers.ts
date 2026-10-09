import { type Page } from "@playwright/test";

const SUPABASE_KEY = "sb-phononlhfyljhhhvlmrm-auth-token";

export function injectSession(page: Page, role: "annonceur" | "proprietaire" | "driver" | "admin" = "annonceur") {
  const emails: Record<string, string> = {
    annonceur: "annonceur@movespot.fr",
    proprietaire: "proprietaire@movespot.fr",
    driver: "chauffeur@movespot.fr",
    admin: "admin@movespot.fr",
  };
  return page.addInitScript(
    ({ key, email }: { key: string; email: string }) => {
      const session = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: "00000000-0000-0000-0000-000000000002", email, role: "authenticated" },
      };
      try {
        localStorage.setItem(key, JSON.stringify(session));
        localStorage.setItem("ms_cookie_consent", "accepted");
      } catch {}
    },
    { key: SUPABASE_KEY, email: emails[role] },
  );
}

export function isAuthRedirect(url: string) {
  try {
    const { pathname } = new URL(url);
    if (pathname === "/" || pathname === "") return true;
  } catch {}
  return url.includes("login") || url.includes("auth") || url.includes("inscription");
}

export async function hasVisibleContent(page: Page) {
  const text = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
  return text.length > 10;
}

export async function waitForHydration(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page
    .waitForFunction(
      () =>
        !document.body.innerText.includes("Chargement") &&
        !document.body.innerText.includes("Loading"),
      { timeout: 3000 },
    )
    .catch(() => {});
  await page.waitForTimeout(300);
}
