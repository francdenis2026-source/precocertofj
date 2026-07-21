
CREATE TABLE public.store_basket_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  establishment_name TEXT NOT NULL,
  target_total NUMERIC(12,2) NOT NULL CHECK (target_total > 0),
  basket_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_evaluated_total NUMERIC(12,2),
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_basket_alerts_user ON public.store_basket_alerts(user_id);
CREATE INDEX idx_store_basket_alerts_active ON public.store_basket_alerts(active) WHERE active = TRUE;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_basket_alerts TO authenticated;
GRANT ALL ON public.store_basket_alerts TO service_role;

ALTER TABLE public.store_basket_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own store basket alerts"
  ON public.store_basket_alerts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_store_basket_alerts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_store_basket_alerts_updated_at
  BEFORE UPDATE ON public.store_basket_alerts
  FOR EACH ROW EXECUTE FUNCTION public.touch_store_basket_alerts_updated_at();
