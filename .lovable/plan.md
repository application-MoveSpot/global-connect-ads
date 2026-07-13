## Diagnostic rapide

Le bug vient de deux problèmes combinés :

1. **Le code utilise encore l’ancienne intégration Stripe par clé secrète** (`STRIPE_SECRET_KEY`) et redirige vers `checkout.stripe.com`.
2. **Le passage en live Stripe n’est pas terminé** : le statut indique que l’étape 1 “Connecter le sandbox Stripe” est encore en cours. Donc les paiements live ne peuvent pas fonctionner tant que cette étape n’est pas finalisée.

<presentation-actions><presentation-open-payments>Go to payments</presentation-open-payments></presentation-actions>

## Solution rapide proposée

Je vais remplacer le flux fragile actuel par le flux de paiement Stripe intégré à Lovable :

1. **Supprimer la dépendance à `STRIPE_SECRET_KEY` pour la recharge portefeuille**
   - Ne plus appeler Stripe directement avec la clé secrète enregistrée.
   - Utiliser le client paiement Lovable déjà présent côté front (`VITE_PAYMENTS_CLIENT_TOKEN`).

2. **Transformer la recharge portefeuille en paiement Stripe intégré**
   - Créer une session Checkout compatible avec l’intégration Lovable.
   - Retourner un `clientSecret` au lieu d’une URL de redirection.
   - Afficher le checkout directement dans la page portefeuille.

3. **Afficher clairement le mode test / live**
   - En preview, afficher un bandeau indiquant que les paiements sont en test.
   - En production, si le live n’est pas prêt, afficher un message clair au lieu d’une erreur technique.

4. **Garder la mise à jour du portefeuille via webhook**
   - Conserver la logique qui crédite le portefeuille après paiement validé.
   - Adapter le webhook si nécessaire pour fonctionner avec le nouveau flux.

5. **Vérifier le parcours utilisateur**
   - Tester `/annonceur/portefeuille`.
   - Vérifier que le clic sur “Recharger” ouvre bien le paiement au lieu de planter.
   - Vérifier que l’erreur “Invalid API Key” ne peut plus apparaître sur ce flux.

## Important

La correction rendra le paiement test fonctionnel rapidement. Pour accepter de vrais paiements live, il faudra aussi terminer l’étape Stripe actuellement bloquée dans l’onglet Payments.