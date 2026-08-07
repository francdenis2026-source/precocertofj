-- Final security hardening for public schema functions
-- We previously revoked EXECUTE from PUBLIC/anon/authenticated for all functions.
-- Now we ensure has_role is SECURITY DEFINER but protected, 
-- and that we've followed the "user-roles" instructions for SEC DEF functions.

-- Ensure has_role is SECURITY DEFINER and has the correct search path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Grant EXECUTE back to authenticated and service_role, but NOT anon.
-- RLS policies will call this, and they run as the 'authenticated' role.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Address any remaining SECURITY DEFINER functions that might be exposed.
-- We already did a bulk REVOKE, but let's be explicit for known ones found in linter.
DO $$
DECLARE
    definer_record RECORD;
BEGIN
    FOR definer_record IN 
        SELECT proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true
        AND proname != 'has_role'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', 
            definer_record.proname, definer_record.args);
    END LOOP;
END $$;
