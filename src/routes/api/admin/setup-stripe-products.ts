import { createAPIFileRoute } from "@tanstack/react-start/api";

/**
 * Route d'initialisation one-shot des produits Stripe.
 * Accès réservé aux admins (vérifié via Supabase).
 * À supprimer après utilisation.
 * GET /api/admin/setup-stripe-products
 */
export const APIRoute = createAPIFileRoute("/api/admin/setup-stripe-products")({
  GET: async ({ request }) => {
    // Vérification admin via header secret
    const authHeader = request.headers.get("x-admin-setup-token");
    const expectedToken = process.env["ADMIN_SETUP_TOKEN"] ?? "movespot-setup-2026";
    if (authHeader !== expectedToken) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY manquante" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { createStripeClient } = await import("@/lib/payments/stripe.server");
    const stripe = createStripeClient();

    const products = [
      {
        name: "Abonnement MoveSpot par véhicule",
        description:
          "Abonnement mensuel par véhicule pour diffuser une campagne publicitaire covering sur la flotte sélectionnée. Facturation au prorata, résiliable à tout moment.",
        lookupKey: "campaign_vehicle_monthly",
        amountCents: 9900,
      },
      {
        name: "Abonnement Prestataire MoveSpot",
        description:
          "Abonnement mensuel donnant accès à l'annuaire prestataires MoveSpot, aux demandes de devis des annonceurs et aux campagnes de covering véhicule disponibles sur votre zone d'intervention. Sans engagement, résiliable à tout moment.",
        lookupKey: "provider_monthly",
        amountCents: 7900,
      },
      {
        name: "Abonnement Partenaire MoveSpot",
        description:
          "Abonnement mensuel au programme partenaire MoveSpot. Accès au réseau d'annonceurs et de prestataires, outils de gestion et de reporting, référencement dans l'annuaire partenaires et conditions préférentielles. Sans engagement, résiliable à tout moment.",
        lookupKey: "partner_monthly",
        amountCents: 14900,
      },
    ];

    const results = [];
    for (const p of products) {
      try {
        const existing = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 });
        if (existing.data.length > 0) {
          results.push({ name: p.name, status: "déjà existant", lookupKey: p.lookupKey });
          continue;
        }
        const product = await stripe.products.create({ name: p.name, description: p.description });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: p.amountCents,
          currency: "eur",
          recurring: { interval: "month" },
          lookup_key: p.lookupKey,
        });
        results.push({
          name: p.name,
          status: "créé",
          lookupKey: p.lookupKey,
          priceId: price.id,
          amount: `${(p.amountCents / 100).toFixed(2)} €/mois`,
        });
      } catch (err) {
        results.push({ name: p.name, status: "erreur", error: (err as Error).message });
      }
    }

    return new Response(JSON.stringify({ ok: true, environment: key.startsWith("sk_live_") ? "live" : "test", results }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
