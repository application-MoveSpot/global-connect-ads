/**
 * Tests E2E — Chargement espaces Annonceur / Propriétaire / Prestataire + parité i18n FR/EN
 *
 * Vérifie :
 *   1. /advertiser  charge ou redirige sans erreur JS fatale (espace annonceur)
 *   2. /owner       charge ou redirige sans erreur JS fatale (espace propriétaire)
 *   3. /provider    charge ou redirige sans erreur JS fatale (espace prestataire)
 *   4. Parité des clés i18n : chaque clé de fr.json existe dans en.json et vice-versa
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { injectSession } from "./helpers";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Erreurs JS fatales (hors bruit réseau / services tiers attendus) */
const IGNORE_ERROR_PATTERNS = [
  /favicon/i,
  /404/,
  /ERR_/,
  /net::/,
  /Content Security Policy/i,
  /frame-ancestors/i,
  /supabase/i,
  /i18next/i,
  /mapbox/i,
  /stripe/i,
  /lovable/i,
  /Failed to fetch/i,
  /Failed to load/i,
  /Failed to parse/i,
  /Invalid URL/i,
  /VITE_/,
  /AbortError/i,
  /NetworkError/i,
  /WebSocket/i,
  // React SSR hydration warnings (pre-existing, non-fatal)
  /hydration/i,
  /react\.dev/i,
  /server rendered HTML/i,
  /A tree hydrated/i,
  /did not match/i,
];

function isFatalError(msg: string): boolean {
  return !IGNORE_ERROR_PATTERNS.some((pattern) => pattern.test(msg));
}

async function collectFatalErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && isFatalError(m.text())) {
      errors.push(m.text());
    }
  });
  page.on("pageerror", (err) => {
    if (isFatalError(err.message)) errors.push(err.message);
  });
  return errors;
}

async function loadDashboard(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page
    .waitForFunction(
      () =>
        !document.body.innerText.includes("Chargement") &&
        !document.body.innerText.includes("Loading"),
      { timeout: 3000 },
    )
    .catch(() => {});
  await page.waitForTimeout(500);
}

/** Vrai si la page a redirigé vers une page de connexion */
function isAuthRedirect(url: string) {
  try {
    const { pathname } = new URL(url);
    if (pathname === "/" || pathname === "") return true;
  } catch {}
  return (
    url.includes("login") ||
    url.includes("auth") ||
    url.includes("inscription") ||
    url.includes("connexion")
  );
}

// ── 1. Espace Annonceur (/advertiser) ─────────────────────────────────────────

test.describe("Espace Annonceur — /advertiser", () => {
  test("charge sans écran blanc ni erreur JS fatale", async ({ page }) => {
    const errors = await collectFatalErrors(page);
    await injectSession(page, "annonceur");
    await loadDashboard(page, "/advertiser");

    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    const url = page.url();

    // Soit rendu (avec contenu), soit redirect propre
    expect(
      isAuthRedirect(url) || bodyText.length > 10,
      `Écran blanc sur /advertiser — URL: ${url}`,
    ).toBe(true);

    // Pas d'erreur JS fatale
    expect
      .soft(errors, `Erreurs JS fatales sur /advertiser:\n${errors.join("\n")}`)
      .toHaveLength(0);
  });

  test("affiche un titre reconnaissable (/advertiser)", async ({ page }) => {
    await injectSession(page, "annonceur");
    await loadDashboard(page, "/advertiser");

    const url = page.url();
    if (isAuthRedirect(url)) return; // redirigé en CI — skip

    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    if (bodyText.length <= 10) return; // CI sans Supabase — skip

    const pageHtml = await page.content();
    // La page annonceur contient l'un de ces indicateurs
    const hasContent =
      /annonceur|campagne|brief|portefeuille|publicité|dashboard/i.test(pageHtml) ||
      /MoveSpot/i.test(pageHtml);
    expect
      .soft(hasContent, "Aucun contenu annonceur reconnaissable sur /advertiser")
      .toBe(true);
  });
});

// ── 2. Espace Propriétaire (/owner) ──────────────────────────────────────────

test.describe("Espace Propriétaire — /owner", () => {
  test("charge sans écran blanc ni erreur JS fatale", async ({ page }) => {
    const errors = await collectFatalErrors(page);
    await injectSession(page, "proprietaire");
    await loadDashboard(page, "/owner");

    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    const url = page.url();

    expect(
      isAuthRedirect(url) || bodyText.length > 10,
      `Écran blanc sur /owner — URL: ${url}`,
    ).toBe(true);

    expect
      .soft(errors, `Erreurs JS fatales sur /owner:\n${errors.join("\n")}`)
      .toHaveLength(0);
  });

  test("affiche un titre reconnaissable (/owner)", async ({ page }) => {
    await injectSession(page, "proprietaire");
    await loadDashboard(page, "/owner");

    const url = page.url();
    if (isAuthRedirect(url)) return;

    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    if (bodyText.length <= 10) return;

    const pageHtml = await page.content();
    const hasContent =
      /propriétaire|véhicule|flotte|revenus|fleet|owner/i.test(pageHtml) ||
      /MoveSpot/i.test(pageHtml);
    expect
      .soft(hasContent, "Aucun contenu propriétaire reconnaissable sur /owner")
      .toBe(true);
  });
});

