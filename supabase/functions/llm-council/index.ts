import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 5;
const DAILY_LIMIT_ADMIN = 20;
const MODEL_TIMEOUT_MS = 25_000;

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
];
const CHAIRMAN_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const EXPERT_LABELS = ["Expert A", "Expert B", "Expert C"];

// ── PII sanitization ────────────────────────────────────────────────────────
function sanitizePII(text: string): string {
  return text
    .replace(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g, "[EMAIL]")
    .replace(/\b(?:(?:\+|00)33[\s.\-]?|0)[1-9](?:[\s.\-]?\d{2}){4}\b/g, "[TEL]")
    .replace(/\b\d{3}[\s ]?\d{3}[\s ]?\d{3}[\s ]?\d{5}\b/g, "[SIRET]")
    .replace(/\b[A-Z]{2}[\s\-]?\d{3}[\s\-]?[A-Z]{2}\b/g, "[IMMAT]")
    .replace(/\bFR\d{2}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{3}\b/gi, "[IBAN]");
}

// ── OpenRouter call ──────────────────────────────────────────────────────────
async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 700,
): Promise<string> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://move-spot.com",
        "X-Title": "MoveSpot LLM Council",
        "x-or-no-data": "1",
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json() as { choices: Array<{ message: { content: string } }> };
    return json.choices[0].message.content.trim();
  } finally {
    clearTimeout(tid);
  }
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fence ? fence[1] : text;
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
type OpinionData = {
  analysis: string;
  strengths: string[];
  weaknesses: string[];
  compliance_flags: string[];
  score: number;
};

type PeerReviewData = {
  ranked_best: string;
  key_insights: string[];
  blind_spots: string[];
  divergence_points: string[];
};

type ChairmanData = {
  executive_summary: string;
  synthesis: string;
  recommendations: string[];
  priority_actions: Array<{ action: string; impact: string; effort: string }>;
};

type Opinion = { label: string; data: OpinionData; failed: boolean };
type PeerReview = { reviewer: string; data: PeerReviewData; failed: boolean };

// ── Prompts ──────────────────────────────────────────────────────────────────
const STEP1_SYSTEM = `Tu es un expert senior en publicité mobile et marketing de terrain.
Tu analyses des briefs pour MoveSpot, plateforme française de publicité sur véhicules mobiles (taxis, VTC, camionnettes) en France métropolitaine et en Guadeloupe.
Donne une analyse indépendante, critique et actionnable. Vérifie la conformité avec le droit français (loi Évin, ARPP, DGCCRF).
Réponds UNIQUEMENT en JSON strict sans balises de code.`;

function step1User(brief: string) {
  return `Analyse ce brief publicitaire de façon experte :

${brief}

Réponds en JSON strict :
{"analysis":"analyse critique en 2-3 phrases","strengths":["force 1","force 2","force 3"],"weaknesses":["faiblesse 1","faiblesse 2","faiblesse 3"],"compliance_flags":["risque légal si applicable — sinon tableau vide"],"score":7}`;
}

const STEP2_SYSTEM = `Tu es un auditeur en stratégie publicitaire. Trois experts indépendants ont analysé le même brief.
Identifie convergences, angles morts et classe les analyses par pertinence. Les experts sont anonymisés.
Réponds UNIQUEMENT en JSON strict sans balises de code.`;

function step2User(brief: string, opinions: Opinion[]) {
  const lines = opinions.map(
    (o) =>
      `${o.label} (score ${o.data.score}/10): ${o.data.analysis}\nForces: ${o.data.strengths.join(", ")}\nFaiblesses: ${o.data.weaknesses.join(", ")}`,
  );
  return `Brief analysé :\n${brief}\n\nAnalyses experts :\n${lines.join("\n---\n")}\n\nRéponds en JSON strict :\n{"ranked_best":"Expert A","key_insights":["insight 1","insight 2","insight 3"],"blind_spots":["angle mort 1"],"divergence_points":["désaccord 1 si applicable"]}`;
}

const STEP3_SYSTEM = `Tu es le Chairman du Conseil Expert en Publicité Mobile de MoveSpot.
Tu reçois 3 analyses expertes et leurs évaluations croisées. Synthétise en recommandations finales concrètes et actionnables.
Réponds UNIQUEMENT en JSON strict sans balises de code.`;

