
CREATE TABLE IF NOT EXISTS public.price_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_slug TEXT,
  barcode TEXT,
  reported_price NUMERIC,
  correct_price NUMERIC,
  reason TEXT NOT NULL CHECK (reason IN ('incorrect','outdated','wrong_product','other')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_reports_estab ON public.price_reports(establishment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_reports_user ON public.price_reports(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.price_reports TO authenticated;
GRANT ALL ON public.price_reports TO service_role;

ALTER TABLE public.price_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users create own reports"
  ON public.price_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own reports"
  ON public.price_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage reports"
  ON public.price_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_price_reports_updated
  BEFORE UPDATE ON public.price_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill product_catalog.image_url from scans when catalog has no image yet
UPDATE public.product_catalog pc
SET image_url = sub.image_url
FROM (
  SELECT DISTINCT ON (barcode) barcode, image_url
  FROM public.scans
  WHERE barcode IS NOT NULL AND image_url IS NOT NULL
  ORDER BY barcode, created_at DESC
) sub
WHERE pc.image_url IS NULL AND pc.barcode = sub.barcode;
