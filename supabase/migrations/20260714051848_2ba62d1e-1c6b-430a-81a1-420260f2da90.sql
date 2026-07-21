
REVOKE EXECUTE ON FUNCTION public.enqueue_catalog_image_jobs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.catalog_image_job_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_catalog_image_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_image_job_stats() TO service_role;
