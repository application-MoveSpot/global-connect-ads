import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

// Shared helper: analyse an image (base64) via Lovable AI gateway vision
async function analyseImageBase64(
  base64: string,
  mimeType: string,
  systemPrompt: string,
): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`Lovable gateway: ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "{}";
}

// ─── 1. Validation visuel publicitaire (brief créatif) ────────────────────────

const ValidateCreativeInput = z.object({
  base64: z.string().max(2_000_000),
  mimeType: z.string().max(50),
});

export type CreativeValidationResult = {
  ok: boolean;
  score: number; // 0–100 qualité visuelle
  issues: string[];
  tips: string[];
};

export const validateBriefCreative = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ValidateCreativeInput>) => ValidateCreativeInput.parse(d))
  .handler(async ({ data, context }): Promise<CreativeValidationResult> => {
    assertRateLimit(`validate-creative:${context.userId}`, { maxRequests: 20, windowMs: 60_000 });
    const prompt = `Tu es expert en création publicitaire pour véhicules en France.
Analyse ce visuel publicitaire et vérifie :
1. Lisibilité du texte (taille, contraste, police)
2. Présence d'un message clair (slogan ou appel à l'action)
3. Qualité de l'image (résolution, netteté)
4. Conformité légale : pas de contenu choquant, pas de marques tierces visibles sans droits évidents
5. Efficacité pub mobile : visible à 30m, couleurs contrastées

Score de qualité 0-100, issues = problèmes bloquants, tips = améliorations.

Réponds UNIQUEMENT en JSON strict :
{
  "ok": true,
  "score": 82,
  "issues": ["Problème bloquant 1"],
  "tips": ["Amélioration 1", "Amélioration 2"]
}`;

    try {
      const raw = await analyseImageBase64(data.base64, data.mimeType, prompt);
      const parsed = JSON.parse(raw) as CreativeValidationResult;
      return {
        ok: parsed.ok !== false,
        score: Math.min(100, Math.max(0, Number(parsed.score ?? 50))),
        issues: Array.isArray(parsed.issues) ? (parsed.issues as string[]).slice(0, 5) : [],
        tips: Array.isArray(parsed.tips) ? (parsed.tips as string[]).slice(0, 5) : [],
      };
    } catch (err) {
      captureServerException(err, { category: "ai", userId: context.userId });
      return { ok: true, score: 50, issues: [], tips: [] };
    }
  });

// ─── 2. Validation photos d'installation chauffeur ────────────────────────────

const ValidateInstallationInput = z.object({
  photos: z.object({
    front: z.object({ base64: z.string().max(2_000_000), mimeType: z.string().max(50) }),
    left: z.object({ base64: z.string().max(2_000_000), mimeType: z.string().max(50) }),
    right: z.object({ base64: z.string().max(2_000_000), mimeType: z.string().max(50) }),
    rear: z.object({ base64: z.string().max(2_000_000), mimeType: z.string().max(50) }),
  }),
});

export type InstallationPhotoResult = {
  ok: boolean;
  perView: Record<string, { ok: boolean; note: string }>;
  globalNote: string;
};

export const validateInstallationPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ValidateInstallationInput>) => ValidateInstallationInput.parse(d))
  .handler(async ({ data, context }): Promise<InstallationPhotoResult> => {
    assertRateLimit(`validate-photos:${context.userId}`, { maxRequests: 20, windowMs: 60_000 });
    const views = ["front", "left", "right", "rear"] as const;
    const labels: Record<string, string> = {
      front: "Vue de face",
      left: "Vue gauche",
      right: "Vue droite",
      rear: "Vue arrière",
    };

    const results = await Promise.allSettled(
      views.map(async (view) => {
        const { base64, mimeType } = data.photos[view];
        const prompt = `Tu analyses une photo de ${labels[view]} d'un véhicule publicitaire juste après pose d'un covering/sticker.
Vérifie :
1. Le covering/sticker est bien visible et positionné
2. Pas de bulles d'air, décollements, plis majeurs
3. Le visuel publicitaire est lisible
4. Le véhicule entier est dans le champ

Réponds UNIQUEMENT en JSON strict :
{ "ok": true, "note": "Pose correcte, sticker bien positionné." }
Si problème : { "ok": false, "note": "Bulle d'air visible sur le tiers gauche — recommencez la pose." }`;
        const raw = await analyseImageBase64(base64, mimeType, prompt);
        const parsed = JSON.parse(raw) as { ok: boolean; note: string };
        return { view, ok: parsed.ok !== false, note: String(parsed.note ?? "") };
      }),
    );

    const perView: Record<string, { ok: boolean; note: string }> = {};
    let allOk = true;

    for (const r of results) {
      if (r.status === "fulfilled") {
        perView[r.value.view] = { ok: r.value.ok, note: r.value.note };
        if (!r.value.ok) allOk = false;
      } else {
        captureServerException(r.reason, { category: "ai", userId: context.userId });
        perView["unknown"] = { ok: true, note: "Analyse indisponible." };
      }
    }

    const failedViews = Object.entries(perView)
      .filter(([, v]) => !v.ok)
      .map(([k]) => labels[k] ?? k);

    return {
      ok: allOk,
      perView,
      globalNote: allOk
        ? "✅ Toutes les vues sont conformes — vous pouvez transmettre."
        : `⚠️ Problème(s) détecté(s) sur : ${failedViews.join(", ")}. Corrigez avant d'envoyer.`,
    };
  });

// ─── 3. Modération visuelle des briefs (admin) ────────────────────────────────

const ModerateVisualInput = z.object({
  storagePath: z.string().min(3).max(500),
});

export type VisualModerationResult = {
  safe: boolean;
  score_risque: number; // 0–100
  issues: string[];
  verdict: "conforme" | "suspect" | "interdit";
};

export const moderateBriefVisual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ModerateVisualInput>) => ModerateVisualInput.parse(d))
  .handler(async ({ data, context }): Promise<VisualModerationResult> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("campaign-creatives")
      .createSignedUrl(data.storagePath, 120);
    if (error) throw new Error(error.message);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const prompt = `Tu es modérateur publicitaire. Vérifie ce visuel soumis sur MoveSpot, plateforme française de publicité mobile.

CRITÈRES D'INTERDICTION (score_risque >= 70 → non conforme) :
- Contenu sexuel ou nudité
- Violence, armes, sang
- Contenu politique ou religieux partisan
- Marques déposées tierces utilisées sans contexte clair
- Faux logos institutionnels (police, gouvernement)
- Haine, discrimination
- Produits illicites

Réponds UNIQUEMENT en JSON strict :
{
  "safe": true,
  "score_risque": 5,
  "issues": [],
  "verdict": "conforme"
}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: signed.signedUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      });
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = json.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as VisualModerationResult;
      return {
        safe: parsed.safe !== false,
        score_risque: Math.min(100, Math.max(0, Number(parsed.score_risque ?? 0))),
        issues: Array.isArray(parsed.issues) ? (parsed.issues as string[]).slice(0, 5) : [],
        verdict: (["conforme", "suspect", "interdit"].includes(parsed.verdict)
          ? parsed.verdict
          : "conforme") as VisualModerationResult["verdict"],
      };
    } catch (err) {
      captureServerException(err, { category: "ai", userId: context.userId });
      return { safe: true, score_risque: 0, issues: [], verdict: "conforme" };
    }
  });
