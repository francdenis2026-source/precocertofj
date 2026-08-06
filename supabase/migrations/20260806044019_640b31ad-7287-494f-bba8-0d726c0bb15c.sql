GRANT DELETE ON public.scans TO authenticated;
GRANT DELETE ON public.scans TO service_role;
GRANT DELETE ON public.scans TO anon;
GRANT ALL ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;

ALTER FUNCTION public.dedupe_scan_on_insert() SECURITY DEFINER;
