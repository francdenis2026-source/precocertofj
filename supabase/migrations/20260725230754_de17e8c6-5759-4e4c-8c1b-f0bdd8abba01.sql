
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

  IF NOT COALESCE(s.assistant_enabled, true) THEN
    v_allowed := false; v_reason := 'disabled';
  ELSIF COALESCE(s.require_active_plan, true) THEN
    IF v_paid IS NOT NULL AND v_paid > now() THEN
      v_allowed := true;
    ELSIF COALESCE(s.allow_trial, false) AND v_trial IS NOT NULL AND v_trial > now() THEN
      v_allowed := true;
    ELSE
      v_allowed := false; v_reason := 'no_active_plan';
    END IF;
  END IF;

  IF v_allowed AND COALESCE(v_used, 0) >= v_limit THEN
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
