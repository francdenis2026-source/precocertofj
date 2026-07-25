
-- 1) Cota por plano
ALTER TABLE public.license_plans
  ADD COLUMN IF NOT EXISTS ai_monthly_quota integer NOT NULL DEFAULT 20;

UPDATE public.license_plans SET ai_monthly_quota = CASE slug
  WHEN 'degustacao' THEN 5
  WHEN 'mensal' THEN 20
  WHEN 'trimestral' THEN 60
  WHEN 'anual' THEN 100
  ELSE ai_monthly_quota END;

-- 2) Configurações globais de IA (linha única)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id boolean PRIMARY KEY DEFAULT true,
  default_quota integer NOT NULL DEFAULT 20,
  require_active_plan boolean NOT NULL DEFAULT true,
  allow_trial boolean NOT NULL DEFAULT false,
  warn_thresholds integer[] NOT NULL DEFAULT '{75,95}',
  assistant_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT ai_settings_singleton CHECK (id)
);

GRANT SELECT ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados leem configurações de IA" ON public.ai_settings;
CREATE POLICY "Autenticados leem configurações de IA"
  ON public.ai_settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.ai_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- 3) Cota efetiva do usuário conforme plano resgatado
CREATE OR REPLACE FUNCTION public.ai_effective_quota(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT lp.ai_monthly_quota
       FROM public.license_codes lc
       JOIN public.license_plans lp ON lp.id = lc.plan_id
      WHERE lc.redeemed_by = _user_id AND lc.redeemed_at IS NOT NULL
      ORDER BY lc.redeemed_at DESC LIMIT 1),
    (SELECT default_quota FROM public.ai_settings WHERE id),
    20);
$$;

-- 4) Cota do mês, sincronizando o limite com o plano atual
CREATE OR REPLACE FUNCTION public.get_or_create_ai_quota(_user_id uuid, _default_limit integer DEFAULT 20)
RETURNS ai_quota
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month TEXT := to_char(now(), 'YYYY-MM');
  v_reset TIMESTAMPTZ := date_trunc('month', now()) + interval '1 month';
  v_limit INT;
  v_row public.ai_quota;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  v_limit := COALESCE(public.ai_effective_quota(_user_id), _default_limit);

  INSERT INTO public.ai_quota (user_id, month_key, used, quota_limit, reset_at)
  VALUES (_user_id, v_month, 0, v_limit, v_reset)
  ON CONFLICT (user_id, month_key) DO UPDATE
    SET quota_limit = v_limit, updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_ai_quota(_user_id uuid, _amount integer DEFAULT 1)
RETURNS TABLE(used integer, quota_limit integer, reset_at timestamptz, allowed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month TEXT := to_char(now(), 'YYYY-MM');
  v_row public.ai_quota;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;

  PERFORM public.get_or_create_ai_quota(_user_id, 20);

  UPDATE public.ai_quota q
     SET used = q.used + _amount, updated_at = now()
   WHERE q.user_id = _user_id AND q.month_key = v_month
     AND q.used + _amount <= q.quota_limit
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.ai_quota q
      WHERE q.user_id = _user_id AND q.month_key = v_month;
    RETURN QUERY SELECT v_row.used, v_row.quota_limit, v_row.reset_at, false;
  ELSE
    RETURN QUERY SELECT v_row.used, v_row.quota_limit, v_row.reset_at, true;
  END IF;
END;
$$;

-- 5) Estado de acesso à IA (regras configuráveis)
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
  p RECORD;
  q public.ai_quota;
  v_plan RECORD;
  v_allowed boolean := true;
  v_reason text := 'ok';
  v_limit int;
