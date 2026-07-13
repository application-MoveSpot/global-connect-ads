// Stripe BYOK server client — Stripe Connect Express enabled
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquant");
  _stripe = new Stripe(key, {
    apiVersion: "2025-01-27.acacia" as unknown as Stripe.LatestApiVersion,
    typescript: true,
  });
  return _stripe;
}

export function isLiveMode() {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
}
