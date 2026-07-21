
CREATE OR REPLACE FUNCTION public.dedupe_scan_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_size record;
BEGIN
  IF NEW.establishment_id IS NULL OR NEW.status <> 'salvo' OR NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_key := public.normalize_product_key(NEW.product_name);
  IF v_key = '' THEN
    RETURN NEW;
  END IF;

  SELECT size_value, size_unit INTO v_size FROM public.extract_product_size(NEW.product_name);

  DELETE FROM public.scans
  WHERE id IN (
    SELECT s.id
    FROM public.scans s
    CROSS JOIN LATERAL public.extract_product_size(s.product_name) sz
    WHERE s.id <> NEW.id
      AND s.establishment_id = NEW.establishment_id
      AND s.status = 'salvo'
      AND s.user_id IS NULL
      AND public.normalize_product_key(s.product_name) = v_key
      AND COALESCE(sz.size_value, -1) = COALESCE(v_size.size_value, -1)
      AND sz.size_unit = v_size.size_unit
      AND ROUND(COALESCE(s.price_captured, 0)::numeric, 2) = ROUND(COALESCE(NEW.price_captured, 0)::numeric, 2)
      AND s.created_at <= NEW.created_at
  );

  RETURN NEW;
END;
$function$;
