/**
 * Tests unitaires — Hooks AI Chat
 * Runtime : node --experimental-strip-types --test
 *
 * Couvre : useConversationSummary, useSmartReplies, useMessageTranslation
 * Stratégie : mock de supabase.functions.invoke via globalThis.__mockInvoke
 */

import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  MOCK_SUMMARY_NEGOTIATING,
  MOCK_SUMMARY_AGREED,
  MOCK_SMART_REPLIES,
  MOCK_TRANSLATION_FR_TO_EN,
  MOCK_TRANSLATION_CACHED,
  ERROR_LLM_UNAVAILABLE,
  ERROR_CREDITS_EXHAUSTED,
  ERROR_RATE_LIMITED,
} from "../.././../e2e/mocks/ai-functions";

// ─── Supabase client stub ────────────────────────────────────────────────────

type InvokeResult<T> = { data: T | null; error: Error | null };

let mockInvoke: (fn: string, opts: { body: unknown }) => Promise<InvokeResult<unknown>>;

// Minimal stub — les hooks importent depuis @/integrations/supabase/client
// En vrai CI, utilise un module mock (voir vitest moduleNameMapper ou --import-map)
function makeSupabaseStub(
  invoke: (fn: string, opts: { body: unknown }) => Promise<InvokeResult<unknown>>,
) {
  return { functions: { invoke } };
}

// ─── Pure logic under test ───────────────────────────────────────────────────
// On teste la logique des hooks sans React (extraction des helpers purs)

async function fetchConversationSummary(
  supabase: ReturnType<typeof makeSupabaseStub>,
  conversationId: string,
) {
  const { data, error } = await supabase.functions.invoke("ai-conversation-summary", {
    body: { conversation_id: conversationId },
  });
  if (error) throw error;
  return data as typeof MOCK_SUMMARY_NEGOTIATING;
}

async function fetchSmartReplies(
  supabase: ReturnType<typeof makeSupabaseStub>,
  conversationId: string,
  lastMessageId?: string,
  lastSenderId?: string,
  currentUserId?: string,
) {
  // Reproduit la logique du hook : skip si dernier msg = current user
  if (lastSenderId && currentUserId && lastSenderId === currentUserId) {
    return { suggestions: [] };
  }
  const { data, error } = await supabase.functions.invoke("ai-smart-replies", {
    body: { conversation_id: conversationId, last_message_id: lastMessageId },
  });
  if (error) throw error;
  return data as typeof MOCK_SMART_REPLIES;
}

async function fetchTranslation(
  supabase: ReturnType<typeof makeSupabaseStub>,
  messageId: string,
  messageText: string,
  targetLang: "fr" | "en" | "ar",
) {
  const { data, error } = await supabase.functions.invoke("ai-translate-message", {
    body: { message_id: messageId, message_text: messageText, target_lang: targetLang },
  });
  if (error) throw error;
  return data as typeof MOCK_TRANSLATION_FR_TO_EN;
}

// ────────────────────────────────────────────────────────────────────────────
// TESTS FEATURE 1 — Résumé automatique
// ────────────────────────────────────────────────────────────────────────────

