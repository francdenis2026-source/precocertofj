
-- Table for per-establishment product price history
CREATE TABLE IF NOT EXISTS public.product_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  size_value NUMERIC,
  size_unit TEXT,
  price NUMERIC NOT NULL,
  previous_price NUMERIC,
  change_pct NUMERIC,
  source TEXT NOT NULL DEFAULT 'scan',
  scan_id UUID,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.product_price_history TO authenticated;
GRANT ALL ON public.product_price_history TO service_role;

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read price history"
  ON public.product_price_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service inserts price history"
  ON public.product_price_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_pph_est_key_captured
  ON public.product_price_history (establishment_id, product_key, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_pph_captured
  ON public.product_price_history (captured_at DESC);

-- Trigger: after inserting a saved scan with a captured price, log price history
CREATE OR REPLACE FUNCTION public.tg_record_price_history_on_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key TEXT;
  v_prev NUMERIC;
  v_change NUMERIC;
  v_size RECORD;
BEGIN
  IF NEW.status <> 'salvo' OR NEW.price_captured IS NULL OR NEW.product_name IS NULL OR NEW.establishment_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.barcode IS NOT NULL AND btrim(NEW.barcode) <> '' THEN
    v_key := 'bc:' || btrim(NEW.barcode);
  ELSE
    v_key := 'nm:' || public.normalize_product_key(NEW.product_name);
  END IF;

  IF v_key IS NULL OR v_key = 'nm:' THEN RETURN NEW; END IF;

  SELECT price INTO v_prev
  FROM public.product_price_history
  WHERE establishment_id = NEW.establishment_id AND product_key = v_key
  ORDER BY captured_at DESC
  LIMIT 1;

  IF v_prev IS NOT NULL AND v_prev > 0 THEN
    v_change := ROUND(((NEW.price_captured - v_prev) / v_prev * 100)::numeric, 2);
  END IF;

  SELECT size_value, size_unit INTO v_size FROM public.extract_product_size(NEW.product_name);

  INSERT INTO public.product_price_history (
    establishment_id, product_key, product_name, brand, size_value, size_unit,
    price, previous_price, change_pct, source, scan_id, captured_at
  ) VALUES (
    NEW.establishment_id, v_key, NEW.product_name, NULL,
    v_size.size_value, v_size.size_unit,
    NEW.price_captured, v_prev, v_change, 'scan', NEW.id, COALESCE(NEW.created_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_price_history_on_scan ON public.scans;
CREATE TRIGGER trg_record_price_history_on_scan
AFTER INSERT ON public.scans
FOR EACH ROW EXECUTE FUNCTION public.tg_record_price_history_on_scan();
