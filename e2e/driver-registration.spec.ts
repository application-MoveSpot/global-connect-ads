/**
 * Tests E2E — Inscription chauffeur / poseur
 *
 * Vérifie le flux d'inscription sans créer de compte réel :
 * - La page charge correctement
 * - L'étape "auth" affiche email + password + boutons
 * - La validation bloque une soumission vide
 * - Le formulaire respecte les champs requis
 */

import { test, expect } from "@playwright/test";

test.describe("Inscription chauffeur — rendu et structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chauffeur/inscription", { waitUntil: "domcontentloaded" });
  });

  test("la page charge sans écran blanc", async ({ page }) => {
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    expect(bodyText.length, "La page est vide — écran blanc").toBeGreaterThan(10);
  });

  test("le titre de la page contient 'inscription'", async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain("inscription");
  });

  test("le champ email est présent", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("le champ mot de passe est présent", async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("un bouton de soumission est visible", async ({ page }) => {
    const btn = page.locator('button[type="submit"]').first();
    await expect(btn).toBeVisible();
  });
});

test.describe("Inscription chauffeur — validation du formulaire auth", () => {
  test("cliquer 'Créer mon compte' sans email affiche une erreur de validation HTML5", async ({
    page,
  }) => {
    await page.goto("/chauffeur/inscription", { waitUntil: "domcontentloaded" });

    // Soumettre directement sans remplir les champs
    await page.locator('button[type="submit"]').first().click();

    // L'input email doit avoir une validation native ou un message d'erreur
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMessage.length, "Aucun message de validation HTML5 sur l'email").toBeGreaterThan(0);
  });

  test("email invalide bloque la soumission", async ({ page }) => {
    await page.goto("/chauffeur/inscription", { waitUntil: "domcontentloaded" });

    await page.locator('input[type="email"]').fill("not-an-email");
    await page.locator('input[type="password"]').fill("password123");
    await page.locator('button[type="submit"]').first().click();

    const emailInput = page.locator('input[type="email"]');
    const valid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid, "Un email invalide passe la validation").toBe(false);
  });
});

test.describe("Inscription chauffeur — switch Connexion / Créer un compte", () => {
  test("le toggle 'Se connecter' est présent", async ({ page }) => {
    await page.goto("/chauffeur/inscription", { waitUntil: "domcontentloaded" });
    const loginToggle = page.getByText(/se connecter|connexion|déjà.*compte/i).first();
    await expect(loginToggle).toBeVisible();
  });

  test("basculer vers 'Connexion' change le bouton de soumission", async ({ page }) => {
    await page.goto("/chauffeur/inscription", { waitUntil: "domcontentloaded" });

    const toggle = page.getByText(/se connecter|connexion/i).first();
    await toggle.click();

    const submitBtn = page.locator('button[type="submit"]').first();
    const btnText = await submitBtn.innerText();
    expect(btnText.toLowerCase()).toMatch(/connexion|connecter|login/);
  });
});
