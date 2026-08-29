import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type TrafficTier = "urban_dense" | "urban" | "suburban" | "rural";

// Keys stored accent-free + lowercase for robust matching
const ZONE_TIERS: Record<string, TrafficTier> = {
  // --- Guadeloupe ---
  "pointe-a-pitre": "urban_dense",
  "les abymes": "urban",
  "abymes": "urban",
  "baie-mahault": "urban",
  "jarry": "urban",         // zone industrielle de Baie-Mahault
  "basse-terre": "urban",
  "gosier": "suburban",
  "sainte-anne": "suburban",
  "saint-francois": "suburban",
  "lamentin": "suburban",
  "capesterre-belle-eau": "rural",
  "capesterre": "rural",
  "petit-bourg": "rural",
  "morne-a-l-eau": "rural",
  "sainte-rose": "rural",
  "anse-bertrand": "rural",
  "port-louis": "rural",
  // --- Martinique ---
  "fort-de-france": "urban",
  "fort de france": "urban",
  "le lamentin": "suburban",
  "schoelcher": "suburban",
  "le robert": "suburban",
  "saint-pierre": "rural",
  // --- La Réunion ---
  "saint-denis": "urban",
  "saint-pierre": "urban",
  "le port": "suburban",
  "saint-paul": "suburban",
  "saint-andre": "rural",
  // --- Guyane ---
  "cayenne": "urban",
  "matoury": "suburban",
  "kourou": "suburban",
  "saint-laurent-du-maroni": "rural",
  // --- France métropolitaine — urban_dense ---
  "paris": "urban_dense",
  "lyon": "urban_dense",
  "marseille": "urban_dense",
  // --- France métropolitaine — urban ---
  "toulouse": "urban",
  "nice": "urban",
  "nantes": "urban",
  "bordeaux": "urban",
  "lille": "urban",
  "strasbourg": "urban",
  "rennes": "urban",
  "montpellier": "urban",
  "grenoble": "urban",
  "toulon": "urban",
  "saint-etienne": "urban",
  "dijon": "urban",
  "angers": "urban",
  "nimes": "urban",
  "villeurbanne": "urban",
  "le mans": "urban",
  "aix-en-provence": "urban",
  "reims": "urban",
  "clermont-ferrand": "urban",
  "brest": "urban",
  "limoges": "urban",
  "amiens": "urban",
  "perpignan": "urban",
  "metz": "urban",
  "nancy": "urban",
  "rouen": "urban",
  "caen": "urban",
};

const TIER_LABELS: Record<TrafficTier, string> = {
  urban_dense: "centre urbain très dense (flux piétons et voitures très élevé, ex. centre Paris/Lyon/Pointe-à-Pitre)",
  urban: "ville urbaine active (flux quotidien soutenu, artères commerciales)",
  suburban: "zone périurbaine ou banlieue (flux modéré, routes secondaires et nationales)",
  rural: "zone rurale ou semi-rurale (faible densité, trafic limité)",
};

function normalizeZone(z: string): string {
  return z
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/['']/g, "-")
    .replace(/\s+/g, " ");
}

function resolveZoneTiers(zones: string[]): string {
  const matched: { zone: string; tier: TrafficTier }[] = [];
  for (const zone of zones) {
    const key = normalizeZone(zone);
    // exact match first, then partial (zone is substring of key or vice versa)
    const tier =
      ZONE_TIERS[key] ??
      (Object.entries(ZONE_TIERS).find(([k]) => key.includes(k) || k.includes(key))?.[1]);
    if (tier) matched.push({ zone, tier });
  }
  if (matched.length === 0) return "(zones non reconnues — estime la densité depuis les noms fournis)";
  return matched
    .map(({ zone, tier }) => `  • ${zone} → ${tier} : ${TIER_LABELS[tier]}`)
    .join("\n");
}

const InputSchema = z.object({
  type: z.string().min(1).max(50),
  condition: z.enum(["excellent", "bon", "moyen", "mauvais"]),
  vehicle_description: z.string().max(120).optional(),
  surface_m2: z.number().min(0).max(100).nullable().optional(),
  km_per_day: z.number().min(0).max(2000).nullable().optional(),
  zones: z.array(z.string().max(100)).max(20).default([]),
  price_per_day: z.number().min(0).max(10000).nullable().optional(),
  photo_urls: z.array(z.string().url()).max(5).default([]),
});

type EstimateResult = {
  suggested_price_min: number;
  suggested_price_max: number;
  estimated_impressions_per_day: number;
  photo_match: "ok" | "doubtful" | "mismatch" | "unverified";
  photo_notes: string;
  condition_alert: string | null;
  ai_generated_detected: boolean;
  ai_generated_notes: string;
  recommendation: string;
};

export const estimateVehicle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<EstimateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    if (data.condition === "mauvais") {
      return {
        suggested_price_min: 0,
        suggested_price_max: 0,
        estimated_impressions_per_day: 0,
        photo_match: "unverified",
        photo_notes: "",
        condition_alert: "Les véhicules en mauvais état ne sont pas acceptés sur MoveSpot.",
        ai_generated_detected: false,
        ai_generated_notes: "",
        recommendation: "Refusé automatiquement : véhicule en mauvais état.",
      };
    }

    const zoneTierContext = resolveZoneTiers(data.zones);

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Tu es un expert en publicité mobile (street marketing, véhicules publicitaires).

