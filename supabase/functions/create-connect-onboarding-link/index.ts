/**
 * create-connect-onboarding-link — Edge Function
 *
 * Génère (ou récupère) un lien d'onboarding Stripe Connect pour un propriétaire.
 * Crée le compte Stripe Connect si nécessaire, puis renvoie l'URL AccountLink.
 *
 * Auth : JWT propriétaire (rôle 'owner' ou user connecté).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY         = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET_KEY = (Deno.env.get("MOVESPOT_STRIPE_SECRET_KEY") ?? Deno.env.get("STRIPE_SECRET_KEY"))!;
const APP_URL          = Deno.env.get("APP_URL") ?? "https://app.movespot.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── Auth JWT propriétaire ─────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── Profil propriétaire ───────────────────────────────────────────────────
  const { data: profile } = await admin
    .from("owner_profiles")
    .select("id, full_name, stripe_connect_account_id, stripe_charges_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return json({ error: "Owner profile not found" }, 404);

  if (!STRIPE_SECRET_KEY) return json({ error: "Stripe not configured" }, 503);

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  const { data: authUser } = await admin.auth.admin.getUserById(user.id);
  const ownerEmail = authUser?.user?.email ?? "";

  let stripeAccountId = profile.stripe_connect_account_id;

  // ── Créer le compte Stripe Express si absent ──────────────────────────────
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type:         "express",
      country:      "FR",
      email:        ownerEmail || undefined,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { supabase_user_id: user.id },
    });
    stripeAccountId = account.id;

    await admin
      .from("owner_profiles")
      .update({ stripe_connect_account_id: stripeAccountId })
      .eq("user_id", user.id);

    // Sync wallet si existant
    await admin
      .from("owner_wallets")
      .update({ stripe_connect_id: stripeAccountId })
      .eq("owner_id", user.id);
  }

  // ── Générer l'Account Link ─────────────────────────────────────────────────
  const accountLink = await stripe.accountLinks.create({
    account:     stripeAccountId,
    refresh_url: `${APP_URL}/owner/portefeuille?connect=refresh`,
    return_url:  `${APP_URL}/owner/portefeuille?connect=success`,
    type:        "account_onboarding",
  });

  return json({ url: accountLink.url, stripe_account_id: stripeAccountId });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
