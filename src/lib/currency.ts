export type Currency = "EUR" | "USD";

export interface CurrencyConfig {
  code: Currency;
  locale: string;
  symbol: string;
  /** How much 1 EUR is worth in this currency (for budget conversion display). */
  rateVsEur: number;
}

export const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  EUR: { code: "EUR", locale: "fr-FR", symbol: "€", rateVsEur: 1 },
  USD: { code: "USD", locale: "en-US", symbol: "$", rateVsEur: 1.08 },
};

export function getCurrencyFromLang(lang: string): Currency {
  return lang === "en" ? "USD" : "EUR";
}

/** Format a cent amount as a full currency string: 12050 → "120,50 €" or "$120.51" */
export function formatCurrencyExact(cents: number, currency: Currency = "EUR"): string {
  const { locale, code } = CURRENCY_CONFIGS[currency];
  return (cents / 100).toLocaleString(locale, { style: "currency", currency: code });
}

/** Format a cent amount, no decimal: 12050 → "121 €" or "$121" */
export function formatCurrency(cents: number, currency: Currency = "EUR"): string {
  const { locale, code } = CURRENCY_CONFIGS[currency];
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  });
}

/** Format a whole-unit amount (not cents): 375 → "375 €" or "$375" */
export function formatAmount(amount: number, currency: Currency = "EUR"): string {
  const { locale, code } = CURRENCY_CONFIGS[currency];
  return amount.toLocaleString(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  });
}

/** Convert an EUR cent amount to the target currency for display only (no real FX). */
export function convertCents(eurCents: number, to: Currency): number {
  if (to === "EUR") return eurCents;
  return Math.round(eurCents * CURRENCY_CONFIGS[to].rateVsEur);
}
