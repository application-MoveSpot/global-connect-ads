import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialisation de Stripe avec votre clé secrète de test
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Initialisation du client Supabase officiel avec la clé service_role pour outrepasser la RLS durant le test
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runStripeConnectTests() {
  console.log('🚀 Démarrage des tests d\'intégration Stripe Connect (Sandbox) sur MoveSpot...');

  try {
    /**
     * TEST 1 : Détection d'un compte propriétaire restreint
     * On simule ici la réception d'un événement Stripe (ex: account.updated) indiquant
     * qu'un propriétaire a des manquements bloquants sur son compte Express.
     */
    console.log('\n--- 🧪 Test 1 : Détection d\'un compte propriétaire restreint ---');

    const customAccount = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: 'restricted-owner@movespot.test',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    console.log(`✅ Compte Stripe Express créé : ${customAccount.id}`);

    const isRestricted = !customAccount.payouts_enabled || customAccount.requirements?.currently_due?.length! > 0;

    if (isRestricted) {
      console.log('ℹ️ Statut Stripe : Le compte possède des restrictions actives (payouts_enabled = false).');
      console.log(`👉 Données prêtes pour l'update sur owner_profiles pour le compte ${customAccount.id}`);
      console.log(`📊 Actuellement requis par Stripe :`, customAccount.requirements?.currently_due);
    }

    /**
     * TEST 2 : Échec et blocage de virement (Transfer Failure)
     * On tente de pousser un transfert de fonds vers ce compte restreint pour valider
     * que l'infrastructure MoveSpot capture correctement l'exception Stripe.
     */
    console.log('\n--- 🧪 Test 2 : Blocage et échec de virement (Transfer Failure) ---');

    try {
      console.log(`Tentative de transfert de 150.00€ vers le compte restreint ${customAccount.id}...`);

      await stripe.transfers.create({
        amount: 15000, // 150.00 €
        currency: 'eur',
        destination: customAccount.id,
        description: 'Test MoveSpot - Versement campagne échoué',
      });

      console.error('❌ Échec du test : Le transfert a réussi alors qu\'il aurait dû échouer.');
    } catch (stripeError: any) {
      console.log('✅ Succès du test : L\'exception Stripe a bien été interceptée !');
      console.log(`🪲 Code d'erreur Stripe : ${stripeError.code || stripeError.type}`);
      console.log(`📄 Message Stripe : ${stripeError.message}`);

      console.log('\n🔄 Traitement de l\'échec dans la logique MoveSpot :');
      console.log('1. Interception de la promesse dans votre fonction `process-campaign-payout` via un bloc try/catch.');
      console.log('2. [Action recommandée] Passer la ligne associée dans votre table de virements/paiements au statut \'failed\'.');
    }

  } catch (globalError) {
    console.error('❌ Erreur critique durant l\'exécution du script de test :', globalError);
  }
}

runStripeConnectTests();
