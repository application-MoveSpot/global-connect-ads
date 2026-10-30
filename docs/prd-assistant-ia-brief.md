# PRD — Assistant IA de qualification de brief

**MoveSpot · 2026-10-30**

L'assistant IA guide l'annonceur lors de la saisie du brief, formalise son besoin visuel via des questions guidées et génère un mock-up de campagne. Objectif : réduire le délai de réponse prestataire de 48–72h à moins de 24h.

---

## Pourquoi l'Option 1 ?

L'Option 1 — assistant IA intégré au formulaire de devis — est choisie pour son impact direct sur l'expérience annonceur et la qualité des briefs reçus par les prestataires.

| Critère | Option 1 — Assistant IA brief | Option 2 — Automatisation PR |
| --- | --- | --- |
| Valeur utilisateur | Immédiate : guide chaque annonceur dès la saisie | Différée : accélère le workflow interne post-soumission |
| Complexité technique | Modérée : LLM + génération image | Faible : traitement de données, règles métier |
| Impact business | Différencie MoveSpot sur le marché | Optimise les opérations internes |
| Délai de valeur | Visible dès la 1re soumission | Mesurable à l'échelle (après N briefs) |

L'Option 2 est déprioritisée : elle apporte de la valeur opérationnelle mais ne résout pas le problème de l'annonceur face à un formulaire sans guidance.

---

## Problème actuel

Le champ **Besoin Détail** dans `/advertiser/briefs/nouveau` est un champ texte libre sans guidance. Résultat : des briefs incomplets qui allongent le cycle de qualification de 48 à 72 heures.

| Acteur | Douleur actuelle | Valeur apportée par l'IA |
| --- | --- | --- |
| Annonceur | Ne sait pas quoi écrire, formulations vagues | Questions guidées → brief structuré en < 5 min |
| Prestataire | Relances multiples pour clarifier la vision | Brief + mock-up visuels → proposition en < 24h |
| MoveSpot | Taux de conversion briefs → campagnes faible | Qualité des briefs ↑ → taux d'acceptation ↑ |

---

## User Journey

**Phase 1 — Saisie guidée (annonceur)**

1. L'annonceur ouvre le formulaire `/advertiser/briefs/nouveau`
2. Au champ *Besoin Détail*, un bouton **✨ Me guider** apparaît
3. L'assistant pose 3–5 questions : secteur, message clé, ton (sérieux / fun / premium), couleurs, contraintes logo
4. L'annonceur répond via sélecteurs rapides + champ texte court

**Phase 2 — Génération du mock-up**

5. L'assistant synthétise les réponses et appelle Gemini 2.5 Flash pour construire un prompt visuel structuré
6. fal.ai Flux Schnell reçoit le prompt et génère un mock-up publicitaire (JPEG 512×512)
7. Le mock-up s'affiche dans `MockupPreview` : l'annonceur peut le **valider**, **regénérer** (jusqu'à 3 fois) ou **ignorer**

**Phase 3 — Expérience prestataire**

8. Le brief soumis contient le mock-up validé + la description structurée ; la carte brief dans l'espace prestataire affiche l'image en miniature, accélérant l'évaluation

---

## Spécifications techniques

**Modèles IA**

| Usage | Modèle | Fournisseur |
| --- | --- | --- |
| Questions guidées + synthèse prompt | Gemini 2.5 Flash | Google via `ai-gateway.server.ts` |
| Génération d'image | Flux Schnell | fal.ai via Edge Function `generate-creative` |

**Nouveaux fichiers**

| Fichier | Rôle |
| --- | --- |
| `src/lib/ai/quote-brief-assistant.functions.ts` | Logique LLM : questions → prompt structuré |
| `src/components/advertiser/BriefIntentAssistant.tsx` | Composant UI : questions guidées, état de session |
| `src/components/advertiser/MockupPreview.tsx` | Affichage mock-up, actions valider/regénérer |

**Migration SQL**

```sql
ALTER TABLE advertiser_briefs ADD COLUMN mockup_url TEXT;
ALTER TABLE advertiser_briefs ADD COLUMN ai_brief_data JSONB;
```

Le champ `ai_brief_data` stocke les réponses brutes de l'annonceur et le prompt généré. `mockup_url` pointe vers le fichier dans Supabase Storage (`creatives/briefs/<brief_id>/mockup.jpg`).

---

## Risques potentiels

| Risque | Probabilité | Impact | Mitigation |
| --- | --- | --- | --- |
| Hallucinations LLM (questions hors-sujet) | Faible | Moyen | Prompt strict few-shot + température 0.3 |
| Coût IA non maîtrisé | Moyen | Élevé | Quota par annonceur/jour + monitoring via Supabase Edge Logs |
| Mauvaise interprétation du secteur | Moyen | Faible | Possibilité de regénérer jusqu'à 3 fois |
| Contenu inapproprié généré | Faible | Élevé | Filtrage via `safety_settings` Gemini + validation humaine sur signalement |
| Latence > 10s | Moyen | Moyen | Skeleton loading + timeout 30s avec fallback texte |
| Données sensibles dans le brief | Faible | Élevé | PII scrubbing avant envoi au LLM |

---

## KPIs & métriques de succès

| Métrique | Valeur actuelle | Cible J+90 | Mesure |
| --- | --- | --- | --- |
| Taux de complétion du brief | ~45% | ≥ 60% (+15 pts) | `advertiser_briefs.status != 'draft'` |
| Délai moyen brief → 1re proposition | 48–72h | < 24h | `created_at` vs `brief_proposals.created_at` |
| Taux d'usage de l'assistant IA | 0% | ≥ 60% des nouveaux briefs | `ai_brief_data IS NOT NULL` |
| Coût moyen IA par brief | — | < 0,05 € | Tokens Gemini + appels fal.ai agrégés |

---

## Hors périmètre (v1)

- Génération de **vidéo** (motion design, GIF animé)
- Comparaison **multi-styles** en side-by-side (plusieurs variantes simultanées)
- **Partage social** du mock-up (Instagram, LinkedIn direct)
- **Fine-tuning** du modèle sur les campagnes MoveSpot historiques
- Intégration dans l'espace **propriétaire** ou **chauffeur**

---

## Prérequis

- [ ] Clé API fal.ai active dans Supabase Secrets (`FAL_API_KEY`)
- [ ] Gemini 2.5 Flash disponible via `LOVABLE_API_KEY` ou `GOOGLE_AI_API_KEY`
- [ ] Migration SQL appliquée sur la base de production
- [ ] RLS Supabase mis à jour pour les colonnes `mockup_url` et `ai_brief_data`
- [ ] Quota fal.ai validé (plan suffisant pour la charge estimée)
- [ ] Revue légale RGPD : données du brief envoyées à des APIs tiers (Google, fal.ai)
