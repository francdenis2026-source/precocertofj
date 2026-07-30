CREATE OR REPLACE FUNCTION public.tg_check_price_alert_subscriptions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key TEXT;
  v_prev NUMERIC;
  v_neigh TEXT;
  v_city TEXT;
  sub RECORD;
  diff_pct NUMERIC;
  fire BOOLEAN;
  is_drop BOOLEAN;
  v_name TEXT;
  v_where TEXT;
  v_in_app BOOLEAN;
BEGIN
  IF NEW.status <> 'salvo' OR NEW.price_captured IS NULL OR NEW.product_name IS NULL THEN
    RETURN NEW;
  END IF;

  v_key := public.normalize_product_key(NEW.product_name);
  IF v_key = '' THEN RETURN NEW; END IF;

  IF NEW.establishment_id IS NOT NULL THEN
    SELECT neighborhood, city INTO v_neigh, v_city
    FROM public.establishments
    WHERE id = NEW.establishment_id;
  END IF;

  FOR sub IN
    SELECT * FROM public.price_alert_subscriptions
    WHERE active
      AND product_key = v_key
      AND (establishment_id IS NULL OR establishment_id = NEW.establishment_id)
      AND (scope_city IS NULL OR lower(scope_city) = lower(coalesce(v_city, '')))
      AND (scope_neighborhood IS NULL OR lower(scope_neighborhood) = lower(coalesce(v_neigh, '')))
  LOOP
    SELECT s.price_captured INTO v_prev
    FROM public.scans s
    LEFT JOIN public.establishments e ON e.id = s.establishment_id
    WHERE s.status = 'salvo'
      AND s.price_captured IS NOT NULL
      AND public.normalize_product_key(s.product_name) = v_key
      AND s.id <> NEW.id
      AND (sub.establishment_id IS NULL OR s.establishment_id = sub.establishment_id)
      AND (sub.scope_city IS NULL OR lower(coalesce(e.city, '')) = lower(sub.scope_city))
      AND (sub.scope_neighborhood IS NULL OR lower(coalesce(e.neighborhood, '')) = lower(sub.scope_neighborhood))
    ORDER BY s.price_captured ASC
    LIMIT 1;

    fire := false;
    diff_pct := NULL;

    IF sub.target_price IS NOT NULL AND NEW.price_captured <= sub.target_price THEN
      fire := true;
      diff_pct := CASE WHEN v_prev IS NOT NULL AND v_prev > 0
                       THEN ROUND(((NEW.price_captured - v_prev) / v_prev * 100)::numeric, 2)
                       ELSE NULL END;
    ELSIF v_prev IS NOT NULL AND v_prev > 0 THEN
      diff_pct := ROUND(((NEW.price_captured - v_prev) / v_prev * 100)::numeric, 2);
      IF sub.direction = 'drop' AND diff_pct <= -sub.threshold_pct THEN fire := true;
      ELSIF sub.direction = 'rise' AND diff_pct >= sub.threshold_pct THEN fire := true;
      ELSIF sub.direction = 'both' AND abs(diff_pct) >= sub.threshold_pct THEN fire := true;
      END IF;
    END IF;

    IF fire THEN
      is_drop := (sub.target_price IS NOT NULL AND NEW.price_captured <= sub.target_price)
                 OR (diff_pct IS NOT NULL AND diff_pct < 0);

      INSERT INTO public.price_alerts (user_id, kind, market_name, display_name, prev_price, new_price, diff_pct)
      VALUES (
        sub.user_id,
        CASE WHEN sub.target_price IS NOT NULL AND NEW.price_captured <= sub.target_price THEN 'item_target_hit'
             WHEN diff_pct IS NOT NULL AND diff_pct < 0 THEN 'item_price_drop'
             ELSE 'market_price_drop' END,
        NEW.market_name,
        COALESCE(sub.display_name, NEW.product_name),
        v_prev,
        NEW.price_captured,
        diff_pct
      );

      IF is_drop THEN
        SELECT COALESCE(np.in_app, true) INTO v_in_app
        FROM public.notification_prefs np
        WHERE np.user_id = sub.user_id;
        IF v_in_app IS NULL THEN v_in_app := true; END IF;

        IF v_in_app THEN
          v_name := COALESCE(sub.display_name, NEW.product_name);
          v_where := COALESCE(NEW.market_name, 'um estabelecimento');
          IF v_neigh IS NOT NULL AND v_neigh <> '' THEN
            v_where := v_where || ' (' || v_neigh || COALESCE(' - ' || v_city, '') || ')';
          ELSIF v_city IS NOT NULL AND v_city <> '' THEN
            v_where := v_where || ' (' || v_city || ')';
          END IF;

          INSERT INTO public.user_notifications (user_id, kind, title, body, link, metadata)
          VALUES (
            sub.user_id,
            'price_drop',
            v_name || ' está mais barato',
            'Agora R$ ' || to_char(NEW.price_captured, 'FM999999990.00') ||
              ' em ' || v_where ||
              CASE WHEN diff_pct IS NOT NULL THEN ' (' || to_char(diff_pct, 'FM999990.0') || '%)' ELSE '' END,
            '/alertas',
            jsonb_build_object(
              'product_key', v_key,
              'subscription_id', sub.id,
              'establishment_id', NEW.establishment_id,
              'market_name', NEW.market_name,
              'neighborhood', v_neigh,
              'city', v_city,
              'prev_price', v_prev,
              'new_price', NEW.price_captured,
              'diff_pct', diff_pct
            )
          );
        END IF;
      END IF;

      UPDATE public.price_alert_subscriptions
      SET last_price = NEW.price_captured,
          last_triggered_at = now()
      WHERE id = sub.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;