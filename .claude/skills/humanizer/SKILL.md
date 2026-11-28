# Skill : `humanizer` — Réécriture Humaine MoveSpot

Réécrit tout texte MoveSpot (e-mails B2B, descriptions YouTube, pages web, scripts vidéo) pour éliminer les tics d'écriture IA et produire un français professionnel, concret, ancré Guadeloupe/France.

## Déclenchement

`/humanizer` ou mention de : "humanize", "réécrire sans IA", "ton humain", "enlever les tics IA", "rendre plus naturel", "relire pour publication".

---

## Mots et tournures INTERDITS (blacklist absolue)

### Vocabulaire artificiel IA

| Interdit | Remplacer par |
|---|---|
| crucial | essentiel / important / clé |
| paysage (métaphorique) | marché / secteur / contexte |
| propulser | développer / faire croître / accélérer |
| témoigne de | montre / prouve / reflète |
| en outre | de plus / aussi / et |
| plongeons dans | voici / regardons / commençons par |
| révolutionner | changer / transformer / améliorer vraiment |
| inégalé / sans précédent | le meilleur dans sa catégorie / très difficile à battre |
| robuste | solide / fiable / qui tient la route |
| transparent (métaphorique) | clair / lisible / sans surprise |
| synergies | complémentarités / points communs |
| écosystème (métaphorique) | réseau / ensemble / communauté |
| paradigme | façon de faire / modèle / approche |
| holistique | global / complet / d'ensemble |
| granulaire | détaillé / précis / fin |
| itératif | progressif / par étapes / en testant |
| scalable / scalabilité | qui peut grandir / extensible |
| game-changer | vrai changement / vraie différence |
| disruption / disruptif | nouveau / qui bouscule les habitudes |
| DNA / ADN (métaphorique) | valeurs / identité / ce qui nous définit |

### Formulations creuses en `-ant`

Toute construction `[verbe en -ant] + [adverbe + adjectif]` est suspecte.

Exemples à supprimer :
- ~~"offrant ainsi une visibilité optimale"~~ → "votre marque est visible partout dans la zone"
- ~~"permettant de maximiser votre impact"~~ → "pour toucher plus de monde dans votre quartier"
- ~~"garantissant une expérience fluide"~~ → "simple à utiliser dès la première fois"
- ~~"assurant ainsi la traçabilité"~~ → "chaque kilomètre est enregistré"
- ~~"contribuant à renforcer votre notoriété"~~ → "les gens voient votre marque passer"

### Structures robotiques à éliminer

- **Tirets longs (`—`) systématiques** : max 1 par paragraphe, jamais en série.
- **Triples adjectifs** : ~~"une solution innovante, agile et performante"~~ → choisir le seul qui compte.
- **Conclusions résumées artificielles** : ~~"En résumé, MoveSpot offre une solution complète qui..."~~ → supprimer ou reformuler en action concrète.
- **Intro de liste vide** : ~~"Voici les avantages clés :"~~ → ~~ou reformuler en phrase directe.
- **Rhétorique de question-réponse forcée** : ~~"Vous vous demandez comment ? C'est simple."~~ → aller directement à la réponse.
- **Superlatifs non justifiés** : ~~"la solution la plus complète du marché"~~ → "une des rares plateformes où les km sont tracés en temps réel".

---

## Ton et style MoveSpot

### Ce que MoveSpot est

Une entreprise fondée à Baie-Mahault par des gens qui connaissent la Guadeloupe. Pas une startup parisienne qui "déploie une solution innovante en Outre-mer". Le ton reflète ça.

### Registre selon le support

| Support | Registre | Exemple de phrase type |
|---|---|---|
| E-mail prospection B2B | Professionnel direct, sans familiarité | "Je vous contacte parce que votre flotte roule tous les jours dans la zone industrielle de Jarry." |
| Description YouTube | Naturel, engageant, accessible | "On vous explique comment ça marche, en 3 minutes." |
| Page web publique | Clair, factuel, rassurant | "L'inscription est gratuite. Vous ajoutez vos véhicules, on s'occupe du reste." |
| Script vidéo | Parlé, rythmé, sans bullet-points | "Imagine : ta voiture roule, et pendant ce temps, elle te rapporte." |
| Post réseaux sociaux | Court, percutant, ancré local | "Embouteillages à Jarry ce matin. Pour 400 conducteurs, c'est du revenu publicitaire." |

### Ancrage Guadeloupe / France (mots du terrain)

