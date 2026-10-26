export type Currency = "EUR" | "USD" | "AED" | "XOF";

export type Region = "europe" | "afrique" | "asie" | "amerique" | "moyen_orient";

export const CURRENCY_CONFIGS: Record<
  Currency,
  { symbol: string; decimals: number; locale: string; name: string }
> = {
  EUR: { symbol: "€", decimals: 2, locale: "fr-FR", name: "Euro" },
  USD: { symbol: "$", decimals: 2, locale: "en-US", name: "US Dollar" },
  AED: { symbol: "د.إ", decimals: 2, locale: "ar-AE", name: "Dirham (AED)" },
  XOF: { symbol: "CFA", decimals: 0, locale: "fr-SN", name: "Franc CFA (XOF)" },
};

export const REGION_CURRENCY: Record<Region, Currency> = {
  europe: "EUR",
  moyen_orient: "AED",
  afrique: "XOF",
  asie: "USD",
  amerique: "USD",
};

// Taux d'affichage approx (pas de vrai FX live)
const FX: Record<Currency, number> = { EUR: 1, USD: 1.08, AED: 3.97, XOF: 655.96 };

export function getCurrencyFromRegion(region: Region): Currency {
  return REGION_CURRENCY[region];
}

export function getCurrencyFromLang(lang: string): Currency {
  return lang.startsWith("ar") ? "AED" : lang.startsWith("en") ? "USD" : "EUR";
}

export function currencyForLocale(locale: string): Currency {
  return getCurrencyFromLang(locale);
}

export function convertFromEur(eurAmount: number, currency: Currency): number {
  return eurAmount * FX[currency];
}

export function formatAmount(amount: number, currency: Currency): string {
  const { locale, decimals } = CURRENCY_CONFIGS[currency];
  return amount.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatAmountFromEur(eurAmount: number, currency: Currency): string {
  return formatAmount(convertFromEur(eurAmount, currency), currency);
}

export function formatCurrency(cents: number, locale: string): string {
  const currency = currencyForLocale(locale);
  return (cents / 100).toLocaleString(locale, { style: "currency", currency });
}

export function formatCurrencyExact(cents: number, currency: Currency): string {
  const { locale } = CURRENCY_CONFIGS[currency];
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function currencySymbol(locale: string): string {
  return CURRENCY_CONFIGS[getCurrencyFromLang(locale)].symbol;
}

export function currencyCode(locale: string): Currency {
  return getCurrencyFromLang(locale);
}

export function convertCents(eurCents: number, currency: Currency): number {
  return Math.round(eurCents * FX[currency]);
}
