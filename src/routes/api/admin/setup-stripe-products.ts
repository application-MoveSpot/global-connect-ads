import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/setup-stripe-products")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const authHeader = request.headers.get("x-admin-setup-token");
        const expectedToken = process.env["ADMIN_SETUP_TOKEN"];
        if (!expectedToken) {
          return Response.json({ error: "ADMIN_SETUP_TOKEN non configuré" }, { status: 503 });
        }
        if (authHeader !== expectedToken) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }

        const key = process.env["STRIPE_SECRET_KEY"];
        if (!key) {
          return Response.json({ error: "STRIPE_SECRET_KEY manquante" }, { status: 500 });
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

        return Response.json({
          ok: true,
          environment: key.startsWith("sk_live_") ? "live" : "test",
          results,
        });
      },
    },
  },
});
