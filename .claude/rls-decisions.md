# Décisions RLS — Politiques intentionnelles

Ce fichier documente les politiques Row Level Security qui **dévient volontairement**
du principe du moindre privilège et **ne doivent pas être « corrigées »** lors d'audits
de sécurité automatiques ou manuels.

---

## `pricing_zone_multipliers` · `pricing_seasonal_multipliers`

### Politique : `SELECT` public (`anon` + `authenticated`, `USING (true)`)

| Propriété | Valeur |
|-----------|--------|
| Migration créatrice | `20261110060000_pricing_multipliers.sql` |
| Migration de documentation | `20261121000000_document_public_rls_pricing_tables.sql` |
| Politiques concernées | `pricing_zone_public_read`, `pricing_seasonal_public_read` |
| Rôles autorisés | `anon`, `authenticated` |
| Prédicat | `USING (true)` — aucun filtre |

### Pourquoi ces tables sont intentionnellement publiques

**1. Aucune donnée personnelle.**
Ces tables contiennent uniquement des grilles de coefficients tarifaires :
- Coefficients par zone géographique (ex. `1.50` pour Paris Centre, `1.20` pour Lyon)
- Coefficients saisonniers / événementiels (ex. `1.25` pour la période des JO, `1.15` pour Noël)

Pas de nom, e-mail, téléphone, SIRET, identifiant interne ou toute autre PII.
Le RGPD et la politique de sécurité MoveSpot n'imposent aucune restriction d'accès.

**2. Nécessité fonctionnelle : simulateur de budget page d'accueil.**
Le calculateur de coût de campagne affiché sur `move-spot.com` (avant toute inscription)
consomme ces deux tables pour calculer en temps réel le budget estimé d'un annonceur.
Ce calculateur doit fonctionner pour les **visiteurs anonymes** (rôle Supabase `anon`).

Restreindre la lecture à `auth.uid()` ou à `authenticated` uniquement ferait :
- Afficher `0 €` ou une erreur 403 dans le simulateur pour tout prospect non connecté.
- Briser le premier point de conversion de la page d'accueil.

**3. Écriture déjà sécurisée.**
Les politiques `INSERT / UPDATE / DELETE` sont réservées au rôle `service_role`
(Edge Functions Supabase uniquement). Aucun utilisateur ni visiteur ne peut modifier
les grilles tarifaires.

### Consigne pour Lovable et les outils d'audit

> **Ne jamais ajouter de prédicat `auth.uid() IS NOT NULL` ni changer `TO anon, authenticated`
> en `TO authenticated` sur ces deux politiques de lecture.**
>
> Si un audit automatique (Lovable Security Advisor, Supabase pg_advisor, Semgrep, etc.)
> signale ces politiques comme « trop permissives », **ignorer l'avertissement** et marquer
> la règle comme supprimée (`-- noqa: RLS001` ou équivalent selon l'outil).
>
> La vérification de conformité est : lire `pg_policies` et confirmer que `roles` contient
> `{anon,authenticated}` et que `qual` vaut `true`.

### Requête de vérification

```sql
SELECT
    tablename,
    policyname,
    cmd,
    roles,
    qual
FROM   pg_policies
WHERE  tablename IN ('pricing_zone_multipliers', 'pricing_seasonal_multipliers')
  AND  cmd = 'r'
ORDER  BY tablename, policyname;
-- Résultat attendu :
--   pricing_seasonal_multipliers | pricing_seasonal_public_read | r | {anon,authenticated} | true
--   pricing_zone_multipliers     | pricing_zone_public_read     | r | {anon,authenticated} | true
```

---

## Référence croisée

- `src/components/shared/` — composants du simulateur de budget (lit ces tables via `supabase.from(...)` sans session)
- `src/lib/payments/` — helpers de calcul tarifaire côté client
- Supabase Edge Functions : seules voies d'écriture sur ces tables (rôle `service_role`)
