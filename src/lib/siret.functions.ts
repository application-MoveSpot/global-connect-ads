import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Luhn checksum (valide pour SIRET 14 chiffres)
function luhnSiretValid(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(siret[i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

type VerifyResult =
  | { ok: true; siret: string; denomination: string; etatAdministratif: string; adresse: string | null }
  | { ok: false; error: string };

export const verifySiret = createServerFn({ method: "POST" })
  .inputValidator((d: { siret: string }) =>
    z.object({ siret: z.string().regex(/^\d{14}$/, "Le SIRET doit comporter 14 chiffres.") }).parse(d),
  )
  .handler(async ({ data }): Promise<VerifyResult> => {
    const siret = data.siret;
    // La Poste (SIREN 356000000) ne respecte pas Luhn — on laisse passer et l'API INSEE tranchera.
    const isLaPoste = siret.startsWith("356000000");
    if (!isLaPoste && !luhnSiretValid(siret)) {
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

      return { ok: true, siret, denomination, etatAdministratif: etat, adresse };
    } catch (err) {
      console.error("verifySiret crash", err);
      return { ok: false, error: "Erreur réseau lors de la vérification." };
    }
  });
