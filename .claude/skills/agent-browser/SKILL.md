# Skill : `agent-browser` — Automatisation Navigateur pour MoveSpot

CLI Rust natif pour le pilotage de navigateur par agents IA. Basé sur `vercel-labs/agent-browser` (Apache-2.0).
Usages MoveSpot : QA visuel tunnels (Annonceur / Conducteur / Poseur), tests responsive mobile 375px, vérification RGPD.

---

## Installation

```bash
npm install -g agent-browser
agent-browser install          # télécharge Chrome for Testing
# ou sans installation globale :
npx agent-browser open <url>
```

Linux (dépendances système) :
```bash
agent-browser install --with-deps
```

---

## Commandes essentielles

### Navigation & Lecture
```bash
agent-browser open <url>          # ouvre le navigateur sur <url>
agent-browser snapshot -i         # snapshot interactif → texte compact + refs @e1, @e2…
agent-browser get url             # URL courante
agent-browser get title           # titre de la page
agent-browser close               # ferme le navigateur
```

> Les refs `@e1`, `@e2`… **deviennent obsolètes** après navigation ou mutation DOM. Prendre un nouveau snapshot avant de les réutiliser.

### Interaction
```bash
agent-browser click @e1                        # clic sur ref
agent-browser fill @e3 "texte à saisir"        # remplit un input
agent-browser find role button click --name "Soumettre"   # localisateur sémantique
agent-browser find css ".cta-primary" click    # localisateur CSS
agent-browser find text "Connexion" click      # localisateur texte
```

Échec d'un `click` : vérifier que l'élément n'est pas caché, désactivé, hors viewport, ou recouvert (ex. bandeau cookies).

### Capture & Viewport
```bash
agent-browser screenshot                       # capture pleine page
agent-browser screenshot --path qa/mobile.png  # chemin explicite
agent-browser viewport 375 812                 # iPhone 14 / SE simulé
agent-browser viewport 1280 800                # desktop standard
```

### Sessions
```bash
agent-browser open <url> --session movespot-qa    # session nommée (daemon ~1h)
agent-browser close --session movespot-qa
```

### MCP Server (intégration Claude Code)
```bash
agent-browser mcp   # démarre le serveur MCP sur stdio
```

---

## Flux type — QA Tunnel Annonceur MoveSpot

```bash
# 1. Ouvrir le tunnel en mobile
agent-browser open https://move-spot.com/annonceurs --session qa-annonceur
agent-browser viewport 375 812

# 2. Vérifier l'affichage initial
agent-browser screenshot --path qa/01-landing-mobile.png
agent-browser snapshot -i

# 3. Interagir avec le simulateur de zone
agent-browser find role slider click --name "Budget journalier"
agent-browser fill @e_budget "149"
agent-browser screenshot --path qa/02-simulateur.png

# 4. Avancer dans le tunnel
agent-browser find text "Choisir ce pack" click
agent-browser snapshot -i
agent-browser screenshot --path qa/03-choix-pack.png

# 5. Vérifier le formulaire
agent-browser find role textbox click --name "Email"
agent-browser fill @e_email "test@example.com"

# 6. Vérifier la page de paiement SANS saisir de vraies données
agent-browser screenshot --path qa/04-checkout.png
agent-browser close --session qa-annonceur
```

---

## Règles de sécurité MoveSpot — Non négociables

### Interdictions absolues
- **Jamais saisir de vrais identifiants bancaires** (numéro de carte, CVV, IBAN) via `fill`.
- **Jamais soumettre une action irréversible en production** (paiement réel, suppression compte, virement) sans confirmation explicite de l'utilisateur dans le chat.
- **Jamais stocker de credentials** dans les scripts ou les chemins de session.
- **Jamais contourner le bandeau RGPD** (`find role button click --name "Accepter"` acceptable en QA local uniquement, jamais en prod).

### Environnements
| Environnement | Usage autorisé | Usage interdit |
|---|---|---|
| `localhost:3000` | Tout — navigation, fill, submit | — |
| Preview Lovable | Navigation, screenshot, fill formulaires | Paiements réels |
| `move-spot.com` (prod) | Navigation, screenshot, lecture seule | Fill, submit, clic CTA irréversible |

### Avant toute action destructrice en prod
Afficher dans le chat :
```
⚠️ Action irréversible détectée sur move-spot.com (prod) : [description précise]
Confirme "oui" pour exécuter, sinon j'arrête.
```
Attendre confirmation explicite. Jamais présumer un "oui" implicite.

---

## Checklist QA MoveSpot — agent-browser

### Responsive mobile (obligatoire avant chaque PR UI)
- [ ] `viewport 375 812` — zéro overflow horizontal
- [ ] Tous les CTA visibles sans scroll horizontal
- [ ] Zones tactiles ≥ 44px vérifiées visuellement sur screenshot

### Accessibilité navigateur
- [ ] Focus clavier visible : `Tab` depuis le début de la page jusqu'au CTA principal
- [ ] Bandeau RGPD présent sur la première visite
- [ ] Formulaires : labels associés (snapshot → vérifier attributs)

### Tunnels critiques
- [ ] Tunnel Annonceur : étapes 1→4 sans erreur JS console
- [ ] Tunnel Conducteur : upload assurance fonctionne (fichier test)
- [ ] Tunnel Poseur : upload RC Pro fonctionne (fichier test)
- [ ] Checkout Stripe : page s'ouvre, aucun vrai paiement soumis

---

## Référence commandes complète (groupes)

```
Navigate/Read  : open, snapshot, get url/title/html/text
Interact       : click, fill, find, hover, select, check, uncheck, press
Wait           : wait selector/text/url/idle
Capture        : screenshot, pdf, har
Page/Network   : get cookies, set cookie, intercept
Tabs/Frames    : new-tab, switch-tab, frame
Sessions/Auth  : --session, save-storage, load-storage
MCP            : agent-browser mcp
Setup          : install, install --with-deps
```

Aide complète : `agent-browser --help` ou `agent-browser skills get core`
