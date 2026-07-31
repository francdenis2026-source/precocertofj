-- 1) Server-only functions: revoke from anon + authenticated
REVOKE ALL ON FUNCTION public.redeem_license_code(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reactivate_checkout_order(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_collab_submissions_to_user(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_or_create_ai_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_ai_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_effective_quota(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.platform_public_stats_compute() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_platform_stats_cache() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_product_price_stats_key(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.redeem_license_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_checkout_order(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_collab_submissions_to_user(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_ai_quota(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_access(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_effective_quota(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_public_stats_compute() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_platform_stats_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_product_price_stats_key(text) TO service_role;

-- 2) Defense in depth inside the two highest-impact functions
CREATE OR REPLACE FUNCTION public.redeem_license_code(_user_id uuid, _code text)
 RETURNS TABLE(success boolean, message text, added_days integer, new_paid_until timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_lc public.license_codes; v_plan public.license_plans;
  v_current TIMESTAMPTZ; v_new TIMESTAMPTZ; v_add_minutes INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
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
END; $function$;
REVOKE ALL ON FUNCTION public.redeem_license_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_license_code(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.reactivate_checkout_order(_order_id uuid, _provider_ref text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, license_code_id uuid, reactivated boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_lic RECORD;
  v_reactivated boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_order FROM public.checkout_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;

  UPDATE public.checkout_orders
     SET status = 'approved',
         provider_ref = COALESCE(_provider_ref, provider_ref),
         approved_at = COALESCE(approved_at, now()),
         updated_at = now()
   WHERE id = _order_id;

  IF v_order.license_code_id IS NOT NULL THEN
    SELECT * INTO v_lic FROM public.license_codes WHERE id = v_order.license_code_id FOR UPDATE;
    IF FOUND AND v_lic.redeemed_at IS NULL AND v_lic.status = 'revoked' THEN
      UPDATE public.license_codes SET status = 'active', updated_at = now()
       WHERE id = v_order.license_code_id;
      v_reactivated := true;
    END IF;
  END IF;

  RETURN QUERY SELECT _order_id, v_order.license_code_id, v_reactivated;
END; $function$;
REVOKE ALL ON FUNCTION public.reactivate_checkout_order(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_checkout_order(uuid, text) TO service_role;

-- 3) Admin/report functions: keep for logged-in users (they check admin role), drop anon
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (p.proname LIKE 'admin\_%' OR p.proname LIKE 'list\_%'
           OR p.proname LIKE 'enqueue\_%' OR p.proname LIKE 'refresh\_%'
           OR p.proname LIKE 'rebuild\_%' OR p.proname LIKE 'catalog\_image\_job%'
           OR p.proname IN ('establishment_metrics','get_coverage_overview',
             'get_missing_products_for_establishment','get_present_products_for_establishment',
             'get_unlock_rate_by_route','get_visitor_daily_metrics','plan_conversion_metrics',
             'my_ai_usage_summary','get_my_collab_month_progress','get_or_create_collab_token',
             'ensure_finance_food_categories'))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;