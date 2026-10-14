/**
 * Script one-shot — crée tous les produits et tarifs Stripe nécessaires à MoveSpot.
 * Usage : STRIPE_SECRET_KEY=sk_live_... node scripts/create-stripe-products.mjs
 *
 * Idempotent : si un produit avec le même lookup_key existe déjà, il est ignoré.
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    "❌  STRIPE_SECRET_KEY manquante.\nUsage : STRIPE_SECRET_KEY=sk_... node scripts/create-stripe-products.mjs",
  );
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
const env = key.startsWith("sk_live_") ? "LIVE 🔴" : "TEST 🟡";
console.log(`\n🔌 Connexion Stripe — environnement : ${env}\n`);

const products = [
  {
    name: "Abonnement MoveSpot par véhicule",
    description:
      "Abonnement mensuel par véhicule pour diffuser une campagne publicitaire covering sur la flotte sélectionnée. Facturation au prorata, résiliable à tout moment.",
    lookupKey: "campaign_vehicle_monthly",
    amountCents: 9900, // 99,00 €
    currency: "eur",
  },
  {
    name: "Abonnement Prestataire MoveSpot",
    description:
      "Abonnement mensuel donnant accès à l'annuaire prestataires MoveSpot, aux demandes de devis des annonceurs et aux campagnes de covering véhicule disponibles sur votre zone d'intervention. Sans engagement, résiliable à tout moment.",
    lookupKey: "provider_monthly",
    amountCents: 7900, // 79,00 €
    currency: "eur",
  },
  {
    name: "Abonnement Partenaire MoveSpot",
    description:
      "Abonnement mensuel au programme partenaire MoveSpot. Accès au réseau d'annonceurs et de prestataires, outils de gestion et de reporting, référencement dans l'annuaire partenaires et conditions préférentielles. Sans engagement, résiliable à tout moment.",
    lookupKey: "partner_monthly",
    amountCents: 14900, // 149,00 €
    currency: "eur",
  },
];

for (const p of products) {
  try {
    // Vérifie si le lookup_key existe déjà
    const existing = await stripe.prices.list({ lookup_keys: [p.lookupKey], limit: 1 });
    if (existing.data.length > 0) {
      const price = existing.data[0];
      console.log(
        `⏭️  ${p.name} — déjà existant (${p.lookupKey} → ${(price.unit_amount / 100).toFixed(2)} €/mois)`,
      );
      continue;
    }

    // Crée le produit
    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
    });

    // Crée le tarif récurrent avec lookup_key
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: p.amountCents,
      currency: p.currency,
      recurring: { interval: "month" },
      lookup_key: p.lookupKey,
      transfer_lookup_key: false,
    });

    console.log(`✅  ${p.name}`);
    console.log(`    Produit : ${product.id}`);
    console.log(`    Prix    : ${price.id} — ${(p.amountCents / 100).toFixed(2)} €/mois`);
    console.log(`    Key     : ${p.lookupKey}\n`);
  } catch (err) {
    console.error(`❌  Erreur pour ${p.name} :`, err.message);
  }
}

console.log("\n🎉 Terminé. Vos produits sont prêts dans Stripe.\n");
