
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  blocked_until timestamptz NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blocked_ips_ip_idx ON public.blocked_ips (ip);
CREATE INDEX IF NOT EXISTS blocked_ips_until_idx ON public.blocked_ips (blocked_until);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_ips TO authenticated;
GRANT ALL ON public.blocked_ips TO service_role;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam bloqueios de IP" ON public.blocked_ips
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER blocked_ips_set_updated_at BEFORE UPDATE ON public.blocked_ips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip = _ip AND blocked_until > now()
  );
$$;
REVOKE ALL ON FUNCTION public.is_ip_blocked(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO anon, authenticated, service_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

INSERT INTO public.license_plans (slug, name, days, price_cents, active, sort_order, description)
VALUES (
  'promo-30',
  'Promo Divulgação 30 dias',
  30,
  0,
  false,
  9999,
  'Códigos de cortesia gerados pela equipe para divulgação. Não vendáveis. A contagem inicia no momento do resgate.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  days = EXCLUDED.days,
  active = EXCLUDED.active,
  description = EXCLUDED.description,
  updated_at = now();

DO $$
DECLARE
  v_plan_id uuid;
  v_existing int;
  v_needed int;
  v_i int;
BEGIN
  SELECT id INTO v_plan_id FROM public.license_plans WHERE slug = 'promo-30';
  SELECT count(*) INTO v_existing FROM public.license_codes WHERE notes = 'promo-lancamento';
  v_needed := GREATEST(0, 20 - v_existing);
  FOR v_i IN 1..v_needed LOOP
    INSERT INTO public.license_codes (
      code, plan_id, price_cents, status, expires_at, notes
    ) VALUES (
      public.generate_license_code_string(),
      v_plan_id,
      0,
      'paid',
      now() + interval '365 days',
      'promo-lancamento'
    );
  END LOOP;
END $$;