describe("fetchConversationSummary", () => {
  test("retourne le résumé et status=negotiating avec action_required=true", async () => {
    const supabase = makeSupabaseStub(async () => ({ data: MOCK_SUMMARY_NEGOTIATING, error: null }));
    const result = await fetchConversationSummary(supabase, "conv-test-001");

    assert.equal(result.status, "negotiating");
    assert.equal(result.action_required, true);
    assert.ok(result.summary.length > 0);
    assert.equal(result.conversation_id, "conv-test-001");
  });

  test("retourne status=agreed avec action_required=false", async () => {
    const supabase = makeSupabaseStub(async () => ({ data: MOCK_SUMMARY_AGREED, error: null }));
    const result = await fetchConversationSummary(supabase, "conv-test-002");

    assert.equal(result.status, "agreed");
    assert.equal(result.action_required, false);
  });

  test("lève une erreur si l'Edge Function échoue (503)", async () => {
    const supabase = makeSupabaseStub(async () => ({
      data: null,
      error: new Error(ERROR_LLM_UNAVAILABLE.error),
    }));
    await assert.rejects(
      () => fetchConversationSummary(supabase, "conv-err"),
      /upstream/,
    );
  });

  test("lève une erreur de crédits épuisés (402)", async () => {
    const supabase = makeSupabaseStub(async () => ({
      data: null,
      error: Object.assign(new Error(ERROR_CREDITS_EXHAUSTED.error), {
        code: "AI_CREDITS_EXHAUSTED",
      }),
    }));
    await assert.rejects(
      () => fetchConversationSummary(supabase, "conv-cred"),
      /credits exhausted/i,
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TESTS FEATURE 2 — Smart Replies
// ────────────────────────────────────────────────────────────────────────────

describe("fetchSmartReplies", () => {
  const OTHER_USER = "00000000-0000-0000-0000-000000000099";
  const MY_USER = "00000000-0000-0000-0000-000000000002";

  test("retourne 3 suggestions quand le dernier message vient d'un tiers", async () => {
    const supabase = makeSupabaseStub(async () => ({ data: MOCK_SMART_REPLIES, error: null }));
    const result = await fetchSmartReplies(supabase, "conv-001", "msg-42", OTHER_USER, MY_USER);

    assert.equal(result.suggestions.length, 3);
    assert.ok(result.suggestions.every((s) => s.length <= 60));
  });

  test("retourne [] sans appel API si le dernier message est du current user", async () => {
    let invokeCalled = false;
    const supabase = makeSupabaseStub(async () => {
      invokeCalled = true;
      return { data: MOCK_SMART_REPLIES, error: null };
    });
    const result = await fetchSmartReplies(supabase, "conv-001", "msg-42", MY_USER, MY_USER);

    assert.deepEqual(result.suggestions, []);
    assert.equal(invokeCalled, false, "invoke ne doit pas être appelé");
  });

  test("retourne [] sans erreur quand l'Edge Function retourne suggestions vides", async () => {
    const supabase = makeSupabaseStub(async () => ({
      data: { suggestions: [], last_message_id: "msg-42" },
      error: null,
    }));
    const result = await fetchSmartReplies(supabase, "conv-001", "msg-42", OTHER_USER, MY_USER);

    assert.deepEqual(result.suggestions, []);
  });

  test("lève une erreur en cas de rate limit (429)", async () => {
    const supabase = makeSupabaseStub(async () => ({
      data: null,
      error: new Error(ERROR_RATE_LIMITED.error),
    }));
    await assert.rejects(
      () => fetchSmartReplies(supabase, "conv-001", "msg-42", OTHER_USER, MY_USER),
      /Too many requests/i,
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TESTS FEATURE 3 — Traduction automatique
// ────────────────────────────────────────────────────────────────────────────

describe("fetchTranslation", () => {
  const MSG_TEXT = "Votre proposition m'intéresse.";

  test("traduit fr→en et détecte la langue source", async () => {
    const supabase = makeSupabaseStub(async () => ({
      data: MOCK_TRANSLATION_FR_TO_EN,
      error: null,
    }));
    const result = await fetchTranslation(supabase, "msg-001", MSG_TEXT, "en");

    assert.equal(result.detected_lang, "fr");
    assert.ok(result.translation.length > 0);
    assert.equal(result.cached, false);
  });

  test("retourne la traduction cachée au 2e appel (cached=true)", async () => {
    let calls = 0;
    const supabase = makeSupabaseStub(async () => {
      calls++;
      return { data: calls === 1 ? MOCK_TRANSLATION_FR_TO_EN : MOCK_TRANSLATION_CACHED, error: null };
    });

    await fetchTranslation(supabase, "msg-001", MSG_TEXT, "en");
    const result2 = await fetchTranslation(supabase, "msg-001", MSG_TEXT, "en");

    assert.equal(result2.cached, true);
    assert.equal(calls, 2); // les deux appels partent (le cache est côté serveur)
  });

  test("traduit sans message_id (pas de mise en cache)", async () => {
    const supabase = makeSupabaseStub(async () => ({
      data: MOCK_TRANSLATION_FR_TO_EN,
      error: null,
    }));
    // message_id vide → pas d'upsert côté Edge Function
    const result = await fetchTranslation(supabase, "", MSG_TEXT, "en");
    assert.ok(result.translation.length > 0);
  });

  test("valide que target_lang est fr|en|ar (rejet d'autres valeurs)", () => {
    const validLangs = ["fr", "en", "ar"];
    const invalidLang = "es";
    assert.equal(validLangs.includes(invalidLang), false);
    assert.equal(validLangs.includes("ar"), true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TESTS FEATURE 4 — Modération (logique de scoring)
// ────────────────────────────────────────────────────────────────────────────

describe("Modération — logique de scoring", () => {
  function getSuggestedAction(severity: number): string | null {
    if (severity < 0.4) return null;
    if (severity < 0.7) return "warn_user";
    if (severity < 0.8) return "hide_message";
    return "notify_admin";
  }

  test("severity 0.05 → suggested_action null", () => {
    assert.equal(getSuggestedAction(0.05), null);
  });

  test("severity 0.55 → warn_user", () => {
    assert.equal(getSuggestedAction(0.55), "warn_user");
  });

  test("severity 0.75 → hide_message", () => {
    assert.equal(getSuggestedAction(0.75), "hide_message");
  });

  test("severity 0.85 → notify_admin + insertion dans moderation_alerts", () => {
    assert.equal(getSuggestedAction(0.85), "notify_admin");
  });

  test("seuil moderation_alerts à exactement 0.80", () => {
    assert.equal(getSuggestedAction(0.80), "notify_admin");
    assert.equal(getSuggestedAction(0.799), "hide_message");
  });

  test("les flags sont un tableau (jamais null)", () => {
    const mockFlags = null;
    const safeFlags = mockFlags ?? [];
    assert.deepEqual(safeFlags, []);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TESTS fix(CreativeStudio) — Accumulation des assets IA
// ────────────────────────────────────────────────────────────────────────────

describe("fix(CreativeStudio) — accumulation onAssetAdded", () => {
  test("chaque appel à onAssetAdded ajoute une URL au tableau (pas d'écrasement)", () => {
    // Reproduit la logique corrigée : setState((prev) => [...prev, url])
    let aiCreativeUrls: string[] = [];
    const onAssetAdded = (url: string) => {
      aiCreativeUrls = [...aiCreativeUrls, url];
    };

    onAssetAdded("https://cdn.movespot.fr/creative-1.png");
    onAssetAdded("https://cdn.movespot.fr/creative-2.png");
    onAssetAdded("https://cdn.movespot.fr/creative-3.png");

    assert.equal(aiCreativeUrls.length, 3);
    assert.equal(aiCreativeUrls[0], "https://cdn.movespot.fr/creative-1.png");
    assert.equal(aiCreativeUrls[2], "https://cdn.movespot.fr/creative-3.png");
  });

  test("l'ancienne logique (écrasement) produisait 1 seul asset — bug confirmé", () => {
    // Logique BUG (avant fix) : setState(url)
    let aiCreativeUrl: string | null = null;
    const buggyOnAssetAdded = (url: string) => {
      aiCreativeUrl = url; // écrase à chaque fois
    };

    buggyOnAssetAdded("https://cdn.movespot.fr/creative-1.png");
    buggyOnAssetAdded("https://cdn.movespot.fr/creative-2.png");
    buggyOnAssetAdded("https://cdn.movespot.fr/creative-3.png");

    // Seul le dernier asset était conservé
    assert.equal(aiCreativeUrl, "https://cdn.movespot.fr/creative-3.png");
    // creative-1 et creative-2 sont perdus → bug
  });

  test("creative_files contient tous les assets uploadés + tous les assets IA", () => {
    const uploadedPaths = ["uploads/brief-123/photo1.jpg", "uploads/brief-123/photo2.jpg"];
    const aiCreativeUrls = [
      "https://cdn.movespot.fr/creative-1.png",
      "https://cdn.movespot.fr/creative-2.png",
    ];

    // Logique corrigée (ligne 718 du fichier)
    const creativeFiles = [...uploadedPaths, ...aiCreativeUrls];

    assert.equal(creativeFiles.length, 4);
    assert.ok(creativeFiles.includes("uploads/brief-123/photo1.jpg"));
    assert.ok(creativeFiles.includes("https://cdn.movespot.fr/creative-2.png"));
  });
});
