import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { validateSiretLuhn } from "@/lib/siret";

type VerifyResult =
  | { ok: true; siret: string; denomination: string; etatAdministratif: string; adresse: string | null; isIndividual: boolean; categorieJuridique: string | null }
  | { ok: false; error: string };

export const verifySiret = createServerFn({ method: "POST" })
  .inputValidator((d: { siret: string }) =>
    z.object({ siret: z.string().regex(/^\d{14}$/, "Le SIRET doit comporter 14 chiffres.") }).parse(d),
  )
  .handler(async ({ data }): Promise<VerifyResult> => {
    assertRateLimit(`verify-siret:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
    const siret = data.siret;
    if (!validateSiretLuhn(siret)) {
      console.warn("SIRET Luhn check failed, calling INSEE anyway", siret);
    }

    // Nouvelle API Sirene 3.11 (depuis 2024) : clé d'API unique via header X-INSEE-Api-Key-Integration
    const apiKey =
      process.env.INSEE_API_KEY ||
      process.env.INSEE_CLIENT_SECRET ||
      process.env.INSEE_CLIENT_ID;
    if (!apiKey) {
      return { ok: false, error: "Vérification SIRET indisponible (configuration manquante)." };
    }

    try {
      const sireneRes = await fetch(
        `https://api.insee.fr/api-sirene/3.11/siret/${siret}`,
        {
          headers: {
            "X-INSEE-Api-Key-Integration": apiKey,
            Accept: "application/json",
          },
        },
      );
      if (sireneRes.status === 404) {
        return { ok: false, error: "Aucun établissement trouvé pour ce SIRET." };
      }
      if (!sireneRes.ok) {
        const txt = await sireneRes.text();
        console.error("INSEE sirene error", sireneRes.status, txt);
        return { ok: false, error: "Impossible de vérifier ce SIRET pour le moment." };
      }
      const json = (await sireneRes.json()) as any;
      const e = json?.etablissement;
      if (!e) return { ok: false, error: "Réponse INSEE inattendue." };

      const u = e.uniteLegale ?? {};
      const denomination: string =
        u.denominationUniteLegale ||
        [u.prenomUsuelUniteLegale, u.nomUniteLegale].filter(Boolean).join(" ").trim() ||
        "Établissement";
      const etat: string = e.periodesEtablissement?.[0]?.etatAdministratifEtablissement ?? "?";
      const adr = e.adresseEtablissement ?? {};
      const adresse =
        [
          [adr.numeroVoieEtablissement, adr.typeVoieEtablissement, adr.libelleVoieEtablissement]
            .filter(Boolean)
            .join(" "),
          [adr.codePostalEtablissement, adr.libelleCommuneEtablissement].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(", ") || null;

      if (etat === "F") {
        return { ok: false, error: `Établissement fermé (SIRET ${siret}).` };
      }

      const categorieJuridique: string | null = u.categorieJuridiqueUniteLegale ?? null;
      const isIndividual = !!categorieJuridique && categorieJuridique.startsWith("1");

      return { ok: true, siret, denomination, etatAdministratif: etat, adresse, isIndividual, categorieJuridique };
    } catch (err) {
      console.error("verifySiret crash", err);
      return { ok: false, error: "Erreur réseau lors de la vérification." };
    }
  });
