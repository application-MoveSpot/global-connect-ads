// Marché actif : France (FR) ou États-Unis (US).
// Persisté en localStorage + synchronisé avec la locale i18n.

import { useEffect, useState } from "react";

export type Market = "FR" | "US";

const STORAGE_KEY = "movespot_market";
const DEFAULT_MARKET: Market = "FR";

/** Lit le marché depuis localStorage (SSR-safe). */
export function getStoredMarket(): Market {
  if (typeof localStorage === "undefined") return DEFAULT_MARKET;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "US" ? "US" : DEFAULT_MARKET;
  } catch {
    return DEFAULT_MARKET;
  }
}

/** Persiste le marché. */
export function setStoredMarket(market: Market): void {
  try {
    localStorage.setItem(STORAGE_KEY, market);
  } catch {
    // ignore
  }
}

/**
 * Hook : retourne le marché actif et un setter.
 * Détecte automatiquement US si la locale i18n est "en".
 */
export function useMarket(): [Market, (m: Market) => void] {
  const [market, setMarketState] = useState<Market>(getStoredMarket);

  // Synchronise avec la langue du navigateur au premier rendu
  useEffect(() => {
    const stored = getStoredMarket();
    if (stored !== DEFAULT_MARKET) return; // déjà choisi explicitement
    const lang = navigator.language ?? "";
    if (lang.startsWith("en") && !lang.startsWith("en-GB")) {
      setMarketState("US");
    }
  }, []);

  const setMarket = (m: Market) => {
    setStoredMarket(m);
    setMarketState(m);
  };

  return [market, setMarket];
}
