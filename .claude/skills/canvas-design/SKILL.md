# Skill : `canvas-design` — Visuels Marketing MoveSpot

Génère des flyers PDF haute résolution et supports imprimables professionnels pour MoveSpot via Python (ReportLab / Pillow / CairoSVG).

## Déclenchement

`/canvas-design` ou mention de : "flyer", "visuel imprimable", "PDF marketing", "visuel réseaux", "support print", "affiche MoveSpot".

---

## Identité graphique MoveSpot (immuable)

| Token | Valeur |
|---|---|
| Fond principal | `#08090F` (bleu nuit profond) |
| Fond alternatif | `#FFFFFF` (blanc pur) |
| Accent primaire | `#FF6B35` (orange vif) |
| Texte clair | `#F5F5F5` |
| Texte foncé | `#1A1A2E` |
| Gris secondaire | `#6B7280` |
| Police titre | Montserrat Bold / Space Grotesk Bold |
| Police corps | Inter Regular / Inter SemiBold |
| QR URL | `https://move-spot.com` |
| Mention légale pied de page | `MoveSpot EI · SIREN 804 671 444 · Baie-Mahault, Guadeloupe` |

> Ne jamais substituer les couleurs. Ne jamais omettre la mention légale.

---

## Philosophie graphique

- **Aéré** : marges généreuses (≥ 10 % de la dimension), jamais surchargé.
- **Éditorial** : un seul point focal dominant, 1 chiffre ou promesse en grand.
- **Percutant** : hiérarchie typographique forte (titre > sous-titre > corps > mention).
- **Géométrique** : grilles précises, lignes d'accent orange, formes nettes.
- **Jamais** : dégradés complexes multi-couleurs, photos non fournies, polices fantaisie.

---

## Processus en 2 temps (obligatoire)

### Étape 1 — Intention artistique (avant tout code)

Formuler explicitement :

```
Point focal : [élément central — chiffre, accroche, logo]
Équilibre : [disposition — centré / gauche-droite / haut-bas]
Palette : fond [#hex] + accent [#hex] + texte [#hex]
Typographie : [titre : taille px] / [corps : taille px]
Éléments graphiques : [lignes, formes, QR, pictogrammes]
```

### Étape 2 — Génération des fichiers

Produire **systématiquement** :
1. **PDF vectoriel** (via ReportLab) — prêt à imprimer, CMJN-safe.
2. **PNG haute résolution** (via Pillow, 300 dpi minimum) — prêt à partager.

Nommer : `movespot_<type>_<format>_<date>.pdf` / `.png`
Ex : `movespot_flyer_annonceur_a5_20261128.pdf`

---

## Formats disponibles

### A — Flyer Commercial A5 (148 × 210 mm) — Annonceurs Guadeloupe

**Contenu obligatoire :**
- Logo MoveSpot en haut à gauche (ou texte MOVESPOT si logo absent)
- Accroche principale : chiffre fort en orange (ex : "dès 25 €/jour")
- 3 bénéfices en puces (max 8 mots chacun)
- CTA orange : "Lancez votre campagne → move-spot.com"
- QR code vers `https://move-spot.com` en bas à droite
- Mention légale en pied de page (taille minimale 6 pt)

**Données officielles à utiliser :**
- Tarif plancher : 25 €/jour par véhicule
- Tarif à la zone : 1,80 €/km²/jour
- GPS certifié toutes les 30 secondes
- Rapport PDF certifié téléchargeable

---

### B — Flyer Partenaires A5 (148 × 210 mm) — Conducteurs & Poseurs RC Pro

**Variante Conducteurs/Propriétaires :**
- Accroche : "Gagnez jusqu'à 49 €/jour avec votre véhicule"
- 3 arguments : inscription gratuite, essai 14 jours, 70 % reversés
- CTA : "Rejoignez MoveSpot → move-spot.com/proprietaires"

**Variante Poseurs RC Pro :**
- Accroche : "Missions de pose covering en Guadeloupe"
- 3 arguments : abonnement dès 29 €/mois, missions dans votre zone, facturation automatique
- CTA : "Devenez prestataire → move-spot.com/devenir-partenaire"

