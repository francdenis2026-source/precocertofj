
-- ============================================================
-- FASE 1: Auditoria admin + verificação de scans + região no perfil
-- ============================================================

-- 1. Tabela imutável de auditoria administrativa
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'price_update',
    'scan_delete',
    'price_verify',
    'price_unverify',
    'cache_invalidate_global',
    'cache_invalidate_product',
    'cache_invalidate_store'
  )),
  target_type TEXT NOT NULL,
  target_id TEXT,
  before JSONB,
  after JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_user_id = auth.uid());

-- NO UPDATE/DELETE policies: audit log é imutável para admins comuns

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- 2. Função RPC para registro atômico de ações
CREATE OR REPLACE FUNCTION public.admin_log_action(
  _action TEXT,
  _target_type TEXT,
  _target_id TEXT DEFAULT NULL,
  _before JSONB DEFAULT NULL,
  _after JSONB DEFAULT NULL,
  _notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, before, after, notes)
  VALUES (auth.uid(), _action, _target_type, _target_id, _before, _after, _notes)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_log_action(TEXT, TEXT, TEXT, JSONB, JSONB, TEXT) TO authenticated;

-- 3. Colunas de verificação em scans (idempotente)
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scans_verified ON public.scans(verified) WHERE verified = true;

-- 4. Colunas de região no perfil para memorização do seletor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- 5. Função para listar opções de região (cidade + bairros)
CREATE OR REPLACE FUNCTION public.get_region_options()
RETURNS TABLE(city TEXT, neighborhood TEXT, scan_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM(e.city), ''), 'Feijó') AS city,
    NULLIF(TRIM(e.neighborhood), '') AS neighborhood,
    COUNT(s.id)::int AS scan_count
  FROM public.establishments e
  LEFT JOIN public.scans s ON s.establishment_id = e.id AND s.status = 'salvo'
  WHERE e.active = true
  GROUP BY 1, 2
  ORDER BY 1, 2 NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_region_options() TO anon, authenticated;
