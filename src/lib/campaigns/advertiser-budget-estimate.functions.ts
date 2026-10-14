import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { estimatePoseFee, inferFormatKey, detectZone } from "@/lib/providers/pose-fee-estimate";

const InputSchema = z.object({
  zones: z.string().max(300),
  days: z.number().int().min(1).max(3650),
  vehicleCount: z.number().int().min(1).max(100),
  vehicleTypes: z.array(z.string()).max(20).default([]),
  needsCovering: z.boolean().default(true),
  needsGraphic: z.boolean().default(false),
  needsVideo: z.boolean().default(false),
  brandName: z.string().max(200).optional(),
});

export type BudgetLine = {
  label: string;
  min: number;
  max: number;
  note?: string;
};

export type AdvertiserBudgetEstimate = {
  lines: BudgetLine[];
  totalMin: number;
  totalMax: number;
  perDayMin: number;
  perDayMax: number;
  aiRecommendation: string;
  zone: string;
};

// ─── Benchmarks location véhicules (€/jour/véhicule selon type) ───────────────

const RENTAL_RATE: Record<string, { min: number; max: number }> = {
  camion_led: { min: 180, max: 350 },
  food_truck: { min: 80, max: 160 },
  van: { min: 60, max: 130 },
  taxi: { min: 40, max: 90 },
  scooter: { min: 20, max: 50 },
  velo_cargo: { min: 15, max: 40 },
  velo_remorque: { min: 12, max: 35 },
  triporteur: { min: 15, max: 40 },
  tutuk: { min: 15, max: 40 },
  voiture: { min: 30, max: 75 },
  autre: { min: 30, max: 80 },
};

const DEFAULT_RENTAL = { min: 30, max: 80 };

// ─── Benchmarks covering (par véhicule, production adhésif hors pose) ─────────

const COVERING_RATE: Record<string, { min: number; max: number }> = {
  camion_led: { min: 0, max: 0 }, // digital, pas d'adhésif
  food_truck: { min: 750, max: 1200 },
  van: { min: 380, max: 700 },
  taxi: { min: 200, max: 400 },
  scooter: { min: 80, max: 200 },
  velo_cargo: { min: 60, max: 150 },
  velo_remorque: { min: 60, max: 150 },
  triporteur: { min: 80, max: 200 },
  tutuk: { min: 80, max: 200 },
  voiture: { min: 250, max: 500 },
  autre: { min: 200, max: 450 },
};

const DEFAULT_COVERING = { min: 200, max: 450 };

function rangeForTypes(
  map: Record<string, { min: number; max: number }>,
  types: string[],
  fallback: { min: number; max: number },
): { min: number; max: number } {
  if (!types.length) return fallback;
  const rates = types.map((t) => map[t] ?? fallback);
  return {
    min: Math.round(rates.reduce((s, r) => s + r.min, 0) / rates.length),
    max: Math.round(rates.reduce((s, r) => s + r.max, 0) / rates.length),
  };
}

