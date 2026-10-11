import { useTranslation } from "react-i18next";
import {
  type Currency,
  getCurrencyFromLang,
  formatCurrency,
  formatCurrencyExact,
  formatAmount,
  convertCents,
  CURRENCY_CONFIGS,
} from "@/lib/currency";

export function useCurrency() {
  const { i18n } = useTranslation();
  const currency: Currency = getCurrencyFromLang(i18n.resolvedLanguage ?? "fr");
  const config = CURRENCY_CONFIGS[currency];

  return {
    /** Active currency code — "EUR" or "USD". */
    currency,
    /** BCP 47 locale string matching the currency — "fr-FR" or "en-US". */
    locale: config.locale,
    /** Currency symbol — "€" or "$". */
    symbol: config.symbol,
    /** Format a cent amount with decimals: 12050 → "120,50 €" */
    fmtExact: (cents: number) => formatCurrencyExact(cents, currency),
    /** Format a cent amount without decimals: 12050 → "121 €" */
    fmt: (cents: number) => formatCurrency(cents, config.locale),
    /** Format a whole-unit amount: 375 → "375 €" */
    fmtAmount: (amount: number) => formatAmount(amount, currency),
    /** Convert EUR cents to the active currency (display only, no real FX). */
    fromEurCents: (eurCents: number) => convertCents(eurCents, currency),
  };
}
