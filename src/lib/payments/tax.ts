// Règles de TVA MoveSpot (éditeur établi en Guadeloupe — DOM).
// - Guadeloupe / Martinique / Réunion : TVA locale 8,5 % en sus du HT.
// - France métropolitaine : exonération, art. 259 B du CGI.
// - Union européenne (hors France) : hors taxes, autoliquidation par le preneur
//   (art. 196 de la Directive 2006/112/CE).
// - Reste du monde : exonération, art. 259 B du CGI.

export type TaxDecision = {
  tax_behavior: "exclusive" | "inclusive" | "unspecified";
  exempt: "none" | "exempt" | "reverse";
  /** Libellé court du traitement fiscal. */
  description: string;
  /** Mention légale à faire figurer sur la facture. */
  invoiceMention: string;
  /** Taux appliqué, 0 si exonéré. */
  rate: number;
};

/** Départements d'Outre-Mer où la TVA locale de 8,5 % s'applique. */
const DOM_VAT_PREFIXES = ["971", "972", "974"]; // Guadeloupe, Martinique, Réunion

/** États membres de l'Union européenne (hors FR). */
const EU_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

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
      invoiceMention: "TVA locale DOM 8,5 %",
      rate: 8.5,
    };
  }

  if (country === "FR") {
    // France métropolitaine (codes postaux ne commençant pas par 97)
    return {
      tax_behavior: "unspecified",
      exempt: "reverse",
      description: "Exonération de TVA - Article 259 B du CGI",
      invoiceMention: "TVA non applicable — art. 259 B du CGI",
      rate: 0,
    };
  }

  if (EU_COUNTRIES.includes(country)) {
    return {
      tax_behavior: "unspecified",
      exempt: "reverse",
      description: "Autoliquidation UE - Directive 2006/112/CE",
      invoiceMention: "Autoliquidation — art. 196 de la Directive 2006/112/CE",
      rate: 0,
    };
  }

  // Reste du monde (hors UE)
  return {
    tax_behavior: "unspecified",
    exempt: "reverse",
    description: "Exonération de TVA - Article 259 B du CGI",
    invoiceMention: "Exonération de TVA — article 259 B du CGI",
    rate: 0,
  };
}

/** Montant TTC en centimes à partir d'un HT en centimes. */
export function applyTax(amountCentsHT: number, decision: TaxDecision): number {
  return Math.round(amountCentsHT * (1 + decision.rate / 100));
}
