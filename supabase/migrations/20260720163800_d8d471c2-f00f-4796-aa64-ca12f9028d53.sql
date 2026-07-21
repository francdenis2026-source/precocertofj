
-- ============================================================
-- LICENSE PLANS
-- ============================================================
CREATE TABLE public.license_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  days INTEGER NOT NULL CHECK (days > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.license_plans TO anon, authenticated;
GRANT ALL ON public.license_plans TO service_role;

ALTER TABLE public.license_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos ativos visíveis a todos"
  ON public.license_plans FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam planos"
  ON public.license_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_license_plans_updated_at
  BEFORE UPDATE ON public.license_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial plans
INSERT INTO public.license_plans (name, slug, days, price_cents, sort_order, description) VALUES
  ('15 dias',    'p15',   15,  1200, 10,  'Ideal para experimentar recursos premium.'),
  ('30 dias',    'p30',   30,  2000, 20,  'Plano mensal — o mais popular.'),
  ('60 dias',    'p60',   60,  3500, 30,  'Economize com 2 meses.'),
  ('6 meses',    'p180',  180, 9900, 40,  'Semestral com desconto.'),
  ('24 meses',   'p720',  720, 29900, 50, 'Plano de 2 anos — melhor custo-benefício.');

-- ============================================================
-- LICENSE CODES
-- ============================================================
CREATE TABLE public.license_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.license_plans(id) ON DELETE RESTRICT,
  price_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','redeemed','expired','revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  buyer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mp_payment_id TEXT UNIQUE,
  mp_preference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_license_codes_status ON public.license_codes(status);
CREATE INDEX idx_license_codes_buyer ON public.license_codes(buyer_user_id);
CREATE INDEX idx_license_codes_redeemed_by ON public.license_codes(redeemed_by);
CREATE INDEX idx_license_codes_expires_at ON public.license_codes(expires_at);

GRANT SELECT, INSERT, UPDATE ON public.license_codes TO authenticated;
GRANT ALL ON public.license_codes TO service_role;

ALTER TABLE public.license_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprios códigos"
  ON public.license_codes FOR SELECT
  USING (
    buyer_user_id = auth.uid()
    OR redeemed_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins gerenciam códigos"
  ON public.license_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_license_codes_updated_at
  BEFORE UPDATE ON public.license_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- AI USAGE LOG
-- ============================================================
CREATE TABLE public.ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  model TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  credits_cents NUMERIC(10,4) NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_user ON public.ai_usage(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_created ON public.ai_usage(created_at DESC);

GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprio uso IA"
  ON public.ai_usage FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- AI QUOTA
-- ============================================================
CREATE TABLE public.ai_quota (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL, -- 'YYYY-MM'
  used INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 20,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_key)
);

CREATE INDEX idx_ai_quota_user ON public.ai_quota(user_id);

GRANT SELECT ON public.ai_quota TO authenticated;
GRANT ALL ON public.ai_quota TO service_role;

ALTER TABLE public.ai_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê própria cota"
  ON public.ai_quota FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_quota_updated_at
  BEFORE UPDATE ON public.ai_quota
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- LOGIN EVENTS
-- ============================================================
CREATE TABLE public.login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  cpf_masked TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_events_user ON public.login_events(user_id, created_at DESC);
CREATE INDEX idx_login_events_created ON public.login_events(created_at DESC);
CREATE INDEX idx_login_events_success ON public.login_events(success, created_at DESC);

GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê próprios logins"
  ON public.login_events FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- PROFILES: last_seen_at + total_logins
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_logins INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- HELPER: get_or_create_monthly_quota
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_ai_quota(_user_id UUID, _default_limit INTEGER DEFAULT 20)
RETURNS public.ai_quota
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT := to_char(now(), 'YYYY-MM');
  v_reset TIMESTAMPTZ := date_trunc('month', now()) + interval '1 month';
  v_row public.ai_quota;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  INSERT INTO public.ai_quota (user_id, month_key, used, quota_limit, reset_at)
  VALUES (_user_id, v_month, 0, _default_limit, v_reset)
  ON CONFLICT (user_id, month_key) DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ============================================================
-- HELPER: consume_ai_quota (atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_ai_quota(_user_id UUID, _amount INTEGER DEFAULT 1)
RETURNS TABLE(used INTEGER, quota_limit INTEGER, reset_at TIMESTAMPTZ, allowed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT := to_char(now(), 'YYYY-MM');
  v_reset TIMESTAMPTZ := date_trunc('month', now()) + interval '1 month';
  v_row public.ai_quota;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  INSERT INTO public.ai_quota (user_id, month_key, used, quota_limit, reset_at)
  VALUES (_user_id, v_month, 0, 20, v_reset)
  ON CONFLICT (user_id, month_key) DO NOTHING;

  UPDATE public.ai_quota
    SET used = used + _amount, updated_at = now()
    WHERE user_id = _user_id AND month_key = v_month
      AND used + _amount <= quota_limit
    RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.ai_quota
      WHERE user_id = _user_id AND month_key = v_month;
    RETURN QUERY SELECT v_row.used, v_row.quota_limit, v_row.reset_at, false;
  ELSE
    RETURN QUERY SELECT v_row.used, v_row.quota_limit, v_row.reset_at, true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_quota(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(UUID, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.get_or_create_ai_quota(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_ai_quota(UUID, INTEGER) TO authenticated, service_role;

-- ============================================================
-- HELPER: redeem_license_code
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_license_code(_user_id UUID, _code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, added_days INTEGER, new_paid_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lc public.license_codes;
  v_plan public.license_plans;
  v_current TIMESTAMPTZ;
  v_new TIMESTAMPTZ;
BEGIN
  IF _user_id IS NULL OR _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN QUERY SELECT false, 'Código inválido', 0, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO v_lc FROM public.license_codes
    WHERE code = upper(trim(_code))
    FOR UPDATE;

  IF v_lc.id IS NULL THEN
    RETURN QUERY SELECT false, 'Código não encontrado', 0, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_lc.status = 'redeemed' THEN
    RETURN QUERY SELECT false, 'Código já foi resgatado', 0, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_lc.status = 'revoked' THEN
    RETURN QUERY SELECT false, 'Código revogado', 0, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_lc.status = 'expired' OR v_lc.expires_at < now() THEN
    UPDATE public.license_codes SET status = 'expired' WHERE id = v_lc.id;
    RETURN QUERY SELECT false, 'Código expirado', 0, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_lc.status NOT IN ('paid') THEN
    RETURN QUERY SELECT false, 'Código ainda não foi pago', 0, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO v_plan FROM public.license_plans WHERE id = v_lc.plan_id;

  SELECT paid_until INTO v_current FROM public.profiles WHERE id = _user_id;
  v_new := GREATEST(COALESCE(v_current, now()), now()) + make_interval(days => v_plan.days);

  UPDATE public.profiles SET paid_until = v_new, updated_at = now() WHERE id = _user_id;
  UPDATE public.license_codes
    SET status = 'redeemed', redeemed_by = _user_id, redeemed_at = now()
    WHERE id = v_lc.id;

  RETURN QUERY SELECT true, 'Código resgatado com sucesso', v_plan.days, v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_license_code(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_code(UUID, TEXT) TO service_role;

-- ============================================================
-- HELPER: apply_paid_license (called by MP webhook)
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_paid_license(_license_id UUID, _mp_payment_id TEXT)
RETURNS TABLE(success BOOLEAN, new_paid_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lc public.license_codes;
  v_plan public.license_plans;
  v_current TIMESTAMPTZ;
  v_new TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_lc FROM public.license_codes WHERE id = _license_id FOR UPDATE;
  IF v_lc.id IS NULL OR v_lc.buyer_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamptz;
    RETURN;
  END IF;

  -- Idempotência
  IF v_lc.status IN ('paid','redeemed') AND v_lc.mp_payment_id = _mp_payment_id THEN
    RETURN QUERY SELECT true, (SELECT paid_until FROM public.profiles WHERE id = v_lc.buyer_user_id);
    RETURN;
  END IF;

  SELECT * INTO v_plan FROM public.license_plans WHERE id = v_lc.plan_id;
  SELECT paid_until INTO v_current FROM public.profiles WHERE id = v_lc.buyer_user_id;
  v_new := GREATEST(COALESCE(v_current, now()), now()) + make_interval(days => v_plan.days);

  UPDATE public.profiles SET paid_until = v_new, updated_at = now() WHERE id = v_lc.buyer_user_id;
  UPDATE public.license_codes
    SET status = 'redeemed',
        mp_payment_id = _mp_payment_id,
        redeemed_by = buyer_user_id,
        redeemed_at = now()
    WHERE id = v_lc.id;

  RETURN QUERY SELECT true, v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_paid_license(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_paid_license(UUID, TEXT) TO service_role;
