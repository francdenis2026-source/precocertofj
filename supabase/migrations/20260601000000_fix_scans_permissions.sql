-- Grant delete on scans to sandbox_exec if possible, but migrations usually run as superuser.
-- The prompt says every table must have GRANTs.
GRANT ALL ON public.scans TO authenticated, anon, service_role;
