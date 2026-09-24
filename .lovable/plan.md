# Barre de navigation des pages publiques

## Modifications

- Créer le layout public `_public` qui affiche la barre blanche existante, puis le contenu de la page.
- Déplacer les neuf pages demandées sous ce layout sans changer leurs URL publiques.
- Mettre à jour chaque déclaration de route pour qu’elle corresponde exactement à son nouveau fichier.
- Retirer de la barre la logique qui masquait certains préfixes, devenue inutile grâce au layout.
- Ne pas modifier la racine de l’application ni les espaces annonceur, propriétaire, chauffeur, prestataire, partenaire ou admin.

## Vérifications

- Contrôler la compilation et le rendu côté serveur.
- Ouvrir les pages publiques principales sur ordinateur et mobile pour confirmer la présence d’une seule barre, sans chevauchement.
- Ouvrir un espace privé pour confirmer que la barre publique n’y apparaît pas.
- Vérifier que les neuf pages conservent leurs adresses actuelles et leurs métadonnées propres.
