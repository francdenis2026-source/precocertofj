CREATE OR REPLACE FUNCTION public.fill_scan_market_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.market_name IS NULL OR btrim(NEW.market_name) = '') AND NEW.establishment_id IS NOT NULL THEN
    SELECT e.name INTO NEW.market_name
    FROM public.establishments e
    WHERE e.id = NEW.establishment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_scan_market_name ON public.scans;
CREATE TRIGGER trg_fill_scan_market_name
BEFORE INSERT OR UPDATE OF establishment_id, market_name ON public.scans
FOR EACH ROW EXECUTE FUNCTION public.fill_scan_market_name();