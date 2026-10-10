import { z } from "zod";

// ─── French ───────────────────────────────────────────────────────────────────
// Covers mainland (01-09), +33, and 0033 variants.
const FR_VALID_RE =
  /^(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}$|^\+33[\s.\-]?[1-9](?:[\s.\-]?\d{2}){4}$/;

export function isValidFrenchPhone(raw: string): boolean {
  return FR_VALID_RE.test(raw.trim());
}

/** Strips formatting and returns E.164 (+33XXXXXXXXX) or null if invalid. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!isValidFrenchPhone(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0033") && digits.length === 13) return "+" + digits.slice(2);
  if (digits.startsWith("33") && digits.length === 11) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+33" + digits.slice(1);
  return null;
}

/** Formats an E.164 number (+33612345678) as the French local display (06 12 34 56 78). */
export function formatPhone(e164: string): string {
  if (!e164.startsWith("+33")) return e164;
  const local = "0" + e164.slice(3);
  return local.match(/.{2}/g)?.join(" ") ?? local;
}

// ─── US ───────────────────────────────────────────────────────────────────────
// Covers: (555) 123-4567 | 555-123-4567 | 555.123.4567 | +1 555 123 4567 | 5551234567
const US_VALID_RE =
  /^(?:\+1[\s.\-]?)?(?:\(\d{3}\)|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}$/;

export function isValidUsPhone(raw: string): boolean {
  return US_VALID_RE.test(raw.trim());
}

/** Strips formatting and returns E.164 (+1XXXXXXXXXX) or null if invalid. */
export function normalizeUsPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!isValidUsPhone(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  // Drop leading 1 if present (11 digits)
  const core = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (core.length !== 10) return null;
  return "+1" + core;
}

/** Formats an E.164 US number (+15551234567) as (555) 123-4567. */
export function formatUsPhone(e164: string): string {
  if (!e164.startsWith("+1") || e164.length !== 12) return e164;
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// ─── Market-aware ─────────────────────────────────────────────────────────────

/** Returns true for either a valid French or US phone number. */
export function isValidPhone(raw: string, market: "FR" | "US" = "FR"): boolean {
  return market === "US" ? isValidUsPhone(raw) : isValidFrenchPhone(raw);
}

/** Normalizes to E.164 for either market. */
export function normalizePhoneForMarket(
  raw: string,
  market: "FR" | "US" = "FR",
): string | null {
  return market === "US" ? normalizeUsPhone(raw) : normalizePhone(raw);
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

/** Optional French phone number field — normalizes to E.164. */
export const frenchPhoneSchema = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || isValidFrenchPhone(v), {
    message: "phone_invalid",
  })
  .transform((v) => (v ? (normalizePhone(v) ?? v) : null));

/** Optional US phone number field — normalizes to E.164. */
export const usPhoneSchema = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null))
  .refine((v) => v === null || isValidUsPhone(v), {
    message: "phone_invalid_us",
  })
  .transform((v) => (v ? (normalizeUsPhone(v) ?? v) : null));