Analyse ce véhicule proposé sur MoveSpot et :
1. Vérifie que la/les photo(s) correspondent au type déclaré "${data.type}" et à l'état déclaré "${data.condition}".

   RÈGLES IMPORTANTES de correspondance type/photo :
   - Type "taxi" : accepte AUSSI les VTC (Uber, Bolt, Heetch, etc.). Un VTC est une berline standard sans lumineux ni licence visible (Peugeot 508, Mercedes Classe E, Tesla Model 3, Toyota Prius, etc.). NE refuse PAS une berline propre sous prétexte qu'il manque le lumineux "TAXI" : c'est probablement un VTC, ce qui est valide sur MoveSpot.
   - Type "voiture" : toute voiture particulière convient.
   - Type "van" / "food_truck" : exige un utilitaire/camion aménagé reconnaissable.
   - Type "autre" : vérifie que la photo est cohérente avec la précision fournie par le propriétaire. Si aucune précision n'est fournie, accepte tout véhicule non standard et note "autre non précisé" dans photo_notes.
   - Marque "ne correspond pas" UNIQUEMENT si la photo montre un véhicule clairement d'une autre catégorie (ex: scooter déclaré comme food truck).

2. Détecte INDÉPENDAMMENT si la/les photo(s) ont été générées ou retouchées par une IA. Sois STRICT mais JUSTE :
   - Indices IA : artefacts de diffusion, textures plastiques/lissées anormalement, plaques d'immatriculation illisibles ou incohérentes, reflets/ombres physiquement impossibles, perspectives déformées, détails flous au mauvais endroit, watermarks IA.
   - NE classe PAS comme IA une photo authentique simplement parce qu'elle est nette, bien éclairée ou en studio. Une photo pro reste une photo réelle.
   - En cas de doute raisonnable sur l'authenticité → ai_generated_detected: false, mais signale-le dans recommendation.

3. Estime une fourchette de prix par jour réaliste en € (marché FR) selon type, état, surface, km/jour et zones.
   IMPORTANT : utilise le tier de densité de trafic fourni dans "Densité de trafic par zone" pour calibrer les impressions ET le prix. Un véhicule en zone urban_dense génère 2 à 3× plus d'impressions qu'en zone suburban, et peut justifier un prix 20-40 % plus élevé.
4. Estime les impressions/jour réalistes (vues humaines uniques) selon km/jour, type, zones ET leur densité de trafic.
5. Donne une courte recommandation au propriétaire (rappelle aussi la législation de propriété intellectuelle : photos personnelles, pas de droits tiers violés).

Données déclarées :
- Type: ${data.type}${data.vehicle_description ? ` (précision propriétaire : "${data.vehicle_description}")` : ""}
- État déclaré: ${data.condition}
- Surface publicitaire: ${data.surface_m2 ?? "non renseignée"} m²
- Km parcourus / jour: ${data.km_per_day ?? "non renseigné"}
- Zones: ${data.zones.join(", ") || "non renseignées"}
- Densité de trafic par zone (données MoveSpot) :
${zoneTierContext}
- Prix demandé / jour: ${data.price_per_day ?? "non renseigné"} €

Réponds UNIQUEMENT en JSON strict :
{
  "suggested_price_min": number,
  "suggested_price_max": number,
  "estimated_impressions_per_day": number,
  "photo_match": "ok" | "doubtful" | "mismatch" | "unverified",
  "photo_notes": "court commentaire en français sur la cohérence photo/déclaration (mentionne explicitement si tu acceptes au titre du VTC)",
  "condition_alert": "alerte si l'état réel sur la photo semble pire que déclaré, sinon null",
  "ai_generated_detected": boolean,
  "ai_generated_notes": "explication courte en français (indices visuels précis) si suspicion d'image IA, sinon vide",
  "recommendation": "1-2 phrases en français"
}`,
      },

    ];
    for (const url of data.photo_urls.slice(0, 3)) {
      content.push({ type: "image_url", image_url: { url } });
    }
    if (data.photo_urls.length === 0) {
      content.push({ type: "text", text: "Aucune photo fournie — réponds photo_match: 'unverified'." });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Partial<EstimateResult> = {};
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }

    return {
      suggested_price_min: Number(parsed.suggested_price_min ?? 0),
      suggested_price_max: Number(parsed.suggested_price_max ?? 0),
      estimated_impressions_per_day: Number(parsed.estimated_impressions_per_day ?? 0),
      photo_match: (parsed.photo_match as EstimateResult["photo_match"]) ?? "unverified",
      photo_notes: String(parsed.photo_notes ?? ""),
      condition_alert: parsed.condition_alert ? String(parsed.condition_alert) : null,
      ai_generated_detected: Boolean(parsed.ai_generated_detected),
      ai_generated_notes: String(parsed.ai_generated_notes ?? ""),
      recommendation: String(parsed.recommendation ?? ""),
    };
  });
