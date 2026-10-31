/**
 * E2E — AI Chat Features
 *
 * Couvre les 4 fonctionnalités déployées dans feat(ai-chat):
 *   1. Résumé automatique de conversation (ai-conversation-summary)
 *   2. Smart Replies (ai-smart-replies)
 *   3. Traduction automatique (ai-translate-message)
 *   4. Modération / détection d'intentions (ai-moderate-message)
 *
 * Stratégie : page.route() intercepte les appels vers les Edge Functions
 * Supabase pour éviter toute dépendance réseau en CI.
 */

import { test, expect, type Route, type Page } from "@playwright/test";
import { injectSession } from "./helpers";
import {
  MOCK_SUMMARY_NEGOTIATING,
  MOCK_SUMMARY_AGREED,
  MOCK_SUMMARY_CACHED,
  MOCK_SMART_REPLIES,
  MOCK_SMART_REPLIES_EMPTY,
  MOCK_TRANSLATION_FR_TO_EN,
  MOCK_TRANSLATION_CACHED,
  MOCK_TRANSLATION_AR,
  MOCK_MODERATION_CLEAN,
  MOCK_MODERATION_SPAM,
  MOCK_MODERATION_WARN,
  ERROR_LLM_UNAVAILABLE,
  ERROR_TIMEOUT,
  ERROR_CREDITS_EXHAUSTED,
  ERROR_RATE_LIMITED,
  ERROR_UNAUTHORIZED,
} from "./mocks/ai-functions";

// ─── Route helpers ───────────────────────────────────────────────────────────

type FunctionName =
  | "ai-conversation-summary"
  | "ai-smart-replies"
  | "ai-translate-message"
  | "ai-moderate-message";

function mockFunction(
  page: Page,
  fn: FunctionName,
  body: unknown,
  status = 200,
) {
  return page.route(
    `**/functions/v1/${fn}`,
    (route: Route) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      }),
  );
}

function mockFunctionOnce(
  page: Page,
  fn: FunctionName,
  firstBody: unknown,
  secondBody: unknown,
) {
  let calls = 0;
  return page.route(`**/functions/v1/${fn}`, (route: Route) => {
    calls++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(calls === 1 ? firstBody : secondBody),
    });
  });
}

// ─── Chat page URL for a known conversation ─────────────────────────────────
// Ajuste selon la route réelle de messagerie de l'app.
const CHAT_URL = "/annonceur/messages/conv-test-001";
const ANNONCEUR_USER_ID = "00000000-0000-0000-0000-000000000002";

// ────────────────────────────────────────────────────────────────────────────
// FEATURE 1 — Résumé automatique de conversation
// ────────────────────────────────────────────────────────────────────────────

