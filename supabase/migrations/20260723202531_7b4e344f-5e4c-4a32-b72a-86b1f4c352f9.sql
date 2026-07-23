
CREATE OR REPLACE FUNCTION public.cancel_checkout_order(
  _order_id uuid,
  _new_status text,
  _provider_ref text DEFAULT NULL
) RETURNS TABLE(order_id uuid, license_code_id uuid, revoked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_lic RECORD;
  v_revoked boolean := false;
BEGIN
  IF _new_status NOT IN ('cancelled','refunded','charged_back','rejected','failed') THEN
    RAISE EXCEPTION 'invalid status: %', _new_status;
  END IF;

  SELECT * INTO v_order FROM public.checkout_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  UPDATE public.checkout_orders
     SET status = _new_status,
         provider_ref = COALESCE(_provider_ref, provider_ref),
         updated_at = now()
   WHERE id = _order_id;

  -- Revoke license only if not yet redeemed
  IF v_order.license_code_id IS NOT NULL THEN
    SELECT * INTO v_lic FROM public.license_codes WHERE id = v_order.license_code_id FOR UPDATE;
    IF FOUND AND v_lic.redeemed_at IS NULL THEN
      UPDATE public.license_codes
         SET status = 'revoked',
             updated_at = now()
       WHERE id = v_order.license_code_id;
      v_revoked := true;
    END IF;
  END IF;

  RETURN QUERY SELECT _order_id, v_order.license_code_id, v_revoked;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_checkout_order(
  _order_id uuid,
  _provider_ref text DEFAULT NULL
) RETURNS TABLE(order_id uuid, license_code_id uuid, reactivated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_lic RECORD;
  v_reactivated boolean := false;
BEGIN
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
      UPDATE public.license_codes
         SET status = 'active',
             updated_at = now()
       WHERE id = v_order.license_code_id;
      v_reactivated := true;
    END IF;
  END IF;

  RETURN QUERY SELECT _order_id, v_order.license_code_id, v_reactivated;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_checkout_order(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.reactivate_checkout_order(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_checkout_order(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_checkout_order(uuid, text) TO service_role;
