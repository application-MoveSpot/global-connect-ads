# Rétablir les remboursements et les fonctions IA du chat

## Diagnostic confirmé
- La base actuelle ne contient ni `refund_requests`, ni `refund_claims_moderation`, ni les trois tables IA du chat.
- Les définitions existent désormais dans le dépôt : le signalement initial est partiellement dépassé, mais ces changements ne sont pas présents dans la base utilisée par l’application.
- La lecture de `refund_requests` échoue réellement avec « relation does not exist ». La liste administrateur dépend aussi de la relation avec les analyses IA.
- Appliquer les anciens fichiers sans adaptation serait risqué : ils omettent les autorisations explicites et les déclencheurs IA ciblent un autre backend. Le secret nécessaire aux appels automatiques n’est pas configuré dans la base actuelle.

## Correction proposée
1. Rétablir les cinq tables et leurs relations, dans le bon ordre, avec un changement additif appliqué via Lovable Cloud ; ne supprimer aucune donnée.
2. Donner les droits strictement nécessaires : demandes visibles par leur auteur et les administrateurs, analyses de remboursement et alertes réservées aux administrateurs, traductions limitées aux participants autorisés à lire le message, résumés limités à leur propriétaire et aux administrateurs. Réserver les écritures des caches et analyses au service privilégié.
3. Vérifier les champs utilisés par les fonctions IA, notamment le champ de modération des messages, et ajouter uniquement les champs manquants nécessaires.
4. Rendre les erreurs de chargement des remboursements explicites au lieu de les présenter comme une liste vide ; préserver les contrôles administrateur existants.
5. Vérifier le service réellement disponible pour chaque traitement IA avant de raccorder les appels automatiques. Ne pas réutiliser les adresses d’un autre backend ni inventer de secret. Les demandes et messages doivent rester enregistrables lorsque l’IA est indisponible.

## Vérification
- Confirmer après application l’existence des cinq tables, des droits et de la relation demande/analyse, puis rejouer la lecture actuellement en échec.
- Ajouter des tests ciblés sur l’accès propriétaire, l’accès administrateur et la confidentialité des traductions.
- Tester le chargement des remboursements avec une session administrateur autorisée, une demande de test identifiable et son affichage sans analyse IA ; vérifier aussi l’état d’erreur.
- Tester traduction et résumé sur une conversation accessible, et confirmer qu’un autre utilisateur ne peut pas consulter leurs données.
- Signaler séparément tout traitement IA encore indisponible faute de service ou de configuration ; ne pas déclarer l’ensemble rétabli sur la seule existence des tables.

## Détails techniques
- Utiliser une migration Drizzle personnalisée via l’outil de migration, avec `CREATE TABLE`, `GRANT`, RLS et politiques dans cet ordre pour chaque nouvelle table publique.
- Conserver les identifiants utilisateur en UUID simples dans les nouvelles tables et utiliser `public.has_role` pour les politiques administrateur.
- Conserver les migrations historiques ; ne pas modifier leurs versions déjà appliquées ni les types générés à la main.
- Garder les traitements internes dans les fonctions serveur TanStack et ne pas créer de nouvelles Edge Functions.
- Clôturer le signalement seulement après vérification de la correction effective.