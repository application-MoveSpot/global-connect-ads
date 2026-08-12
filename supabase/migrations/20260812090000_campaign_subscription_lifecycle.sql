-- Suivi du cycle de vie de l'abonnement Stripe (mode "subscription") d'une campagne annonceur.
-- Jusqu'ici seul le checkout était créé côté Stripe : rien ne reliait la subscription
-- Stripe à la ligne campaign_requests, et aucun webhook n'en suivait l'évolution
-- (essai -> active -> impayé -> résilié).
ALTER TABLE public.campaign_requests
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaign_requests_stripe_subscription
  ON public.campaign_requests(stripe_subscription_id);

COMMENT ON COLUMN public.campaign_requests.subscription_status IS
  'Statut Stripe miroir : trialing, active, past_due, unpaid, canceled, incomplete, incomplete_expired.';
