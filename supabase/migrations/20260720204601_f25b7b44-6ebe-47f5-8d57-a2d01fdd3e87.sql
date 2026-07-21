
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  route TEXT,
  user_id UUID,
  session_id TEXT,
  is_visitor BOOLEAN NOT NULL DEFAULT true,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_events_event_route ON public.analytics_events (event_name, route);
CREATE INDEX idx_analytics_events_session ON public.analytics_events (session_id);

GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT, SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (visitor or user) can insert an event
CREATE POLICY "anyone can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "admins can read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Aggregated daily metrics view function (SECURITY DEFINER) — admin-only
CREATE OR REPLACE FUNCTION public.get_visitor_daily_metrics(days INT DEFAULT 14)
RETURNS TABLE (
  day DATE,
  visitors BIGINT,
  users BIGINT,
  total_events BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(DISTINCT session_id) FILTER (WHERE is_visitor) AS visitors,
    COUNT(DISTINCT user_id) FILTER (WHERE NOT is_visitor AND user_id IS NOT NULL) AS users,
    COUNT(*) AS total_events
  FROM public.analytics_events
  WHERE created_at >= now() - (days || ' days')::interval
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_unlock_rate_by_route(days INT DEFAULT 14)
RETURNS TABLE (
  route TEXT,
  views BIGINT,
  unlock_clicks BIGINT,
  conversions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(route, '(unknown)') AS route,
    COUNT(*) FILTER (WHERE event_name LIKE 'visitor_view_%') AS views,
    COUNT(*) FILTER (WHERE event_name LIKE 'visitor_click_unlock%') AS unlock_clicks,
    COUNT(*) FILTER (WHERE event_name = 'unlock_conversion') AS conversions
  FROM public.analytics_events
  WHERE created_at >= now() - (days || ' days')::interval
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY 1
  ORDER BY unlock_clicks DESC NULLS LAST, views DESC NULLS LAST;
$$;
