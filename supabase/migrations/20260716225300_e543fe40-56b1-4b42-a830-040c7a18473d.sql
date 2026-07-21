DROP TRIGGER IF EXISTS trg_dedupe_scan_on_insert ON public.scans;
CREATE TRIGGER trg_dedupe_scan_on_insert
AFTER INSERT ON public.scans
FOR EACH ROW
EXECUTE FUNCTION public.dedupe_scan_on_insert();