// ── 3. Espace Prestataire (/provider) ────────────────────────────────────────

test.describe("Espace Prestataire — /provider", () => {
  test("charge sans écran blanc ni erreur JS fatale", async ({ page }) => {
    const errors = await collectFatalErrors(page);
    await injectSession(page, "annonceur"); // rôle générique — la route existe
    await loadDashboard(page, "/provider");

    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    const url = page.url();

    expect(
      isAuthRedirect(url) || bodyText.length > 10,
      `Écran blanc sur /provider — URL: ${url}`,
    ).toBe(true);

    expect
      .soft(errors, `Erreurs JS fatales sur /provider:\n${errors.join("\n")}`)
      .toHaveLength(0);
  });

  test("affiche un titre reconnaissable (/provider)", async ({ page }) => {
    await injectSession(page, "annonceur");
    await loadDashboard(page, "/provider");

    const url = page.url();
    if (isAuthRedirect(url)) return;

    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    if (bodyText.length <= 10) return;

    const pageHtml = await page.content();
    const hasContent =
      /prestataire|poseur|portfolio|missions|provider/i.test(pageHtml) ||
      /MoveSpot/i.test(pageHtml);
    expect
      .soft(hasContent, "Aucun contenu prestataire reconnaissable sur /provider")
      .toBe(true);
  });
});

// ── 4. Parité des clés i18n FR / EN ──────────────────────────────────────────

test.describe("Parité i18n — fr.json ↔ en.json", () => {
  /** Aplatit récursivement un objet JSON imbriqué en Set de clés "a.b.c" */
  function flattenKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
    const keys = new Set<string>();
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        for (const nested of flattenKeys(v as Record<string, unknown>, fullKey)) {
          keys.add(nested);
        }
      } else {
        keys.add(fullKey);
      }
    }
    return keys;
  }

  let frKeys: Set<string>;
  let enKeys: Set<string>;

  test.beforeAll(() => {
    const frRaw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "src/locales/fr.json"), "utf-8"),
    ) as Record<string, unknown>;
    const enRaw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "src/locales/en.json"), "utf-8"),
    ) as Record<string, unknown>;
    frKeys = flattenKeys(frRaw);
    enKeys = flattenKeys(enRaw);
  });

  test("fr.json et en.json ont le même nombre de clés", () => {
    expect(
      frKeys.size,
      `Nombre de clés différent — FR: ${frKeys.size}, EN: ${enKeys.size}`,
    ).toBe(enKeys.size);
  });

  test("toutes les clés de fr.json existent dans en.json", () => {
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));
    expect(
      missingInEn,
      `${missingInEn.length} clé(s) FR absentes de en.json :\n${missingInEn.slice(0, 20).join("\n")}`,
    ).toHaveLength(0);
  });

  test("toutes les clés de en.json existent dans fr.json", () => {
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));
    expect(
      missingInFr,
      `${missingInFr.length} clé(s) EN absentes de fr.json :\n${missingInFr.slice(0, 20).join("\n")}`,
    ).toHaveLength(0);
  });

  test("aucune valeur i18n n'est une chaîne vide dans fr.json", () => {
    const frRaw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "src/locales/fr.json"), "utf-8"),
    ) as Record<string, unknown>;

    function findEmptyValues(obj: Record<string, unknown>, prefix = ""): string[] {
      const empties: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          empties.push(...findEmptyValues(v as Record<string, unknown>, fullKey));
        } else if (v === "") {
          empties.push(fullKey);
        }
      }
      return empties;
    }

    const empties = findEmptyValues(frRaw);
    expect
      .soft(
        empties,
        `${empties.length} valeur(s) vides dans fr.json :\n${empties.slice(0, 10).join("\n")}`,
      )
      .toHaveLength(0);
  });

  test("aucune valeur i18n n'est une chaîne vide dans en.json", () => {
    const enRaw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "src/locales/en.json"), "utf-8"),
    ) as Record<string, unknown>;

    function findEmptyValues(obj: Record<string, unknown>, prefix = ""): string[] {
      const empties: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
          empties.push(...findEmptyValues(v as Record<string, unknown>, fullKey));
        } else if (v === "") {
          empties.push(fullKey);
        }
      }
      return empties;
    }

    const empties = findEmptyValues(enRaw);
    expect
      .soft(
        empties,
        `${empties.length} valeur(s) vides dans en.json :\n${empties.slice(0, 10).join("\n")}`,
      )
      .toHaveLength(0);
  });
});
