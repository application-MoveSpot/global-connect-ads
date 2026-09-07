-- ─────────────────────────────────────────────────────────────────────────────
-- Table contact_leads — demandes de devis et prises de contact commerciales
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contact_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan          text NOT NULL DEFAULT 'enterprise'
                  CHECK (plan IN ('enterprise', 'partenaire', 'autre')),
  company_name  text,
  siret         text,
  contact_name  text NOT NULL,
  email         text NOT NULL,
  phone         text,
  budget_range  text,
  message       text,
  status        text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- Seul le service_role accède à la table (lecture/écriture via server functions)
CREATE POLICY "service_role_all" ON public.contact_leads
  USING (true) WITH CHECK (true);

GRANT ALL ON public.contact_leads TO service_role;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trg_fn_contact_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_contact_leads_updated_at ON public.contact_leads;
CREATE TRIGGER trg_contact_leads_updated_at
  BEFORE UPDATE ON public.contact_leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_contact_leads_updated_at();
