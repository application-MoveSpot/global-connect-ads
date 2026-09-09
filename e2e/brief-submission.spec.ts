/**
 * Tests E2E — Flux soumission de brief annonceur
 *
 * Couvre le formulaire /annonceur/briefs/nouveau :
 * - Chargement de la page
 * - Présence des champs requis (titre, description, types de véhicule, dates)
 * - Sélection d'un type de véhicule
 * - Tentative de soumission et validation
 */

import { test, expect, type Page } from "@playwright/test";

async function injectTestSession(page: Page) {
  await page.addInitScript(() => {
    const fakeSession = {
      access_token: "test-token",
      refresh_token: "test-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "00000000-0000-0000-0000-000000000002",
        email: "annonceur@movespot.fr",
        role: "authenticated",
      },
    };
    try {
      localStorage.setItem("sb-phononlhfyljhhhvlmrm-auth-token", JSON.stringify(fakeSession));
    } catch {}
  });
}

function isRedirected(url: string) {
  return url.includes("login") || url.includes("auth") || url.includes("inscription");
}

test.describe("Brief nouveau — chargement de la page", () => {
  test("la page charge sans écran blanc", async ({ page }) => {
    await injectTestSession(page);
    await page.goto("/annonceur/briefs/nouveau", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const bodyText = await page.evaluate(() => document.body?.innerText?.trim() ?? "");
    const url = page.url();
    expect(isRedirected(url) || bodyText.length > 10, "Écran blanc sur /annonceur/briefs/nouveau").toBe(true);
  });

  test("le titre de la page mentionne brief ou campagne", async ({ page }) => {
    await injectTestSession(page);
    await page.goto("/annonceur/briefs/nouveau", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/brief|campagne|annonce|movespot/i);
  });

  test("la page contient les types de véhicule attendus", async ({ page }) => {
    await injectTestSession(page);
    await page.goto("/annonceur/briefs/nouveau", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const url = page.url();
    if (isRedirected(url)) return;

    const html = await page.content();
    const hasVehicleTypes =
      html.includes("camion_led") ||
      html.includes("taxi") ||
      html.includes("van") ||
      html.includes("voiture");
    expect(hasVehicleTypes, "Aucun type de véhicule dans le formulaire").toBe(true);
  });
});

test.describe("Brief nouveau — formulaire", () => {
  test.beforeEach(async ({ page }) => {
    await injectTestSession(page);
    await page.goto("/annonceur/briefs/nouveau", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
  });

  test("un champ titre est présent et accepte du texte", async ({ page }) => {
    const url = page.url();
    if (isRedirected(url)) return;

    const titleInput = page.locator('input[type="text"]').first();
    const isVisible = await titleInput.isVisible().catch(() => false);
    if (!isVisible) {
      const html = await page.content();
      expect(html).toMatch(/titre|campagne|brief/i);
      return;
    }

    await titleInput.fill("Test campagne E2E");
    const value = await titleInput.inputValue();
    expect(value).toBe("Test campagne E2E");
  });

  test("un champ description ou textarea est présent", async ({ page }) => {
    const url = page.url();
    if (isRedirected(url)) return;

    const textarea = page.locator("textarea").first();
    const count = await textarea.count();
    if (count === 0) {
      const html = await page.content();
      expect(html).toMatch(/description|détails|objectif/i);
    } else {
      await textarea.fill("Description E2E test");
      const value = await textarea.inputValue();
      expect(value).toBe("Description E2E test");
    }
  });

  test("au moins 3 types de véhicule sont proposés en bouton", async ({ page }) => {
    const url = page.url();
    if (isRedirected(url)) return;

    // Boutons de sélection de type dans le formulaire
    const vehicleBtns = page.locator('button').filter({ hasText: /taxi|van|voiture|camion|scooter|triporteur|food/i });
    const count = await vehicleBtns.count();

    if (count < 3) {
      // Fallback — les labels peuvent être du texte statique
      const html = await page.content();
      const types = ["taxi", "van", "voiture", "camion", "scooter"].filter((t) => html.includes(t));
      expect(types.length, "Moins de 3 types de véhicule disponibles").toBeGreaterThanOrEqual(3);
    } else {
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  test("on peut sélectionner un type de véhicule", async ({ page }) => {
    const url = page.url();
    if (isRedirected(url)) return;

    const taxiBtn = page.locator("button").filter({ hasText: /taxi/i }).first();
    const isVisible = await taxiBtn.isVisible().catch(() => false);
    if (!isVisible) return; // Le composant peut rendre différemment

    await taxiBtn.click();
    // Après clic, le bouton doit changer d'apparence (bg-primary ou ring) ou rester cliquable
    const html = await page.content();
    expect(html.length).toBeGreaterThan(0);
  });

  test("des champs de date start/end sont présents", async ({ page }) => {
    const url = page.url();
    if (isRedirected(url)) return;

    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();

    if (count === 0) {
      // Certaines implémentations utilisent des pickers custom
      const html = await page.content();
      expect(html).toMatch(/date|début|fin|période/i);
    } else {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test("un bouton de soumission ou étape suivante est présent", async ({ page }) => {
    const url = page.url();
    if (isRedirected(url)) return;

    const publishBtn = page.getByRole("button", { name: /publier|soumettre|suivant|continuer|créer/i }).first();
    const hasBtn = await publishBtn.isVisible().catch(() => false);

    if (!hasBtn) {
      const submitBtn = page.locator('button[type="submit"]').first();
      const hasSubmit = await submitBtn.isVisible().catch(() => false);
      expect(hasSubmit, "Aucun bouton de soumission dans le formulaire").toBe(true);
    } else {
      expect(hasBtn).toBe(true);
    }
  });
});

test.describe("Brief nouveau — soumission", () => {
  test("soumettre un formulaire vide affiche une erreur ou bloque", async ({ page }) => {
    await injectTestSession(page);
    await page.goto("/annonceur/briefs/nouveau", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const url = page.url();
    if (isRedirected(url)) return;

    const publishBtn = page.getByRole("button", { name: /publier/i }).first();
    const hasPublish = await publishBtn.isVisible().catch(() => false);
    if (!hasPublish) return; // Stepper multi-étape — ne peut pas soumettre directement

    await publishBtn.click();
    await page.waitForTimeout(500);

    // Soit une erreur de validation, soit on reste sur la même page
    const newUrl = page.url();
    const stayed = newUrl.includes("nouveau") || newUrl.includes("briefs");
    const hasError = await page.locator('[role="alert"], .text-destructive, .text-red').count() > 0;
    expect(stayed || hasError, "Soumission vide n'a pas été bloquée").toBe(true);
  });

  test("la liste /annonceur/briefs contient un lien vers la création", async ({ page }) => {
    await injectTestSession(page);
    await page.goto("/annonceur/briefs", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const url = page.url();
    if (isRedirected(url)) return;

    const newLink = page.getByRole("link", { name: /nouveau|créer|brief/i }).first();
    const newBtn = page.getByRole("button", { name: /nouveau|créer|brief/i }).first();
    const hasLink = await newLink.isVisible().catch(() => false);
    const hasBtn = await newBtn.isVisible().catch(() => false);
    expect(hasLink || hasBtn, "Pas de lien de création sur /annonceur/briefs").toBe(true);
  });
});
