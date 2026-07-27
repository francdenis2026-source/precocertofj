CREATE OR REPLACE FUNCTION public.ai_effective_quota(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_quota int;
  v_paid timestamptz;
BEGIN
  SELECT lp.slug, lp.ai_monthly_quota INTO v_slug, v_quota
    FROM public.license_codes lc
    JOIN public.license_plans lp ON lp.id = lc.plan_id
   WHERE lc.redeemed_by = _user_id AND lc.redeemed_at IS NOT NULL
   ORDER BY lc.redeemed_at DESC LIMIT 1;

  SELECT p.paid_until INTO v_paid FROM public.profiles p WHERE p.id = _user_id;

  -- Plano grátis / degustação / assinatura vencida: 1 chamada de IA por mês.
  IF v_slug IS NULL OR v_slug = 'degustacao' OR COALESCE(v_quota, 0) <= 0
     OR v_paid IS NULL OR v_paid <= now() THEN
    RETURN 1;
  END IF;

  RETURN v_quota;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_access(_user_id uuid)
RETURNS TABLE(
  allowed boolean, reason text, plan_slug text, plan_name text,
  quota_limit integer, used integer, reset_at timestamptz,
  require_active_plan boolean, allow_trial boolean, assistant_enabled boolean,
  warn_thresholds integer[], paid_until timestamptz, trial_ends_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s public.ai_settings;
  v_paid timestamptz;
  v_trial timestamptz;
  v_used int := 0;
  v_reset timestamptz;
  v_plan_slug text;
  v_plan_name text;
  v_allowed boolean := true;
  v_reason text := 'ok';
  v_limit int;
  v_is_free boolean;
BEGIN
  SELECT * INTO s FROM public.ai_settings WHERE id;

  SELECT p.paid_until, p.trial_ends_at INTO v_paid, v_trial
    FROM public.profiles p WHERE p.id = _user_id;

  SELECT lp.slug, lp.name INTO v_plan_slug, v_plan_name
    FROM public.license_codes lc
    JOIN public.license_plans lp ON lp.id = lc.plan_id
   WHERE lc.redeemed_by = _user_id AND lc.redeemed_at IS NOT NULL
   ORDER BY lc.redeemed_at DESC LIMIT 1;

  v_limit := public.ai_effective_quota(_user_id);

  SELECT q.used, q.reset_at INTO v_used, v_reset
    FROM public.ai_quota q
   WHERE q.user_id = _user_id AND q.month_key = to_char(now(), 'YYYY-MM');

  v_is_free := NOT (
      (v_paid IS NOT NULL AND v_paid > now())
      OR (COALESCE(s.allow_trial, false) AND v_trial IS NOT NULL AND v_trial > now())
    ) OR v_plan_slug = 'degustacao';

  IF NOT COALESCE(s.assistant_enabled, true) THEN
    v_allowed := false; v_reason := 'disabled';
  ELSIF v_is_free THEN
    -- Plano grátis: exatamente 1 chamada de IA por mês.
    v_limit := 1;
    IF COALESCE(v_used, 0) >= 1 THEN
      v_allowed := false; v_reason := 'free_quota_exceeded';
    ELSE
      v_allowed := true; v_reason := 'free_single_call';
    END IF;
  ELSIF COALESCE(v_used, 0) >= v_limit THEN
    v_allowed := false; v_reason := 'quota_exceeded';
  END IF;

  RETURN QUERY SELECT
    v_allowed, v_reason, v_plan_slug, v_plan_name,
    v_limit, COALESCE(v_used, 0),
    COALESCE(v_reset, date_trunc('month', now()) + interval '1 month'),
    COALESCE(s.require_active_plan, true), COALESCE(s.allow_trial, false),
    COALESCE(s.assistant_enabled, true), COALESCE(s.warn_thresholds, '{75,95}'::int[]),
    v_paid, v_trial;
END;
$$;