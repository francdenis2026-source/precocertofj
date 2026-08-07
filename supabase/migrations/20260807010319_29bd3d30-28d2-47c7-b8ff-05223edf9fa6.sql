-- The previous security hardening revoked ALL on all public functions.
-- We need to ensure establishments_overview and search functions are explicitly granted to anon and authenticated roles.
-- Using precise function signatures (matching text, integer for those with defaults).

GRANT EXECUTE ON FUNCTION public.establishments_overview() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_scans_unaccented(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_catalog_suggestions(text, integer) TO anon, authenticated, service_role;

-- Ensure the functions are SECURITY DEFINER with search_path set for safety and consistency.
ALTER FUNCTION public.establishments_overview() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.search_scans_unaccented(text, integer) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.search_catalog_suggestions(text, integer) SECURITY DEFINER SET search_path = public;
