REVOKE EXECUTE ON FUNCTION public.catalog_image_job_provider_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_image_job_provider_stats() TO service_role;