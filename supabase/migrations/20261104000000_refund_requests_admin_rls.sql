-- ─────────────────────────────────────────────────────────────────────────────
-- RLS : accès admin à refund_requests
-- Les policies existantes couvrent INSERT/SELECT pour l'annonceur propriétaire.
-- Ce fichier ajoute les policies manquantes pour que les admins puissent lire
-- et traiter toutes les demandes de remboursement.
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT : admins voient toutes les demandes
DROP POLICY IF EXISTS "admin_read_refund_requests" ON refund_requests;
CREATE POLICY "admin_read_refund_requests" ON refund_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE : admins peuvent mettre à jour le statut / notes / stripe_refund_id
DROP POLICY IF EXISTS "admin_update_refund_requests" ON refund_requests;
CREATE POLICY "admin_update_refund_requests" ON refund_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
