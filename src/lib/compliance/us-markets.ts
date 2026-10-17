// Regulatory status of Americas cities for mobile fleet advertising (vehicle wrapping).
// "open"             — permissive; wrapped fleet vehicles circulate freely.
// "license_required" — a municipal advertising-vehicle permit is mandatory before launch.
// "restricted"       — very restrictive; wrapping of third-party fleet is in a legal grey zone.
//
// Sources (US): NYC Admin Code §20-374, CA Vehicle Code §27903, Chicago Mun. Code §4-284.
// Sources (CA): Ontario Highway Traffic Act, BC Motor Vehicle Act.
// Sources (MX): Reglamento de Tránsito CDMX, Ley de Movilidad Jalisco.

export type MarketStatus = "open" | "license_required" | "restricted";
export type AmericasCountry = "US" | "CA" | "MX";

export type UsCity = {
  id: string;
  name: string;
  state: string;
  country: AmericasCountry;
  status: MarketStatus;
  notes?: string;
};

export const US_CITIES: UsCity[] = [
  // ── États-Unis — Open ─────────────────────────────────────────────────────
  { id: "miami-fl", name: "Miami", state: "FL", country: "US", status: "open" },
  { id: "orlando-fl", name: "Orlando", state: "FL", country: "US", status: "open" },
  { id: "las-vegas-nv", name: "Las Vegas", state: "NV", country: "US", status: "open" },
  { id: "dallas-tx", name: "Dallas", state: "TX", country: "US", status: "open" },
  { id: "houston-tx", name: "Houston", state: "TX", country: "US", status: "open" },
  { id: "austin-tx", name: "Austin", state: "TX", country: "US", status: "open" },
  { id: "atlanta-ga", name: "Atlanta", state: "GA", country: "US", status: "open" },
  { id: "phoenix-az", name: "Phoenix", state: "AZ", country: "US", status: "open" },
  { id: "denver-co", name: "Denver", state: "CO", country: "US", status: "open" },
  { id: "nashville-tn", name: "Nashville", state: "TN", country: "US", status: "open" },
  { id: "charlotte-nc", name: "Charlotte", state: "NC", country: "US", status: "open" },
  { id: "tampa-fl", name: "Tampa", state: "FL", country: "US", status: "open" },
  { id: "minneapolis-mn", name: "Minneapolis", state: "MN", country: "US", status: "open" },
  { id: "portland-or", name: "Portland", state: "OR", country: "US", status: "open" },
  // ── États-Unis — Licence requise ──────────────────────────────────────────
  {
    id: "new-york-ny",
    name: "New York City",
    state: "NY",
    country: "US",
    status: "license_required",
    notes:
      "Annual advertising-vehicle license required (NYC Admin Code §20-374, ~$200/yr). " +
      "Itinerary restrictions apply; advertising prohibited in residential zones and within 500 ft of schools.",
  },
  {
    id: "chicago-il",
    name: "Chicago",
    state: "IL",
    country: "US",
    status: "license_required",
    notes:
      "Municipal permit required for the Loop and central commercial zones (Chicago Mun. Code §4-284). " +
      "Contact City Clerk's office before campaign launch.",
  },
  {
    id: "los-angeles-ca",
    name: "Los Angeles",
    state: "CA",
    country: "US",
    status: "license_required",
    notes:
      "Wrapped fleet vehicles allowed; moving LED/digital displays prohibited (CA Vehicle Code §27903). " +
      "Permit required for advertising trucks used solely for advertising purposes.",
  },
  {
    id: "boston-ma",
    name: "Boston",
    state: "MA",
    country: "US",
    status: "license_required",
    notes:
      "Permit required in downtown and Beacon Hill historic districts. " +
      "Apply via Boston Inspectional Services (ISD) at least 30 days before launch.",
  },
  {
    id: "philadelphia-pa",
    name: "Philadelphia",
    state: "PA",
    country: "US",
    status: "license_required",
    notes: "Billboard-truck ordinance requires permit from City's Streets Department.",
  },
  // ── États-Unis — Restreint ────────────────────────────────────────────────
  {
    id: "san-francisco-ca",
    name: "San Francisco",
    state: "CA",
    country: "US",
    status: "restricted",
    notes:
      "Very restrictive for moving billboards. Fleet wrapping for non-dedicated vehicles is a legal grey zone — " +
      "confirm with SF Planning Department before launch.",
  },
  {
    id: "seattle-wa",
    name: "Seattle",
    state: "WA",
    country: "US",
    status: "restricted",
    notes:
      "Municipal ordinance on advertising vehicles under review (2025). " +
      "Monitor Seattle Municipal Code §23.55 for updates; legal review recommended.",
  },
  // ── Canada — Open ─────────────────────────────────────────────────────────
  {
    id: "toronto-on",
    name: "Toronto",
    state: "ON",
    country: "CA",
    status: "open",
    notes: "Fleet wrapping permitted under Ontario Highway Traffic Act. No specific advertising-vehicle permit required.",
  },
  {
    id: "montreal-qc",
    name: "Montréal",
    state: "QC",
    country: "CA",
    status: "open",
    notes: "Fleet wrapping allowed. Content must comply with Quebec's Charter of the French Language for French-language requirements.",
  },
  {
    id: "vancouver-bc",
    name: "Vancouver",
    state: "BC",
    country: "CA",
    status: "open",
    notes: "Permitted under BC Motor Vehicle Act. No municipal advertising-vehicle permit required.",
  },
  {
    id: "calgary-ab",
    name: "Calgary",
    state: "AB",
    country: "CA",
    status: "open",
    notes: "Open market. No specific permit required for wrapped fleet vehicles.",
  },
  {
    id: "ottawa-on",
    name: "Ottawa",
    state: "ON",
    country: "CA",
    status: "open",
    notes: "Fleet wrapping permitted. Bilingual content (FR/EN) recommended for the National Capital Region.",
  },
  // ── Mexique — Open ────────────────────────────────────────────────────────
  {
    id: "mexico-city-cdmx",
    name: "Mexico City",
    state: "CDMX",
    country: "MX",
    status: "open",
    notes: "Permitted under Reglamento de Tránsito CDMX. Historic Centre (Centro Histórico) has additional restrictions.",
  },
  {
    id: "guadalajara-jal",
    name: "Guadalajara",
    state: "JAL",
    country: "MX",
    status: "open",
    notes: "Fleet advertising allowed under Ley de Movilidad Jalisco. No specific permit required.",
  },
  {
    id: "monterrey-nl",
    name: "Monterrey",
    state: "NL",
    country: "MX",
    status: "open",
    notes: "Open market. Strong commercial advertising culture; no fleet advertising permit required.",
  },
  {
    id: "cancun-qroo",
    name: "Cancún",
    state: "Q.Roo",
    country: "MX",
    status: "open",
    notes: "Tourist market. Fleet wrapping widely used; no specific municipal permit required.",
  },
  {
    id: "tijuana-bc",
    name: "Tijuana",
    state: "BC",
    country: "MX",
    status: "open",
    notes: "Border city with active commercial fleet. No specific advertising-vehicle permit required.",
  },
];

export function findUsCity(id: string): UsCity | undefined {
  return US_CITIES.find((c) => c.id === id);
}