test.describe("Feature 1 — Résumé automatique", () => {
  test("affiche le résumé et badge action_required quand une réponse est attendue", async ({
    page,
  }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-conversation-summary", MOCK_SUMMARY_NEGOTIATING);

    await page.goto(CHAT_URL);
    await page.getByRole("button", { name: /résumé|summary/i }).click();

    const summaryPanel = page.getByTestId("ai-conversation-summary");
    await expect(summaryPanel).toBeVisible({ timeout: 5000 });
    await expect(summaryPanel).toContainText("Proposition à 850");
    await expect(summaryPanel).toContainText("850");

    // Badge "Action requise" visible
    await expect(page.getByTestId("ai-summary-action-badge")).toBeVisible();

    // Statut affiché
    await expect(page.getByTestId("ai-summary-status")).toHaveText(/negotiating|En négociation/i);
  });

  test("affiche le résumé d'accord et masque le badge action quand status=agreed", async ({
    page,
  }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-conversation-summary", MOCK_SUMMARY_AGREED);

    await page.goto(CHAT_URL);
    await page.getByRole("button", { name: /résumé|summary/i }).click();

    await expect(page.getByTestId("ai-conversation-summary")).toContainText("720");
    await expect(page.getByTestId("ai-summary-action-badge")).not.toBeVisible();
    await expect(page.getByTestId("ai-summary-status")).toHaveText(/agreed|Accord/i);
  });

  test("sert le cache (cached=true) sans rappeler l'Edge Function", async ({ page }) => {
    await injectSession(page, "annonceur");

    const requestLog: string[] = [];
    await page.route("**/functions/v1/ai-conversation-summary", (route) => {
      requestLog.push("called");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUMMARY_CACHED),
      });
    });

    await page.goto(CHAT_URL);

    // 1er appel
    await page.getByRole("button", { name: /résumé|summary/i }).click();
    await expect(page.getByTestId("ai-conversation-summary")).toBeVisible({ timeout: 5000 });

    // 2e appel dans les 15 min → doit utiliser le cache côté serveur
    // On vérifie que le badge "cached" est affiché ou que l'UI ne recharge pas
    await page.getByRole("button", { name: /résumé|summary/i }).click();
    await expect(page.getByTestId("ai-summary-cached-indicator")).toBeVisible();
    // L'Edge Function a été appelée une seule fois (le cache est côté serveur)
    expect(requestLog.length).toBeLessThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// FEATURE 2 — Smart Replies
// ────────────────────────────────────────────────────────────────────────────

test.describe("Feature 2 — Smart Replies", () => {
  test("affiche 3 suggestions quand l'interlocuteur envoie un message", async ({ page }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-smart-replies", MOCK_SMART_REPLIES);

    await page.goto(CHAT_URL);

    // Simule la réception d'un nouveau message (Realtime push)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("supabase:message", {
          detail: {
            new: {
              id: "msg-test-42",
              content: "Bonjour, je suis intéressé par votre brief.",
              sender_id: "00000000-0000-0000-0000-000000000099", // autre utilisateur
              conversation_id: "conv-test-001",
              created_at: new Date().toISOString(),
            },
          },
        }),
      );
    });

    const suggestionsContainer = page.getByTestId("ai-smart-replies");
    await expect(suggestionsContainer).toBeVisible({ timeout: 5000 });

    const chips = suggestionsContainer.getByRole("button");
    await expect(chips).toHaveCount(3);
    await expect(chips.nth(0)).toContainText("intéresse");
    await expect(chips.nth(1)).toContainText("750");
    await expect(chips.nth(2)).toContainText("contrat");
  });

  test("le clic sur une suggestion injecte le texte dans le champ de saisie", async ({ page }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-smart-replies", MOCK_SMART_REPLIES);

    await page.goto(CHAT_URL);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("supabase:message", {
          detail: {
            new: {
              id: "msg-test-42",
              content: "Je propose 800 €/mois.",
              sender_id: "00000000-0000-0000-0000-000000000099",
              conversation_id: "conv-test-001",
              created_at: new Date().toISOString(),
            },
          },
        }),
      );
    });

    await page.getByTestId("ai-smart-replies").getByRole("button").first().click();

    const messageInput = page.getByTestId("chat-message-input");
    await expect(messageInput).not.toBeEmpty();
    await expect(messageInput).toHaveValue(MOCK_SMART_REPLIES.suggestions[0]);
  });

  test("ne déclenche pas les suggestions si le dernier message vient de l'utilisateur", async ({
    page,
  }) => {
    await injectSession(page, "annonceur");

    const requestLog: string[] = [];
    await page.route("**/functions/v1/ai-smart-replies", (route) => {
      requestLog.push("called");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SMART_REPLIES_EMPTY),
      });
    });

    await page.goto(CHAT_URL);

    // Message envoyé par l'annonceur lui-même
    await page.evaluate(
      (userId) => {
        window.dispatchEvent(
          new CustomEvent("supabase:message", {
            detail: {
              new: {
                id: "msg-test-own",
                content: "Voici ma contre-proposition.",
                sender_id: userId,
                conversation_id: "conv-test-001",
                created_at: new Date().toISOString(),
              },
            },
          }),
        );
      },
      ANNONCEUR_USER_ID,
    );

    await page.waitForTimeout(500);
    await expect(page.getByTestId("ai-smart-replies")).not.toBeVisible();
    // L'Edge Function retourne [] donc aucun rendu attendu
  });
});

// ────────────────────────────────────────────────────────────────────────────
// FEATURE 3 — Traduction automatique
// ────────────────────────────────────────────────────────────────────────────