Préférer ces formulations concrètes :
- "la zone de Jarry" plutôt que "les artères commerciales de l'agglomération"
- "un poseur local" plutôt que "un prestataire de services de covering"
- "votre taxi ou votre van" plutôt que "votre flotte de véhicules"
- "facture claire, sans frais cachés" plutôt que "une tarification transparente et prévisible"
- "les embouteillages du matin à Baie-Mahault" plutôt que "les flux de circulation denses"
- "le vinyle, c'est votre prestataire qui l'installe" plutôt que "la pose du support publicitaire est assurée par un professionnel certifié"

---

## Protocole en 2 passes (obligatoire)

### Passe 1 — Réécriture directe

1. Lire le texte d'origine.
2. Repérer et éliminer tous les mots de la blacklist.
3. Repérer toutes les constructions en `-ant` → reformuler en phrases actives.
4. Ajuster la longueur des phrases : alterner courtes (< 12 mots) et longues (15–25 mots).
5. Remplacer le jargon abstrait par du concret terrain.

### Passe 2 — Relecture à voix haute mentale

Relire le texte comme si on allait le prononcer devant un interlocuteur réel.

**Questions de vérification :**
- Est-ce qu'une vraie personne dirait cette phrase à voix haute ? Si non → reformuler.
- Est-ce que ça sonne comme un mail de prospection LinkedIn automatisé ? Si oui → couper.
- Est-ce qu'il y a deux adjectifs consécutifs qui ne font que remplir ? Si oui → en enlever un.
- Est-ce que la phrase suivante commence à répéter l'idée de la phrase précédente ? Si oui → supprimer.

**Livrable :** texte 100 % prêt à publier ou envoyer, sans annotation supplémentaire.

---

## Formats d'entrée/sortie

### E-mail de prospection B2B

**Structure attendue en sortie :**
```
Objet : [Accroche concrète, ≤ 60 chars, sans superlatif]

Bonjour [Prénom],

[Phrase d'ouverture contextualisée : pourquoi vous les contactez maintenant]

[1 paragraphe : ce que MoveSpot apporte concrètement à leur situation]

[1 phrase CTA claire : action + lien ou disponibilité]

[Signature sobre : Prénom NOM · MoveSpot · contact@move-spot.com]
```

**Longueur cible :** 80–120 mots maximum (hors signature).

---

### Description YouTube

**Structure attendue en sortie :**
```
[2–3 phrases résumé : ce que la vidéo apporte, avec 1 chiffre concret]

Dans cette vidéo :
• [0:00] Introduction
• [X:XX] [Sujet 2 en 4 mots max]
• [X:XX] [Sujet 3 en 4 mots max]

[Liens utiles : site officiel, espace annonceur, espace propriétaire]

[Hashtags : #MoveSpot #PublicitéMobile #Guadeloupe max 5]
```

**Ton :** parlé, sans liste de bénéfices, sans superlatif.

---

### Page web (section ou bloc)

- Titre H2/H3 : assertif, ≤ 8 mots, sans gerondif.
- Accroche : 1 phrase de 15–20 mots, 1 chiffre ou fait concret.
- Corps : 2–3 phrases max par paragraphe, aérés.
- CTA : verbe d'action + destination claire ("Créez votre campagne → move-spot.com").

---

### Script vidéo

- Découper en répliques, pas en paragraphes.
- Chaque réplique : 1 idée, 1–2 phrases.
- Marquer les pauses `[pause]` et emphases `[emphase]` directement dans le texte.
- Zéro liste à puces : tout en langage oral continu.

---

## Données officielles (ne jamais paraphraser)

| Donnée | Formulation exacte à réutiliser |
|---|---|
| Tarif annonceur | "dès 25 €/jour par véhicule" |
| Reversement propriétaire | "70 % du tarif journalier, soit au minimum 17,50 €/jour" |
| Pic zone dense | "jusqu'à 49 €/jour en zone dense (Paris, Lyon, Marseille)" |
| GPS | "toutes les 30 secondes" |
| Validation | "sous 48 heures" |
| Essai | "14 jours sans engagement" |
| Abonnement poseur | "dès 29 €/mois" |
| Mention légale | "MoveSpot EI · SIREN 804 671 444 · Baie-Mahault, Guadeloupe" |

> Aucun de ces chiffres ne se paraphrase. On les cite exactement ou on ne les cite pas.

---

## Checklist avant livraison

- [ ] Blacklist vérifiée (zéro mot interdit)
- [ ] Zéro construction en `-ant` creuse
- [ ] Phrases courtes et longues alternées
- [ ] Au moins 1 élément concret terrain (chiffre, lieu, geste réel)
- [ ] Passe 2 "voix haute mentale" effectuée
- [ ] Registre correct pour le support (B2B / YouTube / web / script)
- [ ] Données officielles citées exactement si présentes
- [ ] Texte livré propre, sans annotation ni commentaire méta
