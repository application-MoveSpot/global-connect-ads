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
    if (!luhnSiretValid(siret)) {
      return { ok: false, error: "Numéro SIRET invalide (clé de contrôle incorrecte)." };
    }

    const clientId = process.env.INSEE_CLIENT_ID;
    const clientSecret = process.env.INSEE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { ok: false, error: "Vérification SIRET indisponible (configuration manquante)." };
    }

    try {
      // 1) OAuth2 client_credentials
      const tokenRes = await fetch("https://api.insee.fr/token", {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      if (!tokenRes.ok) {
        const txt = await tokenRes.text();
        console.error("INSEE token error", tokenRes.status, txt);
        return { ok: false, error: "Service INSEE momentanément indisponible." };
      }
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      const token = tokenJson.access_token;
      if (!token) return { ok: false, error: "Service INSEE momentanément indisponible." };

      // 2) Appel Sirene V3.11
      const sireneRes = await fetch(
        `https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
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
