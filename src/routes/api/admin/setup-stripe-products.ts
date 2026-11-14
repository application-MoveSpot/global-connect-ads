import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/setup-stripe-products")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);

        // Strip all control chars + whitespace (Cloudflare secrets can carry trailing \n).
        const sanitize = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, "").trim();

        // ── 1. Static token check ───────────────────────────────────────────────
        const rawExpected = process.env["ADMIN_SETUP_TOKEN"];
        const expectedToken = rawExpected ? sanitize(rawExpected) : null;

        const headerDirect = request.headers.get("x-admin-setup-token");
        const authHeader = request.headers.get("authorization");
        const bearerRaw = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
        const bearerValue = bearerRaw ? sanitize(bearerRaw) : null;

        const receivedToken = headerDirect ? sanitize(headerDirect) : (bearerValue ?? "");

        let authorized = !!expectedToken && receivedToken === expectedToken;

        // ── 2. Fallback: Supabase admin session ─────────────────────────────────
        // If static token missing/wrong, accept a valid admin Supabase JWT.
        if (!authorized && bearerValue && bearerValue.startsWith("eyJ")) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const {
              data: { user },
              error: authErr,
            } = await supabaseAdmin.auth.getUser(bearerValue);
            if (!authErr && user) {
              const { data: roleRow } = await supabaseAdmin
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .eq("role", "admin")
                .maybeSingle();
              authorized = roleRow !== null;
            }
          } catch {
            // supabaseAdmin unavailable — stay unauthorized
          }
        }

        if (!authorized) {
          return Response.json(
            {
              error: "Non autorisé",
              hint: expectedToken
                ? "Vérifiez x-admin-setup-token / Authorization: Bearer, ou connectez-vous en tant qu'admin."
                : "ADMIN_SETUP_TOKEN non configuré — connectez-vous en tant qu'admin depuis /admin/dashboard.",
            },
            { status: 401 },
          );
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
