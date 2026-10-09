// Détecte les coordonnées personnelles dans un champ texte libre pour
// prévenir les accords hors-plateforme (téléphone, email, lien, IBAN).

// Catches all French phone number formats: mobiles (06/07), fixed lines (01-05, 08, 09),
// international (+33 / 0033), with optional space/dot/dash separators.
const PHONE_RE =
  /(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}/;

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

const URL_RE =
  /https?:\/\/|www\.|t\.me\/|wa\.me\/|signal\.me|instagram\.com|facebook\.com|linkedin\.com|telegram\.org/i;

// Préfixe IBAN + 2 chiffres + début du BBAN (évite les faux positifs sur les codes postaux)
const IBAN_RE = /\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?\d{4}/;

export type ContactKind = "phone" | "email" | "url" | "iban";

export type ContactHit = { kind: ContactKind; label: string };

export function detectContact(text: string): ContactHit | null {
  if (PHONE_RE.test(text)) return { kind: "phone", label: "numéro de téléphone" };
  if (EMAIL_RE.test(text)) return { kind: "email", label: "adresse email" };
  if (URL_RE.test(text)) return { kind: "url", label: "lien externe" };
  if (IBAN_RE.test(text)) return { kind: "iban", label: "IBAN" };
  return null;
}