export const estimateAdvertiserBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<AdvertiserBudgetEstimate> => {
    const {
      days,
      vehicleCount,
      vehicleTypes,
      needsCovering,
      needsGraphic,
      needsVideo,
      zones,
      brandName,
    } = data;

    const zone = detectZone(zones);
    const zoneCoeff = { paris: 1.25, grande_ville: 1.1, province: 1.0, dom: 1.25 }[zone];

    const lines: BudgetLine[] = [];

    // 1. Location véhicule
    const rentalRate = rangeForTypes(RENTAL_RATE, vehicleTypes, DEFAULT_RENTAL);
    const rentalMin = Math.round(rentalRate.min * zoneCoeff * days * vehicleCount);
    const rentalMax = Math.round(rentalRate.max * zoneCoeff * days * vehicleCount);
    lines.push({
      label: `Location véhicule${vehicleCount > 1 ? `s (×${vehicleCount})` : ""}`,
      min: rentalMin,
      max: rentalMax,
      note: `${days} jour${days > 1 ? "s" : ""} × ${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""}`,
    });

    // 2. Covering / flocage (production adhésif)
    if (needsCovering) {
      const covRate = rangeForTypes(COVERING_RATE, vehicleTypes, DEFAULT_COVERING);
      // Non-digital only — camion_led is digital so skip
      const relevantTypes = vehicleTypes.filter((t: string) => t !== "camion_led");
      const digitalCount = vehicleTypes.filter((t: string) => t === "camion_led").length;
      const adhesifCount = vehicleCount - digitalCount;

      if (adhesifCount > 0) {
        const cMin = Math.round(covRate.min * adhesifCount);
        const cMax = Math.round(covRate.max * adhesifCount);
        lines.push({
          label: `Production covering / adhésif${adhesifCount > 1 ? ` (×${adhesifCount})` : ""}`,
          min: cMin,
          max: cMax,
          note: "Impression + fourniture, hors pose",
        });

        // 3. Frais de pose (rules-based)
        const repVehicleType = relevantTypes[0] ?? "autre";
        const formatKey = inferFormatKey(null, null);
        const feeRange = estimatePoseFee({
          formatKey,
          vehicleType: repVehicleType,
          location: zones,
        });
        const poseMin = Math.round(feeRange.poseMin * adhesifCount);
        const poseMax = Math.round(feeRange.poseMax * adhesifCount);
        lines.push({
          label: `Pose / dépose adhésif${adhesifCount > 1 ? ` (×${adhesifCount})` : ""}`,
          min: poseMin + Math.round(feeRange.deposeMin * adhesifCount),
          max: poseMax + Math.round(feeRange.deposeMax * adhesifCount),
          note: "Estimation selon format et zone",
        });
      }
    }

    // 4. Création graphique (optionnel)
    if (needsGraphic) {
      lines.push({
        label: "Création graphique",
        min: 300,
        max: 800,
        note: "Conception complète brief → BAT",
      });
    }

    // 5. Vidéo publicitaire (optionnel)
    if (needsVideo) {
      lines.push({
        label: "Production vidéo publicitaire",
        min: 800,
        max: 2500,
        note: "Spot 15–30 s, 1 jour de tournage",
      });
    }

    const totalMin = lines.reduce((s, l) => s + l.min, 0);
    const totalMax = lines.reduce((s, l) => s + l.max, 0);

    // 6. AI recommendation
    let aiRecommendation = "";
    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (apiKey) {
        const breakdownStr = lines.map((l) => `• ${l.label} : ${l.min}–${l.max} €`).join("\n");

        const prompt = `Tu es un expert en publicité mobile sur véhicules (covering, flocage, taxi, vélo cargo, van) en France.

Un annonceur veut lancer une campagne MoveSpot.

Paramètres de la campagne :
- Marque / entreprise : ${brandName ?? "non renseignée"}
- Zone géographique : ${zones || "non renseignée"} (zone tarifaire : ${zone})
- Durée : ${days} jour${days > 1 ? "s" : ""}
- Nombre de véhicules : ${vehicleCount}
- Types de véhicules : ${vehicleTypes.join(", ") || "non renseignés"}
- Covering / flocage : ${needsCovering ? "oui" : "non"}
- Création graphique : ${needsGraphic ? "oui" : "non"}
- Production vidéo : ${needsVideo ? "oui" : "non"}

Estimation budgétaire totale : ${totalMin.toLocaleString("fr-FR")}–${totalMax.toLocaleString("fr-FR")} €
Détail :
${breakdownStr}

En 2-3 phrases maximum, donne :
1. Une validation ou un ajustement de cette estimation selon le marché actuel
2. Un conseil stratégique concret (meilleur type de véhicule pour la zone, durée optimale, ROI attendu, ou astuce pour réduire le budget)

Réponds en français, de façon concise et actionnable. Commence directement par ton conseil, sans "Votre budget" ou formule introductive.`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = json.choices?.[0]?.message?.content?.trim();
          if (text) aiRecommendation = text;
        }
      }
    } catch {
      // AI unavailable — rules-based estimate still valid
    }

    if (!aiRecommendation) {
      aiRecommendation = `Pour une campagne de ${days} jour${days > 1 ? "s" : ""} avec ${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""} dans la zone ${zones || "choisie"}, prévoyez un budget de ${totalMin.toLocaleString("fr-FR")}–${totalMax.toLocaleString("fr-FR")} €. Les fourchettes incluent location, covering et pose.`;
    }

    return {
      lines,
      totalMin,
      totalMax,
      perDayMin: Math.round(totalMin / days),
      perDayMax: Math.round(totalMax / days),
      aiRecommendation,
      zone,
    };
  });
