# Skill : `video-lens` — Analyse Vidéo YouTube

Colle un lien YouTube → résumé structuré + points actionnables + plan horodaté.
Priorité : vidéos concurrentes, formations marketing, stratégies de contenu pertinentes pour MoveSpot.

## Déclenchement

- `/video-lens <url>` ou `video-lens <url>`
- Ou coller une URL YouTube dans le message avec le mot-clé "analyse", "résume", "décortique"

---

## Protocole d'analyse — 4 blocs obligatoires

### Bloc 1 — Fiche d'identité
```
Titre       : [titre exact]
Chaîne      : [nom chaîne]
Durée       : [mm:ss]
Date        : [date publication]
Vues        : [nombre]
Type        : [Short / Long / Livestream / Webinaire]
Angle       : [ce que la vidéo prétend apporter]
```

### Bloc 2 — Résumé structuré (max 150 mots)
Synthèse dense du contenu : argument principal, structure narrative, conclusion. Pas de liste — prose télégraphique.

### Bloc 3 — Plan horodaté
Format : `[mm:ss] – [mm:ss] | [titre de section] | [insight en 1 phrase]`

Exemple :
```
[00:00] – [00:45] | Hook       | Stat choc : "80% des PME locales sous-investissent en pub géolocalisée"
[00:45] – [03:20] | Problème   | Annonceurs perdent 40% de budget sur cibles hors zone
[03:20] – [07:10] | Solution   | Publicité mobile GPS — mécanisme expliqué en 3 étapes
[07:10] – [09:50] | Preuve     | Cas client : commerce Jarry, 3× plus de trafic en 30 jours
[09:50] – [11:00] | CTA        | Essai gratuit 14 jours, URL en description
```

### Bloc 4 — Points actionnables MoveSpot (max 5)
Chaque point = une action concrète dérivée de la vidéo, applicable à MoveSpot Guadeloupe.

Format :
```
⚡ [Action] — [Délai] — [Indicateur de succès binaire]
```

Exemples :
```
⚡ Tester le hook "stat choc locale" en ouverture du prochain Short Jarry — Semaine prochaine — Taux d'accroche > 70%
⚡ Ajouter un calculateur ROI interactif sur la landing annonceur — Sprint suivant — 1 conversion supplémentaire / semaine
```

---

## Grille d'évaluation concurrente (si la vidéo est d'un concurrent)

| Dimension | Évaluation | Leçon pour MoveSpot |
|---|---|---|
| Hook (3 premières secondes) | Fort / Moyen / Faible | [insight] |
| Preuve sociale | Existante / Absente | [insight] |
| Différenciateur prix | Visible / Absent | [insight] |
| CTA | Clair / Flou | [insight] |
| Angle Guadeloupe / local | Exploité / Ignoré | [insight] |

---

## Domaines de vigilance MoveSpot

Lors de l'analyse, signaler automatiquement si la vidéo contient :
- **Stratégie de contenu applicable** : format, cadence, structure de script réutilisable sur `@MoveSpot_GP`
- **Argument concurrentiel** : prix, fonctionnalité ou promesse à contrer dans notre propre contenu
- **Tactique d'acquisition** : technique de recrutement poseurs, chauffeurs, ou annonceurs à tester
- **Données marché** : chiffres sur la pub mobile, les DROM, le marché Guadeloupe ou Antilles
- **Red flag** : claim non sourcé, chiffre invérifiable, tactique non applicable au marché local

---

## Ce que `video-lens` ne fait PAS

- Fabriquer des horodatages si la transcription est indisponible (signaler l'absence).
- Généraliser à "toutes les entreprises" sans filtrage MoveSpot.
- Produire une liste d'actionnables > 5 (mieux vaut 2 solides que 8 vagues).
- Valider une stratégie parce qu'elle vient d'une grosse chaîne (taille ≠ pertinence Guadeloupe).
