
CREATE OR REPLACE FUNCTION public.list_collab_audit_log(
  _submission_id uuid DEFAULT NULL,
  _limit int DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  admin_user_id uuid,
  admin_full_name text,
  action text,
  target_id text,
  before jsonb,
  after jsonb,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.admin_user_id,
    p.full_name AS admin_full_name,
    al.action,
    al.target_id,
    al.before,
    al.after,
    al.notes,
    al.created_at
  FROM public.admin_audit_log al
  LEFT JOIN public.profiles p ON p.id = al.admin_user_id
  WHERE al.target_type = 'collab_submission'
    AND (_submission_id IS NULL OR al.target_id = _submission_id::text)
  ORDER BY al.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_collab_audit_log(uuid, int) TO authenticated;
