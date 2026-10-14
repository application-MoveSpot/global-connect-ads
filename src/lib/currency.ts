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

/** Config par devise (symbole, décimales, locale BCP 47). */
export const CURRENCY_CONFIGS: Record<
  Currency,
  { symbol: string; decimals: number; locale: string }
> = {
  EUR: { symbol: "€", decimals: 2, locale: "fr-FR" },
  USD: { symbol: "$", decimals: 2, locale: "en-US" },
};

/** Détermine la devise à partir d'un code de langue i18n ("fr", "en", …). */
export function getCurrencyFromLang(lang: string): Currency {
  return lang.startsWith("en") ? "USD" : "EUR";
}

/** Formate un montant en centimes avec décimales : 12050 → "120,50 €". */
export function formatCurrencyExact(cents: number, currency: Currency): string {
  const { locale } = CURRENCY_CONFIGS[currency];
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formate un montant entier (unités, pas centimes) : 375 → "375 €". */
export function formatAmount(amount: number, currency: Currency): string {
  const { locale } = CURRENCY_CONFIGS[currency];
  return amount.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Convertit des centimes EUR vers la devise cible (taux d'affichage approximatif, pas de vrai FX). */
export function convertCents(eurCents: number, currency: Currency): number {
  if (currency === "USD") return Math.round(eurCents * 1.08);
  return eurCents;
}
