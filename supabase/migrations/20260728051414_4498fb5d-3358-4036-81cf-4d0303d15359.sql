
ALTER TABLE public.license_codes
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS is_trial_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_license_codes_trial_active
  ON public.license_codes (redeemed_by, access_expires_at)
  WHERE is_trial_access = true AND status = 'redeemed';

INSERT INTO public.license_plans
  (name, slug, days, price_cents, active, sort_order, description,
   ai_monthly_quota, cycle, features, highlight)
VALUES
  ('Acesso Temporário', 'acesso-temporario', 1, 0, true, 900,
   'Acesso liberado por tempo determinado (definido pelo código). Sem uso de IA.',
   0, 'trial', '["Acesso completo ao catálogo","Sem uso da IA"]'::jsonb, false)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description,
      ai_monthly_quota = 0, active = true;

CREATE OR REPLACE FUNCTION public.redeem_license_code(_user_id UUID, _code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, added_days INTEGER, new_paid_until TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lc public.license_codes; v_plan public.license_plans;
  v_current TIMESTAMPTZ; v_new TIMESTAMPTZ; v_add_minutes INT;
BEGIN
  IF _user_id IS NULL OR _code IS NULL OR length(trim(_code))=0 THEN
    RETURN QUERY SELECT false,'Código inválido',0,NULL::timestamptz; RETURN; END IF;
  SELECT * INTO v_lc FROM public.license_codes WHERE code=upper(trim(_code)) FOR UPDATE;
  IF v_lc.id IS NULL THEN RETURN QUERY SELECT false,'Código não encontrado',0,NULL::timestamptz; RETURN; END IF;
  IF v_lc.status='redeemed' THEN RETURN QUERY SELECT false,'Código já foi resgatado',0,NULL::timestamptz; RETURN; END IF;
  IF v_lc.status='revoked' THEN RETURN QUERY SELECT false,'Código revogado',0,NULL::timestamptz; RETURN; END IF;
  IF v_lc.status='expired' OR v_lc.expires_at<now() THEN
    UPDATE public.license_codes SET status='expired' WHERE id=v_lc.id;
    RETURN QUERY SELECT false,'Código expirado',0,NULL::timestamptz; RETURN; END IF;
  IF v_lc.status NOT IN ('paid') THEN RETURN QUERY SELECT false,'Código ainda não foi pago',0,NULL::timestamptz; RETURN; END IF;

  SELECT * INTO v_plan FROM public.license_plans WHERE id=v_lc.plan_id;
  v_add_minutes := COALESCE(v_lc.duration_minutes, v_plan.days*1440);
  IF v_add_minutes IS NULL OR v_add_minutes<=0 THEN
    RETURN QUERY SELECT false,'Duração inválida',0,NULL::timestamptz; RETURN; END IF;

  SELECT paid_until INTO v_current FROM public.profiles WHERE id=_user_id;
  v_new := GREATEST(COALESCE(v_current,now()),now()) + make_interval(mins=>v_add_minutes);
  UPDATE public.profiles SET paid_until=v_new, updated_at=now() WHERE id=_user_id;
  UPDATE public.license_codes
    SET status='redeemed', redeemed_by=_user_id, redeemed_at=now(),
        access_expires_at=now()+make_interval(mins=>v_add_minutes)
    WHERE id=v_lc.id;
  RETURN QUERY SELECT true,'Código resgatado com sucesso',GREATEST(1,v_add_minutes/1440),v_new;
END; $$;
REVOKE ALL ON FUNCTION public.redeem_license_code(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_code(UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.ai_effective_quota(_user_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_slug text; v_quota int; v_paid timestamptz; v_trial_active boolean:=false;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.license_codes
     WHERE redeemed_by=_user_id AND is_trial_access=true AND status='redeemed'
       AND (access_expires_at IS NULL OR access_expires_at>now())) INTO v_trial_active;
  IF v_trial_active THEN RETURN 1; END IF;
  SELECT lp.slug, lp.ai_monthly_quota INTO v_slug,v_quota
    FROM public.license_codes lc JOIN public.license_plans lp ON lp.id=lc.plan_id
   WHERE lc.redeemed_by=_user_id AND lc.redeemed_at IS NOT NULL
   ORDER BY lc.redeemed_at DESC LIMIT 1;
  SELECT p.paid_until INTO v_paid FROM public.profiles p WHERE p.id=_user_id;
  IF v_slug IS NULL OR v_slug IN ('degustacao','acesso-temporario')
     OR COALESCE(v_quota,0)<=0 OR v_paid IS NULL OR v_paid<=now() THEN RETURN 1; END IF;
  RETURN v_quota;
END; $$;

CREATE OR REPLACE FUNCTION public.get_ai_access(_user_id uuid)
RETURNS TABLE(
  allowed boolean, reason text, plan_slug text, plan_name text,
  quota_limit integer, used integer, reset_at timestamptz,
  require_active_plan boolean, allow_trial boolean, assistant_enabled boolean,
  warn_thresholds integer[], paid_until timestamptz, trial_ends_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.ai_settings; v_paid timestamptz; v_trial timestamptz;
        v_used int:=0; v_reset timestamptz;
        v_plan_slug text; v_plan_name text;
        v_allowed boolean:=true; v_reason text:='ok';
        v_limit int; v_is_free boolean; v_trial_access boolean:=false;
BEGIN
  SELECT * INTO s FROM public.ai_settings WHERE id;
  SELECT p.paid_until,p.trial_ends_at INTO v_paid,v_trial FROM public.profiles p WHERE p.id=_user_id;
  SELECT lp.slug,lp.name INTO v_plan_slug,v_plan_name
    FROM public.license_codes lc JOIN public.license_plans lp ON lp.id=lc.plan_id
   WHERE lc.redeemed_by=_user_id AND lc.redeemed_at IS NOT NULL
   ORDER BY lc.redeemed_at DESC LIMIT 1;
  SELECT EXISTS (SELECT 1 FROM public.license_codes
     WHERE redeemed_by=_user_id AND is_trial_access=true AND status='redeemed'
       AND (access_expires_at IS NULL OR access_expires_at>now())) INTO v_trial_access;
  v_limit := public.ai_effective_quota(_user_id);
  SELECT q.used,q.reset_at INTO v_used,v_reset FROM public.ai_quota q
   WHERE q.user_id=_user_id AND q.month_key=to_char(now(),'YYYY-MM');
  v_is_free := v_trial_access OR v_plan_slug IN ('degustacao','acesso-temporario')
    OR NOT ((v_paid IS NOT NULL AND v_paid>now())
      OR (COALESCE(s.allow_trial,false) AND v_trial IS NOT NULL AND v_trial>now()));
  IF NOT COALESCE(s.assistant_enabled,true) THEN v_allowed:=false; v_reason:='disabled';
  ELSIF v_trial_access THEN v_allowed:=false; v_reason:='trial_access_no_ai'; v_limit:=0;
  ELSIF v_is_free THEN v_limit:=1;
    IF COALESCE(v_used,0)>=1 THEN v_allowed:=false; v_reason:='free_quota_exceeded';
    ELSE v_allowed:=true; v_reason:='free_single_call'; END IF;
  ELSIF COALESCE(v_used,0)>=v_limit THEN v_allowed:=false; v_reason:='quota_exceeded'; END IF;
  RETURN QUERY SELECT v_allowed,v_reason,v_plan_slug,v_plan_name,
    v_limit,COALESCE(v_used,0),
    COALESCE(v_reset,date_trunc('month',now())+interval '1 month'),
    COALESCE(s.require_active_plan,true),COALESCE(s.allow_trial,false),
    COALESCE(s.assistant_enabled,true),COALESCE(s.warn_thresholds,'{75,95}'::int[]),
    v_paid,v_trial;
END; $$;

CREATE OR REPLACE FUNCTION public.list_trial_access_users(_include_ended boolean DEFAULT false)
RETURNS TABLE(license_id uuid, code text, user_id uuid, full_name text, email text,
  redeemed_at timestamptz, access_expires_at timestamptz, duration_minutes int,
  minutes_remaining int, is_active boolean, notes text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT lc.id,lc.code,lc.redeemed_by,p.full_name,
         (SELECT u.email FROM auth.users u WHERE u.id=lc.redeemed_by)::text,
         lc.redeemed_at,lc.access_expires_at,lc.duration_minutes,
         GREATEST(0,EXTRACT(EPOCH FROM (lc.access_expires_at-now()))/60)::int,
         (lc.access_expires_at IS NULL OR lc.access_expires_at>now()),
         lc.notes
    FROM public.license_codes lc
    LEFT JOIN public.profiles p ON p.id=lc.redeemed_by
   WHERE lc.is_trial_access=true AND lc.status='redeemed'
     AND (_include_ended OR lc.access_expires_at IS NULL OR lc.access_expires_at>now())
   ORDER BY lc.redeemed_at DESC NULLS LAST LIMIT 500;
END; $$;
REVOKE ALL ON FUNCTION public.list_trial_access_users(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_trial_access_users(boolean) TO authenticated, service_role;

DO $$
DECLARE v_plan_id uuid; i int; j int;
        alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        v_seg text; v_code text;
BEGIN
  SELECT id INTO v_plan_id FROM public.license_plans WHERE slug='acesso-temporario' LIMIT 1;
  IF v_plan_id IS NULL THEN RETURN; END IF;
  FOR i IN 1..10 LOOP
    v_seg := '';
    FOR j IN 1..12 LOOP
      v_seg := v_seg || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
      IF j=4 OR j=8 THEN v_seg := v_seg || '-'; END IF;
    END LOOP;
    v_code := 'PC-' || v_seg;
    INSERT INTO public.license_codes
      (code, plan_id, price_cents, status, expires_at,
       duration_minutes, is_trial_access, notes)
    VALUES
      (v_code, v_plan_id, 0, 'paid', now() + interval '180 days',
       1440, true, 'Seed inicial 24h — acesso sem IA')
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;
