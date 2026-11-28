# Skill : Pitch Deck Creator

Crée des présentations investisseur ou commerciales B2B de haute qualité, prêtes à pitcher.

## Déclenchement

Invoquer quand le message contient : "pitch deck", "deck investisseur", "présentation commerciale", "pitch B2B", "slides investisseur", "deck de vente", "pitch startup", "présentation client", "pitch series", "deck de levée".

---

## Règles universelles (toujours actives)

### Contenu par slide

- **30 mots maximum** de corps de texte visible par slide (titre non compris).
- **1 idée = 1 slide.** Jamais deux messages concurrents sur le même plan.
- **Titre assertif orienté résultat** : formule sujet + verbe + impact mesurable.
  - ❌ "Notre marché" → ✅ "Un marché de 4,2 Md€ qui croît à 18 % par an"
  - ❌ "Problème" → ✅ "Les annonceurs gaspillent 40 % de leur budget faute de ciblage local"
  - ❌ "Solution" → ✅ "MoveSpot transforme chaque véhicule en panneau publicitaire géolocalisé"
- **Chiffres en gras**, unité toujours présente, source entre parenthèses si externe.
- **Pas de bullet-lists à 5+ éléments** : maximum 3 points, sinon reformuler en prose ou scinder le slide.

### Visuels

Chaque slide reçoit une **suggestion visuelle** entre crochets `[VISUEL]` :

| Type de contenu | Suggestion type |
|---|---|
| Marché / taille | Bubble chart ou donut avec 1 chiffre central dominant |
| Croissance | Line chart ascendant, axe X = temps, annoté d'un événement clé |
| Comparatif concurrents | Tableau 2×2 (axes = critères différenciants), case produit colorée |
| Équipe | Photos carrées + 1 ligne titre + 1 ligne metric (ex : "Ex-Uber, 8 ans ops") |
| Produit | Screenshot annotés ou flow en 3 étapes max (Before → Action → After) |
| Traction | Bar chart ou courbe MRR/ARR avec CAGR annoté |
| Financier | Tableau waterfall ou courbe break-even avec date cerclée |
| Témoignage | Citation grande taille + logo client + prénom/titre signataire |

### Notes orateur

Chaque slide reçoit une section `> 🎤 NOTE ORATEUR` contenant :
- La **phrase d'accroche orale** (≤ 15 mots) pour ouvrir le slide.
- L'**objection anticipée** la plus fréquente sur ce sujet.
- La **réponse-flash** à cette objection (1 phrase).
- La **transition** vers le slide suivant (1 phrase).

### Numérotation et durée

- Chaque slide porte son numéro `[N/Total]` et une **durée indicative** en minutes (deck investisseur : 1–2 min/slide ; deck commercial : 2–4 min/slide).
- La durée totale estimée figure dans le résumé final.

---

## Structure A — Deck Investisseur (10–12 slides)

Usage : levée de fonds seed à Series B, conférence startup, jury prix innovation.
Durée totale cible : **15–20 minutes** (+ 10 min Q&A).

```
[1/11] COUVERTURE          — Nom + tagline ≤ 10 mots + logo + date
[2/11] PROBLÈME            — La douleur client, chiffrée, incarnée
[3/11] SOLUTION            — Mécanisme différenciant en 3 étapes max
[4/11] MARCHÉ              — TAM / SAM / SOM avec méthodologie bottom-up
[5/11] MODÈLE DE REVENUS   — Comment et combien vous gagnez par unité
[6/11] TRACTION            — Preuves de demande : revenus, users, NPS, LOI
[7/11] CONCURRENCE         — Positionnement sur matrice 2×2 différenciante
[8/11] GO-TO-MARKET        — Canal 1 prouvé + plan de mise à l'échelle
[9/11] ÉQUIPE              — Founding team + advisors clés, biais d'exécution
[10/11] FINANCIER          — P&L 36 mois, hypothèses visibles, break-even cerclé
[11/11] APPEL À L'ACTION   — Montant levé, use of funds, prochaine milestone
[12/11] APPENDICE          — (optionnel) Métriques détaillées, cohort analysis, tech stack
```

### Règles spécifiques investisseur

