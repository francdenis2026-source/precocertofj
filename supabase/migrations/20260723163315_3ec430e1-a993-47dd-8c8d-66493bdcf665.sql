
-- 1) Add changed_by column to price history
ALTER TABLE public.product_price_history
  ADD COLUMN IF NOT EXISTS changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS changed_by_email text;

CREATE INDEX IF NOT EXISTS idx_pph_est_captured
  ON public.product_price_history (establishment_id, captured_at DESC);

-- 2) Replace trigger fn to also fire on UPDATE and track user
CREATE OR REPLACE FUNCTION public.tg_record_price_history_on_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_key TEXT;
  v_prev NUMERIC;
  v_change NUMERIC;
  v_size RECORD;
  v_source TEXT;
  v_user  UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF NEW.status <> 'salvo' OR NEW.price_captured IS NULL
     OR NEW.product_name IS NULL OR NEW.establishment_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.price_captured IS NOT DISTINCT FROM NEW.price_captured
       AND OLD.product_name IS NOT DISTINCT FROM NEW.product_name THEN
      RETURN NEW;
    END IF;
    v_source := 'edit';
  ELSE
    v_source := 'scan';
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
   ORDER BY captured_at DESC LIMIT 1;

  IF v_prev IS NOT NULL AND v_prev > 0 THEN
    v_change := ROUND(((NEW.price_captured - v_prev) / v_prev * 100)::numeric, 2);
  END IF;

  SELECT size_value, size_unit INTO v_size FROM public.extract_product_size(NEW.product_name);

  IF v_user IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  END IF;

  INSERT INTO public.product_price_history (
    establishment_id, product_key, product_name, brand, size_value, size_unit,
    price, previous_price, change_pct, source, scan_id, captured_at,
    changed_by, changed_by_email
  ) VALUES (
    NEW.establishment_id, v_key, NEW.product_name, NULL,
    v_size.size_value, v_size.size_unit,
    NEW.price_captured, v_prev, v_change, v_source, NEW.id, now(),
    v_user, v_email
  );

  RETURN NEW;
END;
$$;

-- Recreate trigger to fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_record_price_history_on_scan ON public.scans;
CREATE TRIGGER trg_record_price_history_on_scan
AFTER INSERT OR UPDATE OF price_captured, product_name
ON public.scans
FOR EACH ROW EXECUTE FUNCTION public.tg_record_price_history_on_scan();

-- 3) Public read of price history (data is non-sensitive; supports the public store page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_price_history'
      AND policyname='Public reads price history'
  ) THEN
    CREATE POLICY "Public reads price history"
      ON public.product_price_history
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

GRANT SELECT ON public.product_price_history TO anon;
