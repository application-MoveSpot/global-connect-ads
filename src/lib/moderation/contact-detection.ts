// Détecte les coordonnées personnelles dans un champ texte libre pour
// prévenir les accords hors-plateforme (téléphone, email, lien, IBAN).

// French phone numbers: mobile 06/07, fixed 01-09, international +33/0033,
// with optional space / dot / dash separators.
// Lookbehind (?<!\d) prevents matching digit runs inside IBAN / account numbers.
const PHONE_FR_RE = /(?:\+33|0033)\s?[1-9](?:[\s.\-]?\d{2}){4}|(?<!\d)0[1-9](?:[\s.\-]?\d{2}){4}/;

// US phone numbers: (555) 123-4567 | 555-123-4567 | +1 555 123 4567 etc.
// Lookbehind (?<!\d) prevents matching digit runs inside credit card numbers.
const PHONE_US_RE = /(?<!\d)(?:\+1[\s.\-]?)?(?:\(\d{3}\)|\d{3})[\s.\-]\d{3}[\s.\-]\d{4}(?!\d)/;

const PHONE_RE = new RegExp(`${PHONE_FR_RE.source}|${PHONE_US_RE.source}`);

// Standard email address.
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

// Obfuscated "@": "[at]", "(at)", "( at )", "＠" full-width, etc.
const OBFUSCATED_AT_RE = /[\[（(]\s*at\s*[\]）)]|＠/i;

// External links — standard protocols, common social platforms and bypass shorteners.
const URL_RE =
  /https?:\/\/|www\.|t\.me\/|wa\.me\/|wa\.link\/|signal\.me|instagram\.com|facebook\.com|fb\.me\/|linkedin\.com|telegram\.org|tiktok\.com|snapchat\.com|twitter\.com|x\.com|discord\.gg|discord\.com\/invite|youtube\.com|youtu\.be|lien\.bio|linktr\.ee|linktree\.|bit\.ly\/|tinyurl\.com\/|rb\.gy\//i;

// IBAN prefix + check digits + start of BBAN (avoids postal-code false positives).
const IBAN_RE = /\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?\d{4}/;

export type ContactKind = "phone" | "email" | "url" | "iban";

export type ContactHit = { kind: ContactKind; label: string };

export function detectContact(text: string): ContactHit | null {
  if (IBAN_RE.test(text)) return { kind: "iban", label: "IBAN" };
  if (PHONE_RE.test(text)) return { kind: "phone", label: "numéro de téléphone" };
  if (EMAIL_RE.test(text)) return { kind: "email", label: "adresse email" };
  if (OBFUSCATED_AT_RE.test(text)) return { kind: "email", label: "adresse email" };
  if (URL_RE.test(text)) return { kind: "url", label: "lien externe" };
  return null;
}
