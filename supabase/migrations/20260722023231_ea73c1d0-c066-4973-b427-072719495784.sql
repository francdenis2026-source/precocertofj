
CREATE TABLE public.promo_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  percent_off int NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true,
  description text,
  redemptions int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_coupons TO authenticated;
GRANT ALL ON public.promo_coupons TO service_role;
ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam promo_coupons" ON public.promo_coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_promo_coupons_touch BEFORE UPDATE ON public.promo_coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_promo_coupon(_code text)
RETURNS TABLE(id uuid, code text, percent_off int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, code, percent_off FROM public.promo_coupons
  WHERE upper(code) = upper(_code) AND active = true LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.validate_promo_coupon(text) TO anon, authenticated;

CREATE TABLE public.checkout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.license_plans(id) ON DELETE RESTRICT,
  coupon_id uuid REFERENCES public.promo_coupons(id) ON DELETE SET NULL,
  coupon_code text,
  original_cents int NOT NULL,
  discount_cents int NOT NULL DEFAULT 0,
  final_cents int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','failed','cancelled')),
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_ref text,
  license_code_id uuid REFERENCES public.license_codes(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.checkout_orders TO authenticated;
GRANT ALL ON public.checkout_orders TO service_role;
ALTER TABLE public.checkout_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve proprios pedidos" ON public.checkout_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Usuario cria proprio pedido" ON public.checkout_orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin atualiza pedidos" ON public.checkout_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_checkout_orders_user ON public.checkout_orders(user_id, created_at DESC);
CREATE INDEX idx_checkout_orders_plan ON public.checkout_orders(plan_id, status);
CREATE TRIGGER trg_checkout_orders_touch BEFORE UPDATE ON public.checkout_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.generate_license_code_string()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
  v_attempt int := 0;
BEGIN
  LOOP
    v_code := 'PCFJ';
    FOR v_i IN 1..12 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
      IF v_i % 4 = 0 AND v_i < 12 THEN v_code := v_code || '-'; END IF;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.license_codes WHERE code = v_code) THEN RETURN v_code; END IF;
    v_attempt := v_attempt + 1;
    IF v_attempt > 10 THEN RAISE EXCEPTION 'could not generate unique code'; END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_checkout_order(_order_id uuid, _provider_ref text DEFAULT NULL)
RETURNS TABLE(order_id uuid, license_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.checkout_orders;
  v_plan public.license_plans;
  v_code text;
  v_license_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_order FROM public.checkout_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_order.status = 'approved' THEN
    SELECT lc.code INTO v_code FROM public.license_codes lc WHERE lc.id = v_order.license_code_id;
    RETURN QUERY SELECT v_order.id, v_code; RETURN;
  END IF;

  SELECT * INTO v_plan FROM public.license_plans WHERE id = v_order.plan_id;
  v_code := public.generate_license_code_string();

  INSERT INTO public.license_codes (code, plan_id, price_cents, status, expires_at, buyer_user_id, created_by, mp_payment_id, notes)
  VALUES (v_code, v_plan.id, v_order.final_cents, 'paid', now() + interval '90 days', v_order.user_id, auth.uid(), _provider_ref,
    'Pedido ' || _order_id::text || CASE WHEN v_order.coupon_code IS NOT NULL THEN ' (cupom ' || v_order.coupon_code || ')' ELSE '' END)
  RETURNING id INTO v_license_id;

  UPDATE public.checkout_orders SET status = 'approved', approved_at = now(),
    provider_ref = COALESCE(_provider_ref, provider_ref), license_code_id = v_license_id, updated_at = now()
  WHERE id = _order_id;

  IF v_order.coupon_id IS NOT NULL THEN
    UPDATE public.promo_coupons SET redemptions = redemptions + 1, updated_at = now()
    WHERE id = v_order.coupon_id;
  END IF;

  RETURN QUERY SELECT _order_id, v_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_checkout_order(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.plan_conversion_metrics()
RETURNS TABLE(plan_id uuid, plan_name text, plan_slug text, price_cents int,
  orders_total bigint, orders_approved bigint, orders_pending bigint,
  gross_cents bigint, discount_cents bigint, net_cents bigint,
  conversion_pct numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, p.slug, p.price_cents,
    COUNT(o.id) AS orders_total,
    COUNT(o.id) FILTER (WHERE o.status = 'approved') AS orders_approved,
    COUNT(o.id) FILTER (WHERE o.status = 'pending') AS orders_pending,
    COALESCE(SUM(o.original_cents) FILTER (WHERE o.status = 'approved'), 0) AS gross_cents,
    COALESCE(SUM(o.discount_cents) FILTER (WHERE o.status = 'approved'), 0) AS discount_cents,
    COALESCE(SUM(o.final_cents) FILTER (WHERE o.status = 'approved'), 0) AS net_cents,
    CASE WHEN COUNT(o.id) > 0
      THEN ROUND(100.0 * COUNT(o.id) FILTER (WHERE o.status='approved') / COUNT(o.id), 1)
      ELSE 0 END AS conversion_pct
  FROM public.license_plans p
  LEFT JOIN public.checkout_orders o ON o.plan_id = p.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY p.id, p.name, p.slug, p.price_cents, p.sort_order
  ORDER BY p.sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.plan_conversion_metrics() TO authenticated;
