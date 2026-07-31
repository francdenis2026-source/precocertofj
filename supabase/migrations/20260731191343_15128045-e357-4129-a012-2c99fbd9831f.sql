CREATE TABLE IF NOT EXISTS public.scans_import_staging (
  id uuid,
  barcode text,
  product_name text,
  price_captured numeric,
  market_name text,
  created_at timestamptz,
  status text,
  establishment_id uuid,
  quantity numeric,
  unit text,
  verified boolean,
  verified_at timestamptz,
  category text
);
GRANT ALL ON public.scans_import_staging TO service_role;
ALTER TABLE public.scans_import_staging ENABLE ROW LEVEL SECURITY;