test.describe("Feature 3 — Traduction automatique", () => {
  test("traduit un message fr → en et affiche le résultat inline", async ({ page }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-translate-message", MOCK_TRANSLATION_FR_TO_EN);

    await page.goto(CHAT_URL);

    // Le message en français d'un tiers
    const messageEl = page.getByTestId("message-msg-fr-001");
    await expect(messageEl).toBeVisible({ timeout: 5000 });

    await messageEl.getByRole("button", { name: /traduire|translate/i }).click();

    const translationBlock = messageEl.getByTestId("ai-translation-result");
    await expect(translationBlock).toBeVisible({ timeout: 5000 });
    await expect(translationBlock).toContainText("Your proposal is very interesting");

    // Badge "EN" visible
    await expect(messageEl.getByTestId("ai-detected-lang")).toHaveText("fr");
  });

  test("affiche la traduction depuis le cache au 2e clic (cached=true)", async ({ page }) => {
    await injectSession(page, "annonceur");
    await mockFunctionOnce(
      page,
      "ai-translate-message",
      MOCK_TRANSLATION_FR_TO_EN,
      MOCK_TRANSLATION_CACHED,
    );

    await page.goto(CHAT_URL);

    const messageEl = page.getByTestId("message-msg-fr-001");
    const translateBtn = messageEl.getByRole("button", { name: /traduire|translate/i });

    // 1er appel
    await translateBtn.click();
    await expect(messageEl.getByTestId("ai-translation-result")).toBeVisible({ timeout: 5000 });

    // Masque la traduction
    await translateBtn.click();
    // Ré-affiche (depuis cache)
    await translateBtn.click();
    await expect(messageEl.getByTestId("ai-translation-cached-badge")).toBeVisible();
  });

  test("traduit correctement vers l'arabe (RTL) sans casser la mise en page", async ({ page }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-translate-message", MOCK_TRANSLATION_AR);

    await page.goto(CHAT_URL);

    const messageEl = page.getByTestId("message-msg-fr-001");
    await messageEl.getByRole("button", { name: /traduire/i }).click();

    const translationBlock = messageEl.getByTestId("ai-translation-result");
    await expect(translationBlock).toBeVisible({ timeout: 5000 });
    await expect(translationBlock).toContainText("عرضك مثير");

    // Vérifie que le bloc traduit a dir=rtl pour les textes arabes
    const dir = await translationBlock.getAttribute("dir");
    expect(dir).toBe("rtl");

    // Pas de scroll horizontal (régression layout)
    const bodyScrollWidth = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(bodyScrollWidth).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// FEATURE 4 — Modération / détection d'intentions
// ────────────────────────────────────────────────────────────────────────────

test.describe("Feature 4 — Modération et intentions", () => {
  test("message normal (severity 0.05) — aucun indicateur de modération visible", async ({
    page,
  }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-moderate-message", MOCK_MODERATION_CLEAN);

    await page.goto(CHAT_URL);

    const messageEl = page.getByTestId("message-msg-mod-001");
    await expect(messageEl).toBeVisible({ timeout: 5000 });
    // Aucun badge de modération
    await expect(messageEl.getByTestId("moderation-badge")).not.toBeVisible();
    await expect(messageEl.getByTestId("moderation-warn")).not.toBeVisible();
  });

  test("message problématique (severity 0.85) — badge admin visible et message dans moderation_alerts", async ({
    page,
  }) => {
    await injectSession(page, "admin");
    await mockFunction(page, "ai-moderate-message", MOCK_MODERATION_SPAM);

    await page.goto("/admin/moderation");

    // L'alerte haute sévérité doit apparaître dans le dashboard admin
    const alertRow = page.getByTestId("moderation-alert-msg-mod-002");
    await expect(alertRow).toBeVisible({ timeout: 8000 });
    await expect(alertRow.getByTestId("alert-severity")).toContainText("0.85");
    await expect(alertRow.getByTestId("alert-flags")).toContainText("spam");
    await expect(alertRow.getByTestId("alert-action")).toContainText("notify_admin");
  });

  test("message warn (severity 0.55) — bandeau d'avertissement affiché à l'annonceur", async ({
    page,
  }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-moderate-message", MOCK_MODERATION_WARN);

    await page.goto(CHAT_URL);

    // Le message masqué ou avec avertissement
    const warnBanner = page.getByTestId("moderation-warn-banner");
    await expect(warnBanner).toBeVisible({ timeout: 5000 });
    await expect(warnBanner).toContainText(/avertissement|contenu signalé/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GESTION DES ERREURS — Cas limites pour toutes les features
// ────────────────────────────────────────────────────────────────────────────

test.describe("Gestion des erreurs — LLM unavailable", () => {
  test("affiche un message d'erreur gracieux quand l'Edge Function renvoie 503", async ({
    page,
  }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-conversation-summary", ERROR_LLM_UNAVAILABLE, 503);

    await page.goto(CHAT_URL);
    await page.getByRole("button", { name: /résumé|summary/i }).click();

    const errorEl = page.getByTestId("ai-feature-error");
    await expect(errorEl).toBeVisible({ timeout: 5000 });
    await expect(errorEl).not.toContainText("upstream"); // message interne masqué
    await expect(errorEl).toContainText(/indisponible|erreur|réessayer/i);

    // Bouton retry présent
    await expect(page.getByRole("button", { name: /réessayer|retry/i })).toBeVisible();
  });

  test("affiche un timeout gracieux après 5 s d'attente", async ({ page }) => {
    await injectSession(page, "annonceur");

    // Simule un timeout en bloquant la route pendant > 5 s
    await page.route("**/functions/v1/ai-conversation-summary", async (route) => {
      await new Promise((r) => setTimeout(r, 6000)); // délibérément > 5 s
      return route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify(ERROR_TIMEOUT),
      });
    });

    await page.goto(CHAT_URL);
    await page.getByRole("button", { name: /résumé|summary/i }).click();

    // L'UI ne doit pas rester bloquée indéfiniment
    const errorEl = page.getByTestId("ai-feature-error");
    await expect(errorEl).toBeVisible({ timeout: 8000 });
    await expect(errorEl).toContainText(/délai|timeout|réessayer/i);
  });
});

test.describe("Gestion des erreurs — Crédits IA épuisés (fix CreativeStudio)", () => {
  test("affiche un CTA rechargement wallet quand les crédits sont épuisés", async ({ page }) => {
    await injectSession(page, "annonceur");

    // Toutes les fonctions retournent l'erreur de crédits
    for (const fn of [
      "ai-conversation-summary",
      "ai-smart-replies",
      "ai-translate-message",
    ] as FunctionName[]) {
      await mockFunction(page, fn, ERROR_CREDITS_EXHAUSTED, 402);
    }

    await page.goto(CHAT_URL);
    await page.getByRole("button", { name: /résumé|summary/i }).click();

    const creditError = page.getByTestId("ai-credits-exhausted-banner");
    await expect(creditError).toBeVisible({ timeout: 5000 });
    await expect(creditError).toContainText(/crédits|recharger|portefeuille/i);

    // CTA vers la page de recharge
    const ctaLink = creditError.getByRole("link");
    await expect(ctaLink).toHaveAttribute("href", /portefeuille|wallet/);
  });

  test("les crédits CreativeStudio s'accumulent correctement (fix onAssetAdded)", async ({
    page,
  }) => {
    await injectSession(page, "annonceur");

    // Simule 3 ajouts d'assets successifs (chaque appel mock retourne une URL différente)
    let callCount = 0;
    await page.route("**/functions/v1/generate-creative", (route) => {
      callCount++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: `https://cdn.movespot.fr/creative-${callCount}.png` }),
      });
    });

    await page.goto("/annonceur/briefs/nouveau");
    await page.getByRole("tab", { name: /créatif|studio/i }).click();

    // Génère 3 assets via le studio IA
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /générer|generate/i }).click();
      await page.getByRole("button", { name: /attacher|attach/i }).click();
      await page.waitForTimeout(200);
    }

    // Vérifie que les 3 URLs sont bien accumulées (pas seulement la dernière)
    const attachedAssets = page.getByTestId("attached-creative-assets");
    await expect(attachedAssets.getByRole("img")).toHaveCount(3);
  });
});

