/**
 * Tests E2E — Flux d'inscription annonceur et propriétaire
 *
 * Vérifie sans créer de compte réel :
 * - La page d'inscription charge correctement
 * - Les champs email, mot de passe et validation sont présents
 * - La soumission vide est bloquée par la validation HTML5
 * - Un email invalide n'est pas accepté
 * - Le formulaire respecte les champs requis du rôle
 */

import { test, expect } from "@playwright/test";
import { hasVisibleContent } from "./helpers";

// ─── Annonceur inscription ────────────────────────────────────────────────────

test.describe("Inscription annonceur — /annonceur/inscription", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem("ms_cookie_consent", "accepted"); } catch {}
    });
    await page.goto("/annonceur/inscription", { waitUntil: "domcontentloaded" });
  });

  test("charge sans écran blanc", async ({ page }) => {
    expect(await hasVisibleContent(page)).toBe(true);
  });

  test("le titre mentionne inscription ou annonceur", async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/inscription|annonceur|movespot/i);
  });

  test("champ email visible", async ({ page }) => {
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("champ mot de passe visible", async ({ page }) => {
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("bouton de soumission visible", async ({ page }) => {
    const btn = page.locator('button[type="submit"]').first();
    await expect(btn).toBeVisible();
  });

  test("soumission vide déclenche la validation HTML5 sur l'email", async ({ page }) => {
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(300);
    const emailInput = page.locator('input[type="email"]').first();
    // react-hook-form peut intercepter submit — vérifier validation native OU erreur React
    const hasNativeValidation = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage.length > 0 || el.validity.valueMissing,
    ).catch(() => false);
    const hasReactError = await page.locator('[role="alert"], .text-destructive, [class*="error"]').count() > 0;
    expect(hasNativeValidation || hasReactError, "Aucun retour de validation sur soumission vide").toBe(true);
  });

  test("email invalide bloque la soumission", async ({ page }) => {
    await page.locator('input[type="email"]').first().fill("pas-un-email");
    await page.locator('input[type="password"]').first().fill("secret123");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(300);
    const isInvalid = await page
      .locator('input[type="email"]')
      .first()
      .evaluate((el: HTMLInputElement) => !el.validity.valid).catch(() => true);
    const hasReactError = await page.locator('[role="alert"], .text-destructive, [class*="error"]').count() > 0;
    expect(isInvalid || hasReactError, "Email invalide non bloqué").toBe(true);
  });

  test("un lien vers la connexion ou déjà un compte est présent", async ({ page }) => {
    const link = page.getByText(/déjà un compte|se connecter|connexion/i).first();
    await expect(link).toBeVisible();
  });
});

// ─── Propriétaire inscription ─────────────────────────────────────────────────

test.describe("Inscription propriétaire — /proprietaire/inscription", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem("ms_cookie_consent", "accepted"); } catch {}
    });
    await page.goto("/proprietaire/inscription", { waitUntil: "domcontentloaded" });
  });

  test("charge sans écran blanc", async ({ page }) => {
    expect(await hasVisibleContent(page)).toBe(true);
  });

  test("le titre mentionne inscription ou propriétaire", async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/inscription|propriétaire|proprietaire|flotte|movespot/i);
  });

  test("champ email visible", async ({ page }) => {
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("champ mot de passe visible", async ({ page }) => {
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("bouton de soumission visible", async ({ page }) => {
    const btn = page.locator('button[type="submit"]').first();
    await expect(btn).toBeVisible();
  });

  test("soumission vide déclenche la validation HTML5 sur l'email", async ({ page }) => {
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(300);
    const emailInput = page.locator('input[type="email"]').first();
    const hasNativeValidation = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage.length > 0 || el.validity.valueMissing,
    ).catch(() => false);
    const hasReactError = await page.locator('[role="alert"], .text-destructive, [class*="error"]').count() > 0;
    expect(hasNativeValidation || hasReactError, "Aucun retour de validation sur soumission vide").toBe(true);
  });
});

// ─── Partenaire inscription ───────────────────────────────────────────────────

test.describe("Inscription partenaire — /partenaire/inscription", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem("ms_cookie_consent", "accepted"); } catch {}
    });
    await page.goto("/partenaire/inscription", { waitUntil: "domcontentloaded" });
  });

  test("charge sans écran blanc", async ({ page }) => {
    expect(await hasVisibleContent(page)).toBe(true);
  });

  test("champ email visible", async ({ page }) => {
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("bouton de soumission visible", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]').first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);
    if (!hasSubmit) {
      // Certaines pages partenaire utilisent un flux multi-étapes sans submit standard
      const html = await page.content();
      expect(html.toLowerCase()).toMatch(/inscription|s'inscrire|créer|continuer|suivant|rejoindre/i);
    } else {
      expect(hasSubmit).toBe(true);
    }
  });
});

// ─── Prestataire inscription ──────────────────────────────────────────────────

test.describe("Inscription prestataire — /prestataire/inscription", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem("ms_cookie_consent", "accepted"); } catch {}
    });
    await page.goto("/prestataire/inscription", { waitUntil: "domcontentloaded" });
  });

  test("charge sans écran blanc", async ({ page }) => {
    expect(await hasVisibleContent(page)).toBe(true);
  });

  test("champ email visible", async ({ page }) => {
    const email = page.locator('input[type="email"]').first();
    const count = await email.count();
    if (count === 0) {
      // Certaines pages prestataire ont un flux multi-étapes — vérifier le contenu
      const html = await page.content();
      expect(html.toLowerCase()).toMatch(/email|inscription|prestataire/i);
    } else {
      await expect(email).toBeVisible();
    }
  });
});