- **Slide Marché** : toujours bottom-up (nombre de clients × panier moyen × fréquence), jamais juste "X % d'un marché de Y Md€".
- **Slide Concurrence** : les 2 axes du 2×2 doivent être des critères où vous gagnez. Ne jamais nommer un concurrent sans un avantage clair en face.
- **Slide Financier** : afficher les hypothèses unitaires (CAC, LTV, churn) sur un slide annexe si > 3 lignes.
- **Slide Appel à l'action** : décomposer le use of funds en 3 postes max (ex: 60 % product, 25 % sales, 15 % ops) avec la milestone que chaque euro finance.

---

## Structure B — Deck Commercial B2B (8–10 slides)

Usage : premier rendez-vous client, appel d'offres, closing account enterprise.
Durée totale cible : **20–30 minutes** (conversation, pas monologue).

```
[1/9] COUVERTURE           — Nom client en titre + votre logo + date + nom commercial
[2/9] LEUR SITUATION       — Reformulation du contexte client (montre que vous l'avez compris)
[3/9] LEUR PROBLÈME        — L'impact business chiffré du statu quo
[4/9] VOTRE APPROCHE       — Méthode en 3 étapes, pas le produit encore
[5/9] DÉMO / CAS CLIENT    — 1 cas similaire avec résultat mesurable (Before/After)
[6/9] VOTRE OFFRE          — Ce que vous livrez, dans quel délai, avec quelles garanties
[7/9] ROI CALCULATEUR      — Modèle de retour sur investissement avec leurs chiffres
[8/9] PROCHAINES ÉTAPES    — 3 actions concrètes avec date et responsable
[9/9] APPENDICE            — (optionnel) Références clients, certifications, FAQ
```

### Règles spécifiques commercial B2B

- **Slide Leur Situation** : personnaliser avec des données publiques de l'entreprise cible (CA, secteur, actualité récente). Jamais de slide générique.
- **Slide Démo / Cas Client** : structure Before / Action / After avec métrique ROI visible. L'entreprise référente doit être dans le même secteur ou taille que le prospect.
- **Slide ROI Calculateur** : laisser des cases vides à remplir ensemble pendant le rendez-vous — le deck devient outil de co-construction.
- **Slide Prochaines Étapes** : chaque action a un **owner** (vous ou eux), une **date** et un **livrable** précis. Jamais "on se rappelle".
- **Pas de slide produit pur** avant le slide 4 : d'abord leur contexte, ensuite votre réponse.

---

## Format de sortie attendu

Pour chaque slide, produire le bloc suivant :

```markdown
---
### Slide [N/Total] — TITRE ASSERTIF                              ⏱ X min

**Corps** (≤ 30 mots) :
[Texte du slide]

[VISUEL] : Description précise du visuel recommandé

> 🎤 NOTE ORATEUR
> **Accroche** : "..."
> **Objection probable** : "..."
> **Réponse-flash** : "..."
> **Transition** : "..."
---
```

---

## Checklist de qualité finale

Avant de livrer le deck, vérifier mentalement :

- [ ] Chaque titre slide peut se lire seul et raconter l'histoire (the "billboard test")
- [ ] Le slide 1 et le slide final se répondent (problème → solution → appel à l'action)
- [ ] Aucun slide ne dépasse 30 mots de corps
- [ ] Chaque chiffre clé a sa source ou son hypothèse
- [ ] Les visuels sont décrits avec suffisamment de précision pour être réalisés
- [ ] Les notes orateur couvrent la principale objection de chaque slide
- [ ] La durée totale estimée est cohérente avec le format (15–20 min investisseur, 20–30 min commercial)
- [ ] Le deck se lit de gauche à droite comme une histoire causale (contexte → tension → résolution → preuve → action)

---

## Variantes à proposer automatiquement

Si le contexte le justifie, proposer en fin de réponse :

| Variante | Quand la proposer |
|---|---|
| **Version "elevator" (3 slides)** | Si la réunion dure < 5 min ou si format email |
| **Version "leave-behind" (PDF dense)** | Si le deck sera envoyé sans présentation orale |
| **Version "demo-first" (produit en slide 2)** | Si le prospect a déjà été qualifié / connaît votre offre |
| **Annexe "data room"** | Si levée de fonds Series A+ avec due diligence attendue |
