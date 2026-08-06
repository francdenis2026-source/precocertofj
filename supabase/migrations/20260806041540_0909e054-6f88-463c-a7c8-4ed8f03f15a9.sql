BEGIN;
GRANT ALL ON public.product_catalog TO authenticated;
GRANT ALL ON public.scans TO authenticated;
GRANT ALL ON public.product_catalog TO service_role;
GRANT ALL ON public.scans TO service_role;
COMMIT;
