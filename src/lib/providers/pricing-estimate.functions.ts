import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiGatewayFetchConfig } from "@/lib/ai/ai-gateway.server";

const InputSchema = z.object({
  services: z
    .array(z.enum(["covering_vehicule", "video_publicitaire", "creation_graphique"]))
    .min(1)
    .max(3),
  coverage_areas: z.array(z.string().max(100)).max(30).default([]),
  company: z.string().max(200).optional(),
});

type PricingBreakdown = {
  service: string;
  label: string;
  price_min: number;
  price_max: number;
  unit: string;
  notes: string;
};

type EstimateResult = {
  breakdown: PricingBreakdown[];
  pricing_text: string;
  recommendation: string;
};

// Benchmarks tirés de l'étude de marché MoveSpot (FR, août 2026)
const MARKET_BENCHMARKS = `
BENCHMARKS MARCHÉ FRANÇAIS — PUBLICITÉ MOBILE (source : étude MoveSpot 2026)

COVERING VÉHICULE
─────────────────
• Stickers / micro-perforé partiel : 120 – 250 € par véhicule (hors pose)
• Demi-covering (latéraux + arrière) : 380 – 600 € (hors pose)
• Total covering véhicule utilitaire (< 12 m²) : 750 – 1 200 €
• Total covering grand format (> 12 m², bus, semi) : 1 500 – 4 000 €
• Pose & dépose adhésif : 60 – 100 € / heure selon technicité
• Forfait pose standard (berline/van) : 150 – 350 €
• Délai de production : 3 – 10 jours ouvrés
• Majoration Île-de-France / grandes agglomérations : +15 – 25 %
• Remise flotte (≥ 5 véhicules) : –10 – 20 %

CRÉATION GRAPHIQUE
──────────────────
• Déclinaison d'un visuel existant : 80 – 200 €
• Conception complète (brief → BAT) : 300 – 800 €
• Conception multi-formats (sur plusieurs véhicules types) : 600 – 1 500 €
• Révisions incluses : 2 allers-retours standard
• Délai : 5 – 15 jours ouvrés

PRODUCTION VIDÉO PUBLICITAIRE
──────────────────────────────
• Spot courte durée (15–30 s, tournage 1 jour) : 800 – 2 000 €
• Spot moyen format (30–60 s, 2 jours tournage) : 2 000 – 5 000 €
• Vidéo tracking GPS / reportage campagne : 500 – 1 200 €
• Montage seul (rushes fournis) : 200 – 600 €
• Délai : 10 – 30 jours ouvrés

ZONES DE RÉFÉRENCE (impact prix)
─────────────────────────────────
• Paris intra-muros / Île-de-France : +20 % vs moyenne nationale
• Lyon, Marseille, Bordeaux, Nantes : +5 – 10 %
• Villes moyennes (50 k – 200 k hab.) : tarif de référence
• Zones rurales : –5 – 10 % (déplacement possible en sus)
• DOM (Guadeloupe, Martinique, Réunion) : +15 – 30 % (import matériaux)
`;

export const estimateProviderPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<EstimateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const serviceLabels: Record<string, string> = {
      covering_vehicule: "Covering / flocage véhicule",
      video_publicitaire: "Production vidéo publicitaire",
      creation_graphique: "Création graphique",
    };

    const zonesStr =
      data.coverage_areas.length > 0 ? data.coverage_areas.join(", ") : "non renseignées";

    const prompt = `Tu es un expert en tarification des prestataires de publicité mobile (covering véhicule, création graphique, vidéo) en France.

Un prestataire souhaite s'inscrire sur MoveSpot (marketplace de publicité mobile sur véhicules).

Données du prestataire :
- Entreprise : ${data.company || "non renseignée"}
- Services proposés : ${data.services.map((s: string) => serviceLabels[s]).join(", ")}
- Zones d'intervention : ${zonesStr}

Voici les benchmarks du marché français issus de notre étude de marché :
${MARKET_BENCHMARKS}

Ta mission :
1. Pour chaque service proposé par ce prestataire, génère une fourchette de tarifs réaliste et compétitive en tenant compte de ses zones d'intervention.
2. Génère un texte tarifaire professionnel et complet (max 600 caractères) qui peut être copié tel quel dans sa fiche MoveSpot. Ce texte doit être en français, clair, et donner des fourchettes précises par prestation.
3. Donne une courte recommandation de positionnement (1-2 phrases) adaptée à ses zones.

Réponds UNIQUEMENT en JSON strict :
{
  "breakdown": [
    {
      "service": "covering_vehicule" | "video_publicitaire" | "creation_graphique",
      "label": "nom affiché",
      "price_min": number (en euros entiers),
      "price_max": number (en euros entiers),
      "unit": "ex: par véhicule, par projet, par heure",
      "notes": "précision courte (ex: hors pose, délai 5j, remise flotte possible)"
    }
  ],
  "pricing_text": "texte tarifaire complet prêt à copier, max 600 caractères, format professionnel avec bullet points •",
  "recommendation": "1-2 phrases de conseil de positionnement en français"
}`;

    const { url: gatewayUrl, headers: gatewayHeaders } = getAiGatewayFetchConfig(apiKey);
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: gatewayHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Partial<EstimateResult> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    const breakdown = Array.isArray(parsed.breakdown)
      ? parsed.breakdown.map((b: Partial<PricingBreakdown>) => ({
          service: String(b.service ?? ""),
          label: String(b.label ?? ""),
          price_min: Number(b.price_min ?? 0),
          price_max: Number(b.price_max ?? 0),
          unit: String(b.unit ?? ""),
          notes: String(b.notes ?? ""),
        }))
      : [];

    return {
      breakdown,
      pricing_text: String(parsed.pricing_text ?? ""),
      recommendation: String(parsed.recommendation ?? ""),
    };
  });
