
-- Subscriptions (user preferences)
CREATE TABLE IF NOT EXISTS public.price_alert_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL,
  display_name TEXT,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'both' CHECK (direction IN ('drop','rise','both')),
  threshold_pct NUMERIC NOT NULL DEFAULT 5 CHECK (threshold_pct >= 0),
  target_price NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  last_price NUMERIC,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alert_subscriptions TO authenticated;
GRANT ALL ON public.price_alert_subscriptions TO service_role;

ALTER TABLE public.price_alert_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own price_alert_subscriptions"
  ON public.price_alert_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pas_user ON public.price_alert_subscriptions(user_id, active);
CREATE INDEX IF NOT EXISTS idx_pas_product_key ON public.price_alert_subscriptions(product_key) WHERE active;

CREATE TRIGGER price_alert_subscriptions_updated_at
  BEFORE UPDATE ON public.price_alert_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: on new scan, evaluate subscriptions and fire price_alerts
CREATE OR REPLACE FUNCTION public.tg_check_price_alert_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key TEXT;
  v_prev NUMERIC;
  sub RECORD;
  diff_pct NUMERIC;
  fire BOOLEAN;
BEGIN
  IF NEW.status <> 'salvo' OR NEW.price_captured IS NULL OR NEW.product_name IS NULL THEN
    RETURN NEW;
  END IF;

  v_key := public.normalize_product_key(NEW.product_name);
  IF v_key = '' THEN RETURN NEW; END IF;

  FOR sub IN
    SELECT * FROM public.price_alert_subscriptions
    WHERE active
      AND product_key = v_key
      AND (establishment_id IS NULL OR establishment_id = NEW.establishment_id)
  LOOP
    -- previous price in same scope
    SELECT price_captured INTO v_prev
    FROM public.scans
    WHERE status = 'salvo'
      AND price_captured IS NOT NULL
      AND public.normalize_product_key(product_name) = v_key
      AND id <> NEW.id
      AND (sub.establishment_id IS NULL OR establishment_id = sub.establishment_id)
    ORDER BY created_at DESC
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
      UPDATE public.price_alert_subscriptions
      SET last_price = NEW.price_captured,
          last_triggered_at = now()
      WHERE id = sub.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_check_price_alert_subs ON public.scans;
CREATE TRIGGER tg_check_price_alert_subs
  AFTER INSERT ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.tg_check_price_alert_subscriptions();
