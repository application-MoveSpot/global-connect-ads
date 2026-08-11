// Règles de TVA MoveSpot (éditeur établi en Guadeloupe — DOM).
// - Annonceur en France métropolitaine ou hors UE : exonération, art. 259 B du CGI
//   (autoliquidation par le preneur) → tax_behavior "unspecified" + exempt "reverse".
// - Annonceur en Guadeloupe / Martinique / Réunion : TVA locale 8,5 % en sus du HT.

export type TaxDecision = {
  tax_behavior: "exclusive" | "inclusive" | "unspecified";
  exempt: "none" | "exempt" | "reverse";
  description: string;
  /** Taux appliqué, 0 si exonéré. */
  rate: number;
};

/** Départements d'Outre-Mer où la TVA locale de 8,5 % s'applique. */
const DOM_VAT_PREFIXES = ["971", "972", "974"]; // Guadeloupe, Martinique, Réunion

export function determineTaxBehavior(
  advertiserCountry: string,
  advertiserZipCode: string,
): TaxDecision {
  const country = (advertiserCountry || "").trim().toUpperCase();
  const zip = (advertiserZipCode || "").replace(/\s/g, "");

  if (country === "FR" && DOM_VAT_PREFIXES.some((p) => zip.startsWith(p))) {
    return {
      tax_behavior: "exclusive",
      exempt: "none",
      description: "TVA locale DOM - 8,5%",
      rate: 8.5,
    };
  }

  if (country === "FR") {
    // France métropolitaine (codes postaux ne commençant pas par 97)
    return {
      tax_behavior: "unspecified",
      exempt: "reverse",
      description: "Exonération de TVA - Article 259 B du CGI",
      rate: 0,
    };
  }

  // Hors France (UE B2B et hors UE) : exonération / autoliquidation.
  return {
    tax_behavior: "unspecified",
    exempt: "reverse",
    description: "Exonération de TVA - Article 259 B du CGI",
    rate: 0,
  };
}

/** Montant TTC en centimes à partir d'un HT en centimes. */
export function applyTax(amountCentsHT: number, decision: TaxDecision): number {
  return Math.round(amountCentsHT * (1 + decision.rate / 100));
}
