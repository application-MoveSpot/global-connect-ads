// Règles de pauses conducteur par zone réglementaire
// Utilisé côté serveur (tracking.functions.ts) et client (proprietaire.tracking.tsx)

export const DRIVING_RULES = {
  EU:      { breakMin: 44, maxContinuousMin: 270 }, // CE 561/2006 : 4h30 → 45 min
  US:      { breakMin: 30, maxContinuousMin: 480 }, // FMCSA HOS : 8h → 30 min
  CA:      { breakMin: 30, maxContinuousMin: 480 }, // NSC Standard 9 : idem US
  AU:      { breakMin: 30, maxContinuousMin: 330 }, // NHVL : 5h30 → 30 min
  DEFAULT: { breakMin: 44, maxContinuousMin: 270 }, // socle OIT — applique le standard le plus strict
} as const;

export type DrivingZone = keyof typeof DRIVING_RULES;

export function getDrivingRules(code: string) {
  return DRIVING_RULES[code as DrivingZone] ?? DRIVING_RULES.DEFAULT;
}

// Pays disponibles dans le formulaire de réservation
// label : affiché à l'utilisateur
// code  : zone réglementaire (clé de DRIVING_RULES)
// timezone : fuseau IANA pour l'interprétation des plages horaires
export const COUNTRY_OPTIONS = [
  { label: "France métropolitaine", code: "EU",      timezone: "Europe/Paris" },
  { label: "Guadeloupe",            code: "EU",      timezone: "America/Guadeloupe" },
  { label: "Martinique",            code: "EU",      timezone: "America/Martinique" },
  { label: "La Réunion",            code: "EU",      timezone: "Indian/Reunion" },
  { label: "Guyane française",      code: "EU",      timezone: "America/Cayenne" },
  { label: "Mayotte",               code: "EU",      timezone: "Indian/Mayotte" },
  { label: "Nouvelle-Calédonie",    code: "DEFAULT", timezone: "Pacific/Noumea" },
  { label: "Polynésie française",   code: "DEFAULT", timezone: "Pacific/Tahiti" },
  { label: "Belgique",              code: "EU",      timezone: "Europe/Brussels" },
  { label: "Espagne",               code: "EU",      timezone: "Europe/Madrid" },
  { label: "Royaume-Uni",           code: "EU",      timezone: "Europe/London" },
  { label: "États-Unis",            code: "US",      timezone: "America/New_York" },
  { label: "Canada",                code: "CA",      timezone: "America/Toronto" },
  { label: "Australie",             code: "AU",      timezone: "Australia/Sydney" },
  { label: "Maroc",                 code: "DEFAULT", timezone: "Africa/Casablanca" },
  { label: "Autre / International", code: "DEFAULT", timezone: "UTC" },
] as const;

export type CountryOption = (typeof COUNTRY_OPTIONS)[number];
