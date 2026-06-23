
## Objectif

Supprimer Stripe et reconstruire dans l'app tout ce qu'un compte bancaire CA seul ne sait pas faire : encaissement traçable, rapprochement automatique, débit récurrent, et reversement aux propriétaires.

## Ce qui change pour l'utilisateur final

**Annonceur qui paie une campagne :**
1. Recharge son wallet (montant libre, min 50€) → l'app affiche le **RIB CA + une référence unique** (ex. `MS-A4F2-9K1`) à mettre obligatoirement dans le libellé du virement.
2. Reçoit un email avec RIB, référence, montant, et instructions.
3. Sous 1-2 jours ouvrés, dès que toi tu valides la réception, le wallet est crédité automatiquement.
4. Les campagnes sont ensuite payées **instantanément** depuis le wallet (zéro friction côté client une fois la 1re recharge faite).

**Propriétaire de véhicule :**
1. Renseigne son IBAN dans son profil.
2. À la fin de chaque campagne, l'app calcule sa part et l'ajoute à son "solde à verser".
3. Toi tu déclenches les paiements 1× par semaine depuis `/admin/payouts` → l'app génère un **fichier SEPA XML (pain.001)** ou un CSV → tu l'importes dans le portail CA → tous les propriétaires sont payés en 1 clic.

**Toi (admin) :**
- `/admin/transfers` : liste des virements attendus avec montant, référence, date, ancienneté. Bouton "Confirmer reçu" → crédite automatiquement le wallet + envoie l'email de confirmation. Tu fais ça 1× par jour (5 min).
- `/admin/payouts` : liste des propriétaires avec solde dû. Bouton "Générer fichier SEPA" → tu l'importes dans CA → bouton "Marquer comme payés".

## Architecture technique

**Tables à créer/modifier :**
- `bank_transfer_requests` (nouveau) : id, user_id, reference (unique), amount_cents, status (`pending`/`received`/`expired`/`cancelled`), created_at, received_at, confirmed_by_admin, purpose (`wallet_topup`/`campaign_direct`)
- `owner_payouts` (nouveau) : id, owner_id, amount_cents, status (`pending`/`paid`), campaign_request_ids[], created_at, paid_at, sepa_batch_id
- `owner_profiles` : ajouter `iban`, `bic`, `account_holder` (chiffrés via policy RLS stricte)
- `wallets` / `wallet_transactions` : conservés tels quels (juste nouvelle source `bank_transfer`)

**Code à supprimer :**
- `src/lib/payments.functions.ts` (Stripe checkouts)
- `src/routes/api/stripe/webhook.ts`
- `src/lib/stripe.server.ts`
- Composants : `WalletTopupCheckout`, `CampaignPaymentCheckout`, `OwnerConnectCard`, tout bouton "Payer par carte"

**Code à créer :**
- `src/lib/bank-transfers.functions.ts` : créer une demande de virement (génère référence), lister/confirmer (admin), annuler (user)
- `src/lib/owner-payouts.functions.ts` : calculer soldes dus, générer SEPA XML, marquer payés
- `src/components/BankTransferInstructions.tsx` : affiche RIB + référence + bouton "copier" + alerte délai
- `src/routes/_authenticated/admin/transfers.tsx` : back-office rapprochement
- `src/routes/_authenticated/admin/payouts.tsx` : back-office reversements
- `src/routes/_authenticated/wallet.tsx` : remplacer le bouton Stripe par "Recharger par virement"
- `src/components/OwnerBankAccountForm.tsx` : remplace `OwnerConnectCard`
- Email templates : `bank-transfer-instructions`, `bank-transfer-received`, `payout-sent`

**Sécurité :**
- RIB CA lu uniquement côté serveur (secrets `CA_IBAN`/`CA_BIC`/`CA_ACCOUNT_HOLDER` déjà en place), jamais bundle client.
- IBAN propriétaires : colonne accessible uniquement par le propriétaire lui-même et l'admin (RLS).
- Référence virement : 8 caractères alphanumériques, unique, expire après 30 jours sans virement reçu.
- Tous les écrans `/admin/*` gated par `has_role(uid, 'admin')`.

## Limitations assumées

- Délai 1-2 jours ouvrés entre virement annonceur et activation wallet (incompressible sans Stripe).
- Pas de paiement CB → certains annonceurs occasionnels seront perdus.
- Rapprochement manuel par toi (5 min/jour). Automatisable plus tard si tu actives l'API CashlessBanking de CA (option payante côté CA, à voir dans 6 mois si volume le justifie).
- Reversement propriétaires : tu valides la génération SEPA et tu fais l'upload toi-même dans le portail CA (sécurité : aucune app ne doit pouvoir initier des virements sortants à ta place).

## Ordre d'implémentation

1. Migration DB (tables + RLS + grants)
2. Server functions virements + payouts
3. UI annonceur (recharge wallet par virement)
4. UI propriétaire (form IBAN)
5. Back-office admin (transfers + payouts)
6. Emails (3 templates)
7. Suppression code Stripe
8. Test bout-en-bout

## À confirmer avant de démarrer

- Validation du plan global.
- Tu veux **garder le wallet** (recharge 1 fois, débit auto par campagne) ou **virement direct par campagne** (chaque campagne = un nouveau virement avec sa propre référence) ? Le wallet réduit fortement la friction client mais demande qu'ils avancent l'argent.
- Format de reversement aux propriétaires : **SEPA XML pain.001** (1 clic dans CA mais format technique) ou **CSV simple** (lisible mais saisie manuelle dans CA) ?
