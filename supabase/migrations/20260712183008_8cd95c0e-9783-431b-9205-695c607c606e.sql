CREATE TABLE public.role_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  target_user_id UUID NOT NULL,
  target_email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','moderator','user')),
  action TEXT NOT NULL CHECK (action IN ('grant','revoke')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX role_audit_log_created_at_idx ON public.role_audit_log (created_at DESC);
CREATE INDEX role_audit_log_target_idx ON public.role_audit_log (target_user_id);

GRANT SELECT ON public.role_audit_log TO authenticated;
GRANT ALL ON public.role_audit_log TO service_role;

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.role_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));