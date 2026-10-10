/** Client + server shared SIRET helpers (no server-only imports). */

/** Luhn-based checksum for a 14-digit SIRET string. */
export function validateSiretLuhn(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  // La Poste (SIREN 356000000) historically fails Luhn — treat as valid.
  if (siret.startsWith("356000000")) return true;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(siret[i], 10);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Display formatting: "XXX XXX XXX XXXXX" (SIREN 3-3-3 + NIC 5). */
export function formatSiretDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 14);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 3));
  if (d.length > 3) parts.push(d.slice(3, 6));
  if (d.length > 6) parts.push(d.slice(6, 9));
  if (d.length > 9) parts.push(d.slice(9, 14));
  return parts.join(" ");
}
