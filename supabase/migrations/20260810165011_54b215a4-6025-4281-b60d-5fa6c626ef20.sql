CREATE TABLE public.bank_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'eur',
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')),
  receipt_path text,
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bank_transfer_requests TO authenticated;
GRANT ALL ON public.bank_transfer_requests TO service_role;

ALTER TABLE public.bank_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.bank_transfer_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own_insert" ON public.bank_transfer_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_update_pending" ON public.bank_transfer_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','submitted'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','submitted'));

CREATE POLICY "admin_select" ON public.bank_transfer_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update" ON public.bank_transfer_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bank_transfer_requests_updated_at
  BEFORE UPDATE ON public.bank_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "bank_receipts_own_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bank-receipts' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "bank_receipts_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bank-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
