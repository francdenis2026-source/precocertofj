
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL UNIQUE,
  external_ref TEXT,
  plan_id TEXT,
  plan_name TEXT,
  plan_days INTEGER NOT NULL DEFAULT 30,
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'approved',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  new_paid_until TIMESTAMPTZ,
  payer_email TEXT,
  payer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_receipts_profile ON public.payment_receipts(profile_id, paid_at DESC);

GRANT SELECT ON public.payment_receipts TO authenticated;
GRANT ALL ON public.payment_receipts TO service_role;

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own receipts"
  ON public.payment_receipts FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE TRIGGER update_payment_receipts_updated_at
  BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
