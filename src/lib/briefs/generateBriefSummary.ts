/**
 * Pure utility — no React, no API calls.
 * Takes a flat proposals array and returns a display-ready summary string.
 * Used by AiBriefSummaryBadge as a deterministic fallback when the LLM cache
 * is unavailable, and directly in any server-side or test context.
 */

export type ProposalInput = {
  id: string;
  status: string; // "pending" | "accepted" | "rejected" | "cancelled" | ...
  vehicle_type?: string | null;
  price?: number | null;
  owner_name?: string | null;
};

export type BriefSummaryResult = {
  /** Short display string, max ~80 chars */
  text: string;
  /** True when the advertiser has pending proposals awaiting a decision */
  actionRequired: boolean;
};

/**
 * Generates a concise human-readable summary for a brief's proposal list.
 *
 * Priority order:
 *  1. Accepted proposals  → highlight count + avg price
 *  2. Pending proposals   → surface best-price offer if available
 *  3. All rejected/closed → report final state
 *  4. Empty list          → "no proposals" message
 */
export function generateBriefSummary(proposals: ProposalInput[]): BriefSummaryResult {
  if (proposals.length === 0) {
    return { text: "Aucune proposition reçue pour l'instant.", actionRequired: false };
  }

  const total = proposals.length;
  const pending = proposals.filter((p) => p.status === "pending");
  const accepted = proposals.filter((p) => p.status === "accepted");
  const rejected = proposals.filter((p) => p.status === "rejected" || p.status === "cancelled");

  // — Accepted proposals are the primary signal —
  if (accepted.length > 0) {
    const pricedAccepted = accepted.filter((p) => p.price != null && p.price > 0);
    if (pricedAccepted.length > 0) {
      const avgPrice = Math.round(
        pricedAccepted.reduce((sum, p) => sum + p.price!, 0) / pricedAccepted.length,
      );
      return {
        text: `${accepted.length} acceptée${accepted.length > 1 ? "s" : ""} sur ${total} · ~${avgPrice} €/mois`,
        actionRequired: false,
      };
    }
    return {
      text: `${accepted.length} proposition${accepted.length > 1 ? "s" : ""} acceptée${accepted.length > 1 ? "s" : ""} sur ${total}`,
      actionRequired: false,
    };
  }

  // — Pending proposals need the advertiser's attention —
  if (pending.length > 0) {
    const pricedPending = pending.filter((p) => p.price != null && p.price > 0);
    if (pricedPending.length >= 2) {
      // Surface the best (lowest) price offer
      const best = pricedPending.reduce((a, b) => (a.price! <= b.price! ? a : b));
      return {
        text: `${pending.length} en attente · meilleure offre ${best.price} €`,
        actionRequired: true,
      };
    }
    if (pricedPending.length === 1) {
      return {
        text: `${pending.length} proposition${pending.length > 1 ? "s" : ""} en attente · ${pricedPending[0].price} €`,
        actionRequired: true,
      };
    }
    return {
      text: `${pending.length} proposition${pending.length > 1 ? "s" : ""} en attente de réponse`,
      actionRequired: true,
    };
  }

  // — All proposals rejected / cancelled —
  if (rejected.length === total) {
    return {
      text: `${total} proposition${total > 1 ? "s" : ""} · aucune retenue`,
      actionRequired: false,
    };
  }

  // — Mixed state fallback —
  return {
    text: `${total} proposition${total > 1 ? "s" : ""} · ${rejected.length} refusée${rejected.length > 1 ? "s" : ""}`,
    actionRequired: false,
  };
}
