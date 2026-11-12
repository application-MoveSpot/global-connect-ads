/**
 * Régression — statsFn / getMyReferralStats unhandledrejection
 *
 * Sentry #production : [{"code":"invalid_type","expected":"object","received":"undefined","path":[],"message":"Required"}]
 *
 * Cause : statsFn({}) passait {} sans champ `data`, TanStack Start extrayait
 *   data = undefined et le validateur Zod recevait undefined au lieu de {}.
 *   La promesse rejetée n'avait pas de .catch() → unhandledrejection.
 *
 * Vérifie :
 *   1. Source — l'appel utilise bien { data: {} } (pas {})
 *   2. Source — le validator de getMyReferralStats tolère undefined (input ?? {})
 *   3. Source — la promesse a un .catch()
 *   4. Browser — /advertiser ne lève pas d'unhandledrejection au chargement
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { injectSession } from "./helpers";

// ── 1–3. Vérifications source ─────────────────────────────────────────────────

test.describe("Régression getMyReferralStats — vérifications source", () => {
  test("advertiser.index.tsx appelle statsFn avec { data: {} } et non {}", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/routes/advertiser.index.tsx"),
      "utf-8",
    );
    // Le bug était statsFn({}) — doit maintenant être statsFn({ data: {} })
    expect(src, "statsFn({}) sans data détecté — l'appel doit utiliser { data: {} }").not.toMatch(
      /statsFn\(\s*\{\s*\}\s*\)/,
    );
    expect(src, "statsFn n'utilise pas { data: {} }").toContain('statsFn({ data: {} })');
  });

  test("la promesse statsFn a un .catch() pour éviter l'unhandledrejection", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/routes/advertiser.index.tsx"),
      "utf-8",
    );
    // Le bloc useEffect du ReferralWidget doit avoir .catch()
    const statsFnBlock = src.slice(src.indexOf("statsFn("));
    const firstCatch = statsFnBlock.indexOf(".catch(");
    expect(
      firstCatch,
      ".catch() absent après statsFn() — la promesse peut créer un unhandledrejection",
    ).toBeGreaterThan(-1);
  });

  test("getMyReferralStats validator tolère un input undefined (input ?? {})", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/referral/advertiser-referral.functions.ts"),
      "utf-8",
    );
    // Doit avoir le guard input ?? {} pour éviter z.object({}).parse(undefined)
    expect(
      src,
      "getMyReferralStats inputValidator ne protège pas contre undefined — ajouter input ?? {}",
    ).toMatch(/z\.object\(\s*\{\s*\}\s*\)\.parse\(\s*input\s*\?\?\s*\{\s*\}\s*\)/);
  });
});

// ── 4. Test navigateur — pas d'unhandledrejection au chargement ───────────────

test.describe("Régression getMyReferralStats — chargement /advertiser", () => {
  test("/advertiser ne lève pas d'unhandledrejection Zod au chargement", async ({ page }) => {
    // Écoute les rejets de promesses non gérés
    const unhandledRejections: string[] = [];
    page.on("pageerror", (err) => {
      // On cible spécifiquement le format d'erreur Zod :
      //   [{"code":"invalid_type","expected":"object","received":"undefined",...}]
      if (
        err.message.includes('"invalid_type"') &&
        err.message.includes('"received":"undefined"') &&
        err.message.includes('"path":[]')
      ) {
        unhandledRejections.push(err.message);
      }
    });

    await injectSession(page, "annonceur");
    await page.goto("/advertiser", { waitUntil: "domcontentloaded" });
    // Laisse 2 s pour que le useEffect du ReferralWidget s'exécute
    await page.waitForTimeout(2000);

    expect(
      unhandledRejections,
      `unhandledrejection Zod détecté sur /advertiser :\n${unhandledRejections.join("\n")}`,
    ).toHaveLength(0);
  });
});
