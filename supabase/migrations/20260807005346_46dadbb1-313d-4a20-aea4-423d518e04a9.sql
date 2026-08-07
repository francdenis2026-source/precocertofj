-- Revoke default public execution rights from public schema functions
-- This addresses multiple "Public Can Execute SECURITY DEFINER Function" warnings from the linter.

DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, nspname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', 
            func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Grant EXECUTE back to specific roles for functions that need it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- search functions usually need to be public
GRANT EXECUTE ON FUNCTION public.search_scans_unaccented(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_catalog_suggestions(text, integer) TO anon, authenticated;

-- Ensure service_role can always execute everything
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
