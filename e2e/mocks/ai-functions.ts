/**
 * Mock payloads for Supabase AI Edge Functions.
 * Used by Playwright route interception and unit test stubs.
 */

export const SUPABASE_FUNCTIONS_BASE =
  /https:\/\/[a-z]+\.supabase\.co\/functions\/v1\/(ai-[a-z-]+)/;

// ─── Happy-path responses ────────────────────────────────────────────────────

export const MOCK_SUMMARY_NEGOTIATING = {
  conversation_id: "conv-test-001",
  summary: "Proposition à 850 €/mois reçue. Réponse attendue de votre part.",
  status: "negotiating",
  action_required: true,
  generated_at: new Date().toISOString(),
  cached: false,
};

export const MOCK_SUMMARY_AGREED = {
  conversation_id: "conv-test-002",
  summary: "Accord trouvé à 720 €/mois pour 3 véhicules à Paris 15e.",
  status: "agreed",
  action_required: false,
  generated_at: new Date().toISOString(),
  cached: false,
};

export const MOCK_SUMMARY_CACHED = {
  ...MOCK_SUMMARY_NEGOTIATING,
  cached: true,
};

export const MOCK_SMART_REPLIES = {
  suggestions: [
    "Votre proposition m'intéresse, pouvez-vous détailler ?",
    "Pouvez-vous baisser à 750 € ?",
    "Je confirme, envoyez-moi le contrat.",
  ],
  last_message_id: "msg-test-42",
};

export const MOCK_SMART_REPLIES_EMPTY = {
  suggestions: [],
  last_message_id: "msg-test-42",
};

export const MOCK_TRANSLATION_FR_TO_EN = {
  translation: "Your proposal is very interesting, we could start in October.",
  detected_lang: "fr",
  cached: false,
};

export const MOCK_TRANSLATION_CACHED = {
  ...MOCK_TRANSLATION_FR_TO_EN,
  cached: true,
};

export const MOCK_TRANSLATION_AR = {
  translation: "عرضك مثير للاهتمام، يمكننا البدء في أكتوبر.",
  detected_lang: "fr",
  cached: false,
};

export const MOCK_MODERATION_CLEAN = {
  message_id: "msg-mod-001",
  moderation: {
    intent: "commercial",
    severity: 0.05,
    flags: [],
    suggested_action: null,
    model: "claude-haiku-5-5",
    moderated_at: new Date().toISOString(),
  },
};

export const MOCK_MODERATION_SPAM = {
  message_id: "msg-mod-002",
  moderation: {
    intent: "spam",
    severity: 0.85,
    flags: ["spam", "price_manipulation"],
    suggested_action: "notify_admin",
    model: "claude-haiku-5-5",
    moderated_at: new Date().toISOString(),
  },
};

export const MOCK_MODERATION_WARN = {
  message_id: "msg-mod-003",
  moderation: {
    intent: "inappropriate",
    severity: 0.55,
    flags: ["harassment"],
    suggested_action: "warn_user",
    model: "claude-haiku-5-5",
    moderated_at: new Date().toISOString(),
  },
};

// ─── Error payloads ──────────────────────────────────────────────────────────

export const ERROR_LLM_UNAVAILABLE = {
  error: "upstream connect error or disconnect/reset before headers. upstream unavailable",
};

export const ERROR_TIMEOUT = {
  error: "Function execution timed out after 5000ms",
};

export const ERROR_UNAUTHORIZED = {
  error: "Unauthorized",
};

export const ERROR_CREDITS_EXHAUSTED = {
  error: "AI credits exhausted. Please top up your wallet to continue.",
  code: "AI_CREDITS_EXHAUSTED",
  remaining_credits: 0,
};

export const ERROR_RATE_LIMITED = {
  error: "Too many requests. Retry after 10 seconds.",
  retry_after: 10,
};

// ─── Test dialogue fixtures ──────────────────────────────────────────────────

/** A realistic fr/en/ar mixed conversation for translation tests */
export const MULTILINGUAL_DIALOGUE = [
  { sender: "proprietaire", content: "Bonjour, je suis intéressé par votre brief Paris Nord." },
  { sender: "annonceur", content: "Hello, great! What's your daily mileage in that zone?" },
  { sender: "proprietaire", content: "حوالي 80 كيلومترًا في اليوم، أسافر بشكل رئيسي في المناطق 18 و19." },
  { sender: "annonceur", content: "Parfait, je propose 800 €/mois pour 3 mois ferme." },
  { sender: "proprietaire", content: "C'est un peu bas. Je ne peux pas descendre sous 900 €." },
];

/** A problematic conversation for moderation tests */
export const PROBLEMATIC_DIALOGUE = [
  { sender: "proprietaire", content: "Mon offre est de 700€/mois." },
  {
    sender: "annonceur",
    content:
      "Paye-moi en dehors de la plateforme et je te garantis plus de missions. Mon WhatsApp: +33 6 XX XX XX XX",
  },
  { sender: "proprietaire", content: "C'est une arnaque ce que vous proposez !" },
];

/** A stalled conversation for summary test */
export const STALLED_DIALOGUE = [
  { sender: "annonceur", content: "Votre brief m'intéresse." },
  { sender: "proprietaire", content: "Merci, je reviens vers vous." },
  // 7 days of silence...
];
