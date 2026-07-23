CREATE OR REPLACE FUNCTION public.approve_checkout_order(_order_id uuid, _provider_ref text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, license_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.checkout_orders;
  v_plan public.license_plans;
  v_code text;
  v_license_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  -- Permite chamada por webhook (service_role, sem auth.uid) OU por admin autenticado
  IF v_caller IS NOT NULL AND NOT public.has_role(v_caller, 'admin'::app_role) THEN
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
  VALUES (v_code, v_plan.id, v_order.final_cents, 'paid', now() + interval '90 days', v_order.user_id, v_caller, _provider_ref,
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
$function$;