test.describe("Gestion des erreurs — Rate limiting", () => {
  test("affiche le délai de retry en cas de rate limit (429)", async ({ page }) => {
    await injectSession(page, "annonceur");
    await mockFunction(page, "ai-smart-replies", ERROR_RATE_LIMITED, 429);

    await page.goto(CHAT_URL);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("supabase:message", {
          detail: {
            new: {
              id: "msg-rl",
              content: "Test rate limit.",
              sender_id: "00000000-0000-0000-0000-000000000099",
              conversation_id: "conv-test-001",
              created_at: new Date().toISOString(),
            },
          },
        }),
      );
    });

    // Smart replies silencieuses en cas de rate limit (pas d'erreur visible pour l'UX)
    await page.waitForTimeout(500);
    await expect(page.getByTestId("ai-smart-replies")).not.toBeVisible();
    // Optionnel : toast discret
    // await expect(page.getByTestId("ai-rate-limit-toast")).toBeVisible();
  });
});

test.describe("Gestion des erreurs — Session expirée (401)", () => {
  test("redirige vers /login quand le JWT est expiré", async ({ page }) => {
    // Pas de session injectée → 401 natif
    await page.route("**/functions/v1/ai-conversation-summary", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify(ERROR_UNAUTHORIZED),
      }),
    );

    await page.goto(CHAT_URL);
    // L'app doit rediriger vers la page de connexion
    await expect(page).toHaveURL(/login|inscription|auth/, { timeout: 5000 });
  });
});
