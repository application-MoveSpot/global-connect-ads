// Utilitaire devise — EUR pour le marché France, USD pour le marché US.

export type Currency = "EUR" | "USD";

/** Détermine la devise à partir de la locale i18n ou d'un code pays explicite. */
export function currencyForLocale(locale: string): Currency {
  return locale.startsWith("en") ? "USD" : "EUR";
}

/** Formate un montant en centimes dans la devise et la locale données. */
export function formatCurrency(cents: number, locale: string): string {
  const currency = currencyForLocale(locale);
  return (cents / 100).toLocaleString(locale, { style: "currency", currency });
}

/** Symbole court (`$` ou `€`). */
export function currencySymbol(locale: string): string {
  return currencyForLocale(locale) === "USD" ? "$" : "€";
}

/** Code ISO de la devise. */
export function currencyCode(locale: string): Currency {
  return currencyForLocale(locale);
}