BEGIN
  SELECT * INTO s FROM public.ai_settings WHERE id;
  SELECT paid_until, trial_ends_at INTO p FROM public.profiles WHERE id = _user_id;
  SELECT lp.slug, lp.name INTO v_plan
    FROM public.license_codes lc
    JOIN public.license_plans lp ON lp.id = lc.plan_id
   WHERE lc.redeemed_by = _user_id AND lc.redeemed_at IS NOT NULL
   ORDER BY lc.redeemed_at DESC LIMIT 1;

  v_limit := public.ai_effective_quota(_user_id);
  SELECT * INTO q FROM public.ai_quota
   WHERE user_id = _user_id AND month_key = to_char(now(), 'YYYY-MM');

  IF NOT COALESCE(s.assistant_enabled, true) THEN
    v_allowed := false; v_reason := 'disabled';
  ELSIF COALESCE(s.require_active_plan, true) THEN
    IF p.paid_until IS NOT NULL AND p.paid_until > now() THEN
      v_allowed := true;
    ELSIF COALESCE(s.allow_trial, false) AND p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now() THEN
      v_allowed := true;
    ELSE
      v_allowed := false; v_reason := 'no_active_plan';
    END IF;
  END IF;

  IF v_allowed AND COALESCE(q.used, 0) >= v_limit THEN
    v_allowed := false; v_reason := 'quota_exceeded';
  END IF;

  RETURN QUERY SELECT
    v_allowed, v_reason, v_plan.slug, v_plan.name,
    v_limit, COALESCE(q.used, 0),
    COALESCE(q.reset_at, date_trunc('month', now()) + interval '1 month'),
    COALESCE(s.require_active_plan, true), COALESCE(s.allow_trial, false),
    COALESCE(s.assistant_enabled, true), COALESCE(s.warn_thresholds, '{75,95}'::int[]),
    p.paid_until, p.trial_ends_at;
END;
$$;

-- 6) Resumo mensal de uso de IA do próprio usuário
CREATE OR REPLACE FUNCTION public.my_ai_usage_summary(_months integer DEFAULT 6)
RETURNS TABLE(month_key text, requests integer, prompt_tokens bigint, completion_tokens bigint, total_tokens bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT to_char(created_at, 'YYYY-MM') AS month_key,
         COUNT(*)::int,
         COALESCE(SUM(prompt_tokens), 0)::bigint,
         COALESCE(SUM(completion_tokens), 0)::bigint,
         COALESCE(SUM(total_tokens), 0)::bigint
  FROM public.ai_usage
  WHERE user_id = auth.uid()
    AND created_at >= date_trunc('month', now()) - make_interval(months => GREATEST(_months, 1) - 1)
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

-- 7) Administração
CREATE OR REPLACE FUNCTION public.admin_update_ai_settings(
  _default_quota integer DEFAULT NULL,
  _require_active_plan boolean DEFAULT NULL,
  _allow_trial boolean DEFAULT NULL,
  _assistant_enabled boolean DEFAULT NULL,
  _warn_thresholds integer[] DEFAULT NULL
)
RETURNS ai_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.ai_settings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.ai_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
  UPDATE public.ai_settings SET
    default_quota = GREATEST(COALESCE(_default_quota, default_quota), 0),
    require_active_plan = COALESCE(_require_active_plan, require_active_plan),
    allow_trial = COALESCE(_allow_trial, allow_trial),
    assistant_enabled = COALESCE(_assistant_enabled, assistant_enabled),
    warn_thresholds = COALESCE(_warn_thresholds, warn_thresholds),
    updated_at = now(), updated_by = auth.uid()
  WHERE id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_plan_ai_quota(_plan_id uuid, _quota integer)
RETURNS license_plans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.license_plans;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.license_plans
     SET ai_monthly_quota = GREATEST(COALESCE(_quota, 0), 0), updated_at = now()
   WHERE id = _plan_id RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'plan not found'; END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_ai_quota(_user_id uuid, _quota integer)
RETURNS ai_quota
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month TEXT := to_char(now(), 'YYYY-MM');
  v_row public.ai_quota;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.ai_quota (user_id, month_key, used, quota_limit, reset_at)
  VALUES (_user_id, v_month, 0, GREATEST(_quota, 0), date_trunc('month', now()) + interval '1 month')
  ON CONFLICT (user_id, month_key) DO UPDATE
    SET quota_limit = GREATEST(_quota, 0), updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
