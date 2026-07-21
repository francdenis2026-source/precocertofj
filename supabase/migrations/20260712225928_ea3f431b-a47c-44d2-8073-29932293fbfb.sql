
-- 1) Add fields to establishments
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS ie TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2) Create receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  coupon_number TEXT,
  access_key TEXT,
  issued_at TIMESTAMPTZ,
  total NUMERIC(10,2),
  amount_paid NUMERIC(10,2),
  image_url TEXT,
  raw_ocr JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT receipts_access_key_format CHECK (access_key IS NULL OR access_key ~ '^[0-9]{44}$')
);

GRANT SELECT ON public.receipts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view receipts of active establishments"
  ON public.receipts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = receipts.establishment_id AND e.active = true
  ));

CREATE POLICY "Admins can view all receipts"
  ON public.receipts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert receipts"
  ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update receipts"
  ON public.receipts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete receipts"
  ON public.receipts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_receipts_establishment ON public.receipts(establishment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_issued_at ON public.receipts(issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_access_key ON public.receipts(access_key) WHERE access_key IS NOT NULL;

CREATE TRIGGER trg_receipts_updated
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Link scans → receipts + establishments
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_scans_receipt ON public.scans(receipt_id);
CREATE INDEX IF NOT EXISTS idx_scans_establishment ON public.scans(establishment_id);
