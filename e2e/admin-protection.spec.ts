/**
 * Tests E2E — Protection des routes /admin et /admin/dashboard
 *
 * Vérifie que :
 *   1. Un visiteur anonyme ne peut pas accéder au tableau de bord admin
 *      (redirection vers /admin/connexion ou affichage de "Session introuvable")
 *   2. Un utilisateur authentifié sans rôle admin voit "Accès refusé"
 *   3. Les sources contiennent bien le garde isAdmin() et ses clés i18n de refus
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { injectSession } from "./helpers";

// ── Constantes clés i18n (fr.json) ───────────────────────────────────────────

const MSG_CHECKING = "Vérification de la session";
const MSG_SESSION_NOT_FOUND = "Session introuvable";
const MSG_ACCESS_DENIED = "Accès refusé";
const MSG_NOT_ADMIN = "n'êtes pas administrateur";
const MSG_SIGN_IN = "Se connecter";
const MSG_ADMIN_TITLE = "Tableau de bord";
const MSG_ADMIN_TAB = "Demandes";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Vrai si la page a redirigé vers un écran de connexion admin */
function isAdminLoginPage(url: string) {
  return url.includes("/admin/connexion") || url.includes("/admin/connexion");
}

/** Vrai si le contenu visible correspond à un blocage (pas le dashboard) */
function isBlockedContent(bodyText: string) {
  return (
    bodyText.includes(MSG_SESSION_NOT_FOUND) ||
    bodyText.includes(MSG_ACCESS_DENIED) ||
    bodyText.includes(MSG_NOT_ADMIN) ||
    bodyText.includes(MSG_SIGN_IN) ||
    bodyText.includes(MSG_CHECKING)
  );
}

/** Vrai si le contenu expose le tableau de bord admin (ne devrait pas arriver) */
function isAdminDashboardContent(bodyText: string) {
  return bodyText.includes(MSG_ADMIN_TITLE) && bodyText.includes(MSG_ADMIN_TAB);
}

async function waitForAdminPage(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  // Laisse le temps au useEffect auth de s'exécuter (timeout réseau court en CI)
  await page.waitForTimeout(2500);
}

// Mock les appels Supabase isAdmin() pour simuler un utilisateur non-admin.
// Fonctionne en local (Supabase configuré) ; en CI l'intercepteur est sans effet
// car le client Supabase ne s'initialise pas (env vars absentes).
async function mockNonAdminSupabase(page: Page) {
  await page.route("**/rest/v1/rpc/check_is_admin*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "false" }),
  );
  await page.route("**/rest/v1/user_roles*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );
}

// ── 1. Visiteur anonyme ───────────────────────────────────────────────────────

test.describe("Route /admin — visiteur anonyme (non connecté)", () => {
  test("ne voit pas le tableau de bord admin", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await waitForAdminPage(page);

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");

    // Soit redirigé vers /admin/connexion, soit UI de blocage
    const redirected = isAdminLoginPage(url);
    const blocked = isBlockedContent(bodyText);

    expect(
      redirected || blocked || bodyText.length === 0,
      `Accès anonyme /admin non bloqué. URL: ${url}\nContenu: ${bodyText.slice(0, 200)}`,
    ).toBe(true);

    // Le tableau de bord ne doit absolument pas apparaître
    expect(
      isAdminDashboardContent(bodyText),
      `Le dashboard admin est accessible sans session !\nContenu: ${bodyText.slice(0, 300)}`,
    ).toBe(false);
  });

  test("ne voit pas le tableau de bord sur /admin/dashboard", async ({ page }) => {
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    await waitForAdminPage(page);

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");

    const redirected = isAdminLoginPage(url);
    const blocked = isBlockedContent(bodyText);

    expect(
      redirected || blocked || bodyText.length === 0,
      `Accès anonyme /admin/dashboard non bloqué. URL: ${url}\nContenu: ${bodyText.slice(0, 200)}`,
    ).toBe(true);

    // Le contenu exclusif au dashboard admin ne doit pas s'afficher
    // Note : /admin/dashboard peut afficher "Tableau de bord" dans le titre
    // de la page de connexion aussi — on vérifie l'onglet "Demandes" qui est
    // spécifique au dashboard connecté.
    expect(
      bodyText.includes(MSG_ADMIN_TAB) && !blocked,
      `L'onglet "${MSG_ADMIN_TAB}" est visible sur /admin/dashboard sans session`,
    ).toBe(false);
  });
});

// ── 2. Utilisateur authentifié non-admin ────────────────────────────────────

test.describe("Route /admin — utilisateur non-admin", () => {
  test.beforeEach(async ({ page }) => {
    // Injecte une session avec un compte annonceur (pas admin)
    await injectSession(page, "annonceur");
    await mockNonAdminSupabase(page);
  });

  test("affiche le blocage (Accès refusé ou Session introuvable)", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await waitForAdminPage(page);

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");

    // En local : RPC interceptée → "Accès refusé"
    // En CI sans Supabase : client throws → catch → "Session introuvable"
    const isBlocked =
      isAdminLoginPage(url) || isBlockedContent(bodyText) || bodyText.length === 0;

    expect(
      isBlocked,
      `Un annonceur accède au dashboard admin !\nURL: ${url}\nContenu: ${bodyText.slice(0, 300)}`,
    ).toBe(true);

    // Le tableau de bord ne doit pas s'afficher
    expect(
      isAdminDashboardContent(bodyText),
      `Dashboard admin accessible pour un non-admin !\nContenu: ${bodyText.slice(0, 300)}`,
    ).toBe(false);
  });

  test("/admin/dashboard bloqué pour un non-admin", async ({ page }) => {
    await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
    await waitForAdminPage(page);

    const url = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");

    const isBlocked =
      isAdminLoginPage(url) || isBlockedContent(bodyText) || bodyText.length === 0;

    expect(
      isBlocked,
      `Non-admin accède à /admin/dashboard !\nURL: ${url}\nContenu: ${bodyText.slice(0, 300)}`,
    ).toBe(true);
  });
});

// ── 3. Vérifications source (guard isAdmin présent dans le code) ─────────────

test.describe("Admin protection — vérifications source", () => {
  const ADMIN_ROUTE = path.join(process.cwd(), "src/routes/admin.tsx");
  const ADMIN_DASHBOARD = path.join(process.cwd(), "src/routes/admin.dashboard.tsx");

  test("admin.tsx appelle isAdmin()", () => {
    const src = fs.readFileSync(ADMIN_ROUTE, "utf-8");
    expect(src, "Le guard isAdmin() a disparu de src/routes/admin.tsx").toContain("isAdmin()");
  });

  test("admin.tsx affiche 'access_denied' pour les non-admins", () => {
    const src = fs.readFileSync(ADMIN_ROUTE, "utf-8");
    expect(
      src,
      "La clé i18n access_denied absente de admin.tsx — l'UI de refus a peut-être été retirée",
    ).toContain("access_denied");
  });

  test("admin.tsx navigue vers /admin/connexion si non connecté", () => {
    const src = fs.readFileSync(ADMIN_ROUTE, "utf-8");
    expect(src, "La redirection vers /admin/connexion a disparu de admin.tsx").toContain(
      "/admin/connexion",
    );
  });

  test("admin.dashboard.tsx appelle isAdmin()", () => {
    const src = fs.readFileSync(ADMIN_DASHBOARD, "utf-8");
    expect(
      src,
      "Le guard isAdmin() a disparu de src/routes/admin.dashboard.tsx",
    ).toContain("isAdmin");
  });
});
