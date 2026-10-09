// Regulatory status of US cities for mobile fleet advertising (vehicle wrapping).
// "open"             — permissive; wrapped fleet vehicles circulate freely.
// "license_required" — a municipal advertising-vehicle permit is mandatory before launch.
// "restricted"       — very restrictive; wrapping of third-party fleet is in a legal grey zone.
//
// Sources: NYC Admin Code §20-374, CA Vehicle Code §27903, Chicago Mun. Code §4-284.
// This table covers the MoveSpot US beachhead markets (2026 launch).

export type MarketStatus = "open" | "license_required" | "restricted";

export type UsCity = {
  id: string;
  name: string;
  state: string;
  status: MarketStatus;
  notes?: string;
};

export const US_CITIES: UsCity[] = [
  // ── Open markets ──────────────────────────────────────────────────────────
  { id: "miami-fl",      name: "Miami",        state: "FL", status: "open" },
  { id: "orlando-fl",    name: "Orlando",      state: "FL", status: "open" },
  { id: "las-vegas-nv",  name: "Las Vegas",    state: "NV", status: "open" },
  { id: "dallas-tx",     name: "Dallas",       state: "TX", status: "open" },
  { id: "houston-tx",    name: "Houston",      state: "TX", status: "open" },
  { id: "austin-tx",     name: "Austin",       state: "TX", status: "open" },
  { id: "atlanta-ga",    name: "Atlanta",      state: "GA", status: "open" },
  { id: "phoenix-az",    name: "Phoenix",      state: "AZ", status: "open" },
  { id: "denver-co",     name: "Denver",       state: "CO", status: "open" },
  { id: "nashville-tn",  name: "Nashville",    state: "TN", status: "open" },
  { id: "charlotte-nc",  name: "Charlotte",    state: "NC", status: "open" },
  { id: "tampa-fl",      name: "Tampa",        state: "FL", status: "open" },
  { id: "minneapolis-mn",name: "Minneapolis",  state: "MN", status: "open" },
  { id: "portland-or",   name: "Portland",     state: "OR", status: "open" },
  // ── License required ──────────────────────────────────────────────────────
  {
    id: "new-york-ny",
    name: "New York City",
    state: "NY",
    status: "license_required",
    notes:
      "Annual advertising-vehicle license required (NYC Admin Code §20-374, ~$200/yr). " +
      "Itinerary restrictions apply; advertising prohibited in residential zones and within 500 ft of schools.",
  },
  {
    id: "chicago-il",
    name: "Chicago",
    state: "IL",
    status: "license_required",
    notes:
      "Municipal permit required for the Loop and central commercial zones (Chicago Mun. Code §4-284). " +
      "Contact City Clerk's office before campaign launch.",
  },
  {
    id: "los-angeles-ca",
    name: "Los Angeles",
    state: "CA",
    status: "license_required",
    notes:
      "Wrapped fleet vehicles allowed; moving LED/digital displays prohibited (CA Vehicle Code §27903). " +
      "Permit required for advertising trucks used solely for advertising purposes.",
  },
  {
    id: "boston-ma",
    name: "Boston",
    state: "MA",
    status: "license_required",
    notes:
      "Permit required in downtown and Beacon Hill historic districts. " +
      "Apply via Boston Inspectional Services (ISD) at least 30 days before launch.",
  },
  {
    id: "philadelphia-pa",
    name: "Philadelphia",
    state: "PA",
    status: "license_required",
    notes:
      "Billboard-truck ordinance requires permit from City's Streets Department.",
  },
  // ── Restricted ────────────────────────────────────────────────────────────
  {
    id: "san-francisco-ca",
    name: "San Francisco",
    state: "CA",
    status: "restricted",
    notes:
      "Very restrictive for moving billboards. Fleet wrapping for non-dedicated vehicles is a legal grey zone — " +
      "confirm with SF Planning Department before launch.",
  },
  {
    id: "seattle-wa",
    name: "Seattle",
    state: "WA",
    status: "restricted",
    notes:
      "Municipal ordinance on advertising vehicles under review (2025). " +
      "Monitor Seattle Municipal Code §23.55 for updates; legal review recommended.",
  },
];

export function findUsCity(id: string): UsCity | undefined {
  return US_CITIES.find((c) => c.id === id);
}
