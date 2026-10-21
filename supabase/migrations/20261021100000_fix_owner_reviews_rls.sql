-- Renforce la policy INSERT sur owner_reviews :
-- l'annonceur doit être propriétaire de la campagne qu'il évalue.
DROP POLICY IF EXISTS "Advertiser can submit reviews" ON owner_reviews;

CREATE POLICY "Advertiser can submit reviews" ON owner_reviews
  FOR INSERT WITH CHECK (
    advertiser_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM campaign_requests cr
      WHERE cr.id = campaign_request_id
        AND cr.user_id = auth.uid()
    )
  );
