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

        const key = process.env["MOVESPOT_STRIPE_SECRET_KEY"] ?? process.env["STRIPE_SECRET_KEY"];
        if (!key) {
          return Response.json({ error: "MOVESPOT_STRIPE_SECRET_KEY manquante" }, { status: 500 });
        }

        const { createStripeClient } = await import("@/lib/payments/stripe.server");
        const stripe = createStripeClient();

        const products = [
          // ── Prestataires : 3 formules mensuelles (essai 14 j géré au checkout) ──
          {
            name: "Abonnement Prestataire MoveSpot — Starter",
            description:
              "Accès Starter à l'annuaire poseurs MoveSpot et aux demandes de devis de couverture véhicule sur votre zone. Sans engagement, résiliable à tout moment.",
            lookupKey: "provider_starter",
            amountCents: 2900,
          },
          {
            name: "Abonnement Prestataire MoveSpot — Standard",
            description:
              "Accès Standard à l'annuaire poseurs MoveSpot, aux demandes de devis et aux campagnes disponibles sur votre zone avec priorité de contact. Sans engagement, résiliable à tout moment.",
            lookupKey: "provider_standard",
            amountCents: 4200,
          },
          {
            name: "Abonnement Prestataire MoveSpot — Pro",
            description:
              "Accès Pro complet : annuaire, devis prioritaires, badge Pro, statistiques avancées et support dédié. Sans engagement, résiliable à tout moment.",
            lookupKey: "provider_pro",
            amountCents: 5900,
          },
          // ── Partenaires ──────────────────────────────────────────────────────────
          {
            name: "Abonnement Partenaire MoveSpot",
            description:
              "Abonnement mensuel au programme partner MoveSpot. Accès au réseau d'advertisers et de providers, outils de gestion et de reporting, référencement dans l'annuaire partners et conditions préférentielles. Sans engagement, résiliable à tout moment.",
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
            const product = await stripe.products.create({
              name: p.name,
              description: p.description,
            });
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
