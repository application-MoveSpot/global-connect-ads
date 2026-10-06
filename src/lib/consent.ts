/** Gestion du consentement cookies (CNIL / RGPD art. 82). */

export const CONSENT_KEY = "ms_cookie_consent";
/** 6 mois en millisecondes — durée max de validité du consentement (recommandation CNIL). */
const CONSENT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export type ConsentChoice = "accepted" | "refused";

interface ConsentRecord {
  v: ConsentChoice;
  ts: number;
}

/** Lit le consentement stocké. Retourne null si absent ou expiré (banner à re-présenter). */
export function getConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;

    // Migration : ancien format = chaîne brute "accepted"/"refused"
    if (raw === "accepted" || raw === "refused") {
      setConsent(raw as ConsentChoice);
      return raw as ConsentChoice;
    }

    const record: ConsentRecord = JSON.parse(raw);
    if (Date.now() - record.ts > CONSENT_TTL_MS) {
      localStorage.removeItem(CONSENT_KEY);
      return null; // Expiré → re-présenter le banner
    }
    return record.v;
  } catch {
    return null;
  }
}

/** Enregistre le choix avec horodatage et notifie les autres composants du même onglet. */
export function setConsent(choice: ConsentChoice): void {
  try {
    const record: ConsentRecord = { v: choice, ts: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    window.dispatchEvent(new CustomEvent("ms-consent-change", { detail: choice }));
  } catch {
    // localStorage indisponible (mode privé, etc.)
  }
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent("ms-consent-change", { detail: null }));
  } catch {}
}
