import { z } from "zod";

// Matches French phone numbers with optional separators (space, dot, dash).
// Covers mainland (01-09), +33, and 0033 variants.
// Does NOT match DOM/TOM international prefixes (+262 etc.) — normalizePhone handles those.
const VALID_RE =
  /^(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}$|^\+33[\s.\-]?[1-9](?:[\s.\-]?\d{2}){4}$/;

export function isValidFrenchPhone(raw: string): boolean {
  return VALID_RE.test(raw.trim());
}

/**
 * Strips formatting and returns E.164 (+33XXXXXXXXX) or null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!isValidFrenchPhone(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0033") && digits.length === 13) return "+" + digits.slice(2);
  if (digits.startsWith("33") && digits.length === 11) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+33" + digits.slice(1);
  return null;
}

/**
 * Formats an E.164 number (+33612345678) as the French local display (06 12 34 56 78).
 * Falls back to the input if it doesn't start with +33.
 */
export function formatPhone(e164: string): string {
  if (!e164.startsWith("+33")) return e164;
  const local = "0" + e164.slice(3);
  return local.match(/.{2}/g)?.join(" ") ?? local;
}

/**
 * Zod schema for an optional French phone number field.
 * Accepts null/empty (optional) but rejects a non-empty string that isn't a valid French number.
 * Normalizes to E.164 on success.
 */
export const frenchPhoneSchema = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || isValidFrenchPhone(v), {
    message: "phone_invalid",
  })
  .transform((v) => (v ? (normalizePhone(v) ?? v) : null));
