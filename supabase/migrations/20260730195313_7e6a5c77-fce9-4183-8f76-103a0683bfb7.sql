
CREATE TABLE IF NOT EXISTS public.search_trends (
  query text PRIMARY KEY,
  total_count integer NOT NULL DEFAULT 0,
  day_count integer NOT NULL DEFAULT 0,
  day_bucket date NOT NULL DEFAULT current_date,
  last_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_trends TO anon, authenticated;
GRANT ALL ON public.search_trends TO service_role;

ALTER TABLE public.search_trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read search trends" ON public.search_trends;
CREATE POLICY "anyone can read search trends"
  ON public.search_trends FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS search_trends_last_at_idx ON public.search_trends (last_at DESC);

CREATE OR REPLACE FUNCTION public.tg_search_trends_from_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  IF NEW.event_name <> 'search_query' THEN
    RETURN NEW;
  END IF;

  q := lower(btrim(coalesce(NEW.meta->>'q', '')));
  q := regexp_replace(q, '\s+', ' ', 'g');
  IF q = '' OR char_length(q) < 2 OR char_length(q) > 60 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.search_trends AS t (query, total_count, day_count, day_bucket, last_at)
  VALUES (q, 1, 1, current_date, now())
  ON CONFLICT (query) DO UPDATE
    SET total_count = t.total_count + 1,
        day_count = CASE WHEN t.day_bucket = current_date THEN t.day_count + 1 ELSE 1 END,
        day_bucket = current_date,
        last_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_search_trends_from_analytics ON public.analytics_events;
CREATE TRIGGER trg_search_trends_from_analytics
AFTER INSERT ON public.analytics_events
FOR EACH ROW EXECUTE FUNCTION public.tg_search_trends_from_analytics();

-- Backfill a partir do histórico existente (últimos 30 dias)
INSERT INTO public.search_trends (query, total_count, day_count, day_bucket, last_at)
SELECT q,
       count(*)::int,
       count(*) FILTER (WHERE created_at::date = current_date)::int,
       current_date,
       max(created_at)
FROM (
  SELECT regexp_replace(lower(btrim(meta->>'q')), '\s+', ' ', 'g') AS q, created_at
  FROM public.analytics_events
  WHERE event_name = 'search_query'
    AND created_at > now() - interval '30 days'
) s
WHERE q IS NOT NULL AND char_length(q) BETWEEN 2 AND 60
GROUP BY q
ON CONFLICT (query) DO NOTHING;

ALTER TABLE public.search_trends REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.search_trends;
