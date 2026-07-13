# Migration vers Stripe + Stripe Connect

## Contexte important — décision technique

Le Stripe intégré « seamless » de Lovable (sans clé API) **ne supporte pas Stripe Connect** (comptes Express, transferts vers propriétaires, onboarding KYC). Pour reverser automatiquement aux propriétaires, on a **deux options** :

- **A. Stripe BYOK (Bring Your Own Key)** — vous créez un compte Stripe, vous fournissez votre clé secrète, Connect est activé. C'est la seule option compatible avec des transferts automatiques marketplace en France.
- **B. Stripe intégré seamless pour l'encaissement + reversement manuel** — CB via Lovable pour les annonceurs, mais on garde IBAN propriétaire + export SEPA côté admin pour les reversements.

**Je pars sur A (BYOK + Connect)** puisque vous avez demandé Connect. Vous devrez :
1. Créer un compte Stripe sur stripe.com (10 min)
2. Activer Connect (Settings → Connect → Get started, choisir "Platform or marketplace")
3. Me fournir votre `STRIPE_SECRET_KEY` (sk_test_… en test, puis sk_live_… en prod) via l'outil de secret sécurisé
4. Configurer le webhook Stripe vers `/api/public/stripe/webhook` (je vous donnerai l'URL exacte)

## Ce qui est supprimé

**Tables DB** (via migration DROP) :
- `bank_transfer_requests`
- `owner_payouts`
- Fonctions `generate_transfer_reference`, `confirm_bank_transfer`
- Colonnes IBAN/BIC/holder sur `owner_profiles` (remplacées par `stripe_account_id`)

**Fichiers code supprimés** :
- `src/lib/bank-transfers.functions.ts`
- `src/lib/owner-payouts.functions.ts`
- `src/components/BankTransferInstructions.tsx`
- `src/components/OwnerBankAccountForm.tsx` + shim `OwnerConnectCard.tsx` refait pour Stripe Connect
- `src/routes/admin.virements.tsx`
- `src/routes/admin.reversements.tsx`
- Secrets `CA_IBAN`, `CA_BIC`, `CA_ACCOUNT_HOLDER` (à supprimer après migration)

## Ce qui est créé

**DB** :
- Ajout `stripe_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled` sur `owner_profiles`
- Ajout `stripe_payment_intent_id`, `stripe_checkout_session_id`, `stripe_transfer_id` sur `campaign_requests`
- Table `stripe_events` pour idempotence webhook

**Code** :
- `src/lib/stripe.server.ts` — client Stripe BYOK (sk_test/sk_live selon env)
- `src/lib/payments.functions.ts` :
  - `createWalletTopupCheckout` — Stripe Checkout session pour recharger le wallet (CB, Apple Pay, etc.)
  - `createCampaignCheckout` — Checkout session pour paiement direct campagne
  - `createConnectOnboardingLink` — génère l'URL d'onboarding Express pour un propriétaire
  - `getConnectAccountStatus` — statut KYC/payouts
  - `transferToOwner` — déclenche un `transfers.create` vers le compte Connect du propriétaire (70%)
- `src/routes/api/public/stripe/webhook.ts` — reçoit :
  - `checkout.session.completed` → crédite wallet ou marque campagne payée
  - `account.updated` → met à jour `charges_enabled/payouts_enabled` du propriétaire
  - `payment_intent.payment_failed` → log
- `src/components/StripeCheckoutButton.tsx` (Embedded Checkout côté annonceur)
- `src/components/OwnerStripeConnectCard.tsx` — bouton "Connecter mon compte bancaire via Stripe" + affichage statut KYC
- `src/routes/proprietaire.paiements.tsx` (remplace l'ancien form IBAN)

**Flux modifiés** :
- `annonceur.portefeuille.tsx` → recharge par CB via Stripe Checkout (fini le RIB)
- `CampaignPaymentCheckout.tsx` → si wallet insuffisant, propose recharge CB
- `wallet.functions.ts::payCampaignWithWallet` → après paiement wallet, déclenche automatiquement `transfers.create` vers le propriétaire (70% du montant)
- `admin.tsx` PayoutBlock → bouton "Reverser au propriétaire" appelle maintenant `transferToOwner` (Stripe API) au lieu de la logique SEPA

## Ordre d'exécution

1. **Vous** : créez compte Stripe + activez Connect + me donnez la clé secrète
2. **Moi** : migration DB (drop old + add stripe cols)
3. **Moi** : `stripe.server.ts` + server functions Stripe
4. **Moi** : webhook + composants UI
5. **Moi** : suppression du code virement bancaire
6. **Vous** : configurez webhook URL dans dashboard Stripe
7. **Test bout-en-bout** en mode test Stripe (cartes 4242…)

## Points d'attention

- **Existant en cours** : les rechargements wallet déjà crédités et les campagnes déjà payées ne sont pas impactés (on garde `wallets`/`wallet_transactions`).
- **Propriétaires actuels** : ils devront tous refaire un onboarding Stripe Connect (KYC : pièce d'identité, IBAN, adresse). Impossible d'importer les IBAN existants — Stripe exige son propre KYC.
- **Frais Stripe** : ~1.5% + 0.25€ par transaction CB EU + ~0.25€ par transfer vers propriétaire (Stripe Connect). À intégrer dans votre marge 30%.
- **Test mode** : tout se fait en `sk_test_…` d'abord. Passage en prod = juste changer la clé secrète.

---

**Confirmez-vous ce plan et êtes-vous prêt à créer le compte Stripe + activer Connect ?** Dès que vous me dites OK et que la clé est fournie, je lance la migration et le code.