---

### C — Visuel Réseaux Sociaux

| Format | Dimensions | Usage |
|---|---|---|
| Carré Instagram/LinkedIn | 1080 × 1080 px | Post standard |
| Story Instagram/TikTok | 1080 × 1920 px | Story vertical |
| Bannière Facebook/LinkedIn | 1200 × 630 px | Couverture / pub |

**Règles réseaux :**
- Zone de sécurité : 150 px de marge sur chaque côté (ne pas placer texte critique hors zone)
- Texte : max 20 % de la surface (règle Meta Ads)
- Toujours inclure le handle `@movespot_pub` discret

---

### D — Affiche A4 (210 × 297 mm) — Événement / Vitrine

Usage : affichage vitrine partenaires, stand événementiel, flyer A4 recto.

**Structure :**
- Bande orange en haut (15 % hauteur) avec logo blanc
- Zone centrale : visuel + titre dominant
- Bande inférieure sombre : QR + mention légale + contact@move-spot.com

---

## Stack technique

```python
# Dépendances
pip install reportlab pillow cairosvg qrcode[pil]

# Imports type
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A5, A4
from reportlab.lib.colors import HexColor
from PIL import Image, ImageDraw, ImageFont
import qrcode
```

### Génération QR code (snippet réutilisable)

```python
import qrcode
from PIL import Image

def make_qr(url: str, size_px: int = 200) -> Image.Image:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#08090F", back_color="#FFFFFF")
    return img.resize((size_px, size_px), Image.LANCZOS)
```

### Mention légale (snippet)

```python
MENTION_LEGALE = "MoveSpot EI · SIREN 804 671 444 · Baie-Mahault, Guadeloupe · contact@move-spot.com"

def draw_mention_legale(c, x, y, font_size=6):
    c.setFont("Helvetica", font_size)
    c.setFillColor(HexColor("#6B7280"))
    c.drawCentredString(x, y, MENTION_LEGALE)
```

---

## Données officielles (ne jamais inventer)

| Donnée | Valeur exacte |
|---|---|
| Tarif annonceur plancher | 25 €/jour/véhicule |
| Tarif à la zone | 1,80 €/km²/jour (2,70 € grande agglo) |
| Reversement propriétaire | 70 % minimum → 17,50 €/jour garanti |
| Pic zone dense | jusqu'à 49 €/jour par véhicule |
| Essai gratuit propriétaire | 14 jours sans engagement |
| Intervalle GPS | toutes les 30 secondes |
| Délai validation véhicule | 48 heures |
| Abonnement poseur Starter | 29 €/mois |
| SIREN | 804 671 444 |
| SIRET | 80467144400052 |
| Siège | Baie-Mahault, Guadeloupe |
| URL officielle | https://move-spot.com |

> Si une donnée n'est pas dans ce tableau : écrire `[À CONFIRMER]`, jamais inventer.

---

## Checklist avant livraison

- [ ] Intention artistique formulée (Étape 1)
- [ ] PDF + PNG générés (Étape 2)
- [ ] Couleurs exactes : `#08090F` / `#FF6B35` / `#F5F5F5`
- [ ] QR code présent, URL `https://move-spot.com` vérifiée
- [ ] Mention légale en pied de page (taille ≥ 6 pt)
- [ ] Aucun chiffre inventé (tous issus du tableau officiel)
- [ ] Fichiers nommés selon convention `movespot_<type>_<format>_<date>.*`
- [ ] DPI ≥ 300 pour le PNG (print-ready)

---

## Ce que `canvas-design` ne fait PAS

- Utiliser des couleurs hors palette (jamais de rouge, violet, dégradés arcoiris).
- Omettre la mention légale.
- Inventer des chiffres ou prix.
- Générer des photos (utiliser des formes géométriques ou des pictogrammes SVG inline).
- Produire uniquement un PNG sans PDF (les deux sont toujours livrés ensemble).