function step3User(brief: string, opinions: Opinion[], reviews: PeerReview[]) {
  const opStr = opinions.map((o) => `${o.label}: "${o.data.analysis}" | ${o.data.score}/10`).join("\n");
  const revStr = reviews
    .filter((r) => !r.failed)
    .map((r) => `${r.reviewer}: meilleur=${r.data.ranked_best}, insights=${r.data.key_insights.slice(0, 2).join("; ")}`)
    .join("\n");
  return `Brief analysé :\n${brief}\n\nOpinions expertes :\n${opStr}\n\nÉvaluations croisées :\n${revStr}\n\nRéponds en JSON strict :\n{"executive_summary":"résumé exécutif en 2 phrases","synthesis":"synthèse complète en 3-4 phrases","recommendations":["recommandation 1","recommandation 2","recommandation 3","recommandation 4"],"priority_actions":[{"action":"action 1","impact":"fort","effort":"faible"},{"action":"action 2","impact":"fort","effort":"moyen"}]}`;
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) return json({ error: "OpenRouter API key not configured" }, 503);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── Daily rate limit ───────────────────────────────────────────────────
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: callCount } = await admin
      .from("llm_council_calls")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("called_at", since);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const isAdmin = (roleRow as { role?: string } | null)?.role === "admin";
    const dailyLimit = isAdmin ? DAILY_LIMIT_ADMIN : DAILY_LIMIT;

    if ((callCount ?? 0) >= dailyLimit) {
      return json({ error: "daily_limit_exceeded", limit: dailyLimit, used: callCount ?? 0 }, 429);
    }

    const body = await req.json() as {
      step: 1 | 2 | 3;
      brief?: string;
      opinions?: Opinion[];
      reviews?: PeerReview[];
    };

    if (![1, 2, 3].includes(body.step)) return json({ error: "Invalid step" }, 400);

    // ── Step 1: parallel expert opinions ──────────────────────────────────
    if (body.step === 1) {
      const rawBrief = (body.brief ?? "").trim();
      if (rawBrief.length < 20) return json({ error: "Brief too short (min 20 chars)" }, 400);
      const sanitized = sanitizePII(rawBrief);

      const results = await Promise.allSettled(
        MODELS.map((model) =>
          callOpenRouter(openrouterKey, model, [
            { role: "system", content: STEP1_SYSTEM },
            { role: "user", content: step1User(sanitized) },
          ], 600),
        ),
      );

      const opinions: Opinion[] = results.map((r, i) => {
        const label = EXPERT_LABELS[i];
        if (r.status === "rejected") {
          console.error(`Step1 ${label} failed:`, r.reason);
          return {
            label,
            data: { analysis: "Analyse indisponible.", strengths: [], weaknesses: [], compliance_flags: [], score: 5 },
            failed: true,
          };
        }
        const data = parseJSON<OpinionData>(r.value, {
          analysis: r.value.slice(0, 300),
          strengths: [],
          weaknesses: [],
          compliance_flags: [],
          score: 5,
        });
        return { label, data, failed: false };
      });

      const succeeded = opinions.filter((o) => !o.failed).length;
      if (succeeded === 0) return json({ error: "All models failed at step 1" }, 503);

      return json({ step: 1, opinions, brief_sanitized: sanitized, models_succeeded: succeeded });
    }

    // ── Step 2: cross-peer review ──────────────────────────────────────────
    if (body.step === 2) {
      const opinions = body.opinions ?? [];
      const brief = sanitizePII((body.brief ?? "").trim());
      if (!opinions.length) return json({ error: "No opinions provided" }, 400);

      const results = await Promise.allSettled(
        MODELS.map((model) =>
          callOpenRouter(openrouterKey, model, [
            { role: "system", content: STEP2_SYSTEM },
            { role: "user", content: step2User(brief, opinions) },
          ], 500),
        ),
      );

      const reviews: PeerReview[] = results.map((r, i) => {
        const reviewer = `Reviewer ${EXPERT_LABELS[i]}`;
        if (r.status === "rejected") {
          console.error(`Step2 ${reviewer} failed:`, r.reason);
          return {
            reviewer,
            data: { ranked_best: "Expert A", key_insights: [], blind_spots: [], divergence_points: [] },
            failed: true,
          };
        }
        const data = parseJSON<PeerReviewData>(r.value, {
          ranked_best: "Expert A",
          key_insights: [],
          blind_spots: [],
          divergence_points: [],
        });
        return { reviewer, data, failed: false };
      });

      return json({ step: 2, reviews, models_succeeded: reviews.filter((r) => !r.failed).length });
    }

    // ── Step 3: chairman synthesis ─────────────────────────────────────────
    if (body.step === 3) {
      const opinions = body.opinions ?? [];
      const reviews = body.reviews ?? [];
      const brief = sanitizePII((body.brief ?? "").trim());

      const text = await callOpenRouter(
        openrouterKey,
        CHAIRMAN_MODEL,
        [
          { role: "system", content: STEP3_SYSTEM },
          { role: "user", content: step3User(brief, opinions, reviews) },
        ],
        1000,
      );

      const chairman = parseJSON<ChairmanData>(text, {
        executive_summary: "Synthèse indisponible. Consultez les avis individuels.",
        synthesis: text.slice(0, 400),
        recommendations: [],
        priority_actions: [],
      });

      // Log usage (non-blocking)
      admin
        .from("llm_council_calls")
        .insert({ user_id: user.id, tokens_estimate: 3500 })
        .then(() => {})
        .catch(() => {});

      return json({ step: 3, chairman });
    }

    return json({ error: "Unknown step" }, 400);
  } catch (e) {
    console.error("llm-council unhandled error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
