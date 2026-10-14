import { useState, useEffect } from "react";
import { getConsent, type ConsentChoice } from "@/lib/consent";

/**
 * Retourne le choix de consentement cookie de l'utilisateur.
 * Se met à jour automatiquement quand l'utilisateur accepte/refuse
 * (même onglet via CustomEvent, autre onglet via StorageEvent).
 */
export function useCookieConsent(): ConsentChoice | null {
  const [consent, setConsent] = useState<ConsentChoice | null>(() => {
    try {
      return getConsent();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncConsent = () => setConsent(getConsent());

    // Même onglet : dispatché par setConsent() dans consent.ts
    window.addEventListener("ms-consent-change", syncConsent);
    // Autre onglet : StorageEvent standard
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener("ms-consent-change", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  return consent;
}
