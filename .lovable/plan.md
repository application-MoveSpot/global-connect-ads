# Corriger le calendrier de réservation

- Rétablir l’accès aux dates réservées : la fonction existante n’autorise actuellement ni les visiteurs ni les annonceurs à l’appeler.
- Conserver les campagnes privées. Une politique SELECT générale exposerait aussi les e-mails, messages et prix ; utiliser plutôt la fonction dédiée qui ne renvoie que les dates du véhicule demandé.
- Prendre en compte les statuts occupés demandés : approved, paid, pending et completed.
- Afficher deux propositions de même durée, les plus proches avant et après la période demandée, dans la limite des dates réservables ; les rendre sélectionnables.
- Vérifier les droits, tester les calculs et ouvrir le calendrier avec un compte connecté. Ne pas modifier les paiements ni la soumission du brief.

## Détails techniques

Migration sur `get_vehicle_booked_periods` : conserver sa signature et son résultat limité à `start_date, end_date`, restaurer les droits EXECUTE explicites et mettre à jour le filtre de statuts. Les politiques privées sur `campaign_requests` restent intactes. Les deux chargements de BookingForm utiliseront cette même fonction typée. Les calculs de créneaux auront leurs propres tests.