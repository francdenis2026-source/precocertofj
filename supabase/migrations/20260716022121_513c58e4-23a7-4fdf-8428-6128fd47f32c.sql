
CREATE TABLE IF NOT EXISTS public.product_price_stats (
  product_key text PRIMARY KEY,
  display_name text,
  min_price numeric(12,2) NOT NULL,
  avg_price numeric(12,2) NOT NULL,
  max_price numeric(12,2) NOT NULL,
  p25_price numeric(12,2),
  p75_price numeric(12,2),
  samples integer NOT NULL DEFAULT 0,
  stores_count integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_price_stats TO anon, authenticated;
GRANT ALL ON public.product_price_stats TO service_role;

ALTER TABLE public.product_price_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price stats readable by everyone" ON public.product_price_stats;
CREATE POLICY "price stats readable by everyone"
  ON public.product_price_stats FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.refresh_product_price_stats_key(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _key IS NULL OR length(_key) = 0 THEN RETURN; END IF;

  WITH src AS (
    SELECT
      s.price_captured::numeric AS price,
      s.establishment_id,
      s.created_at,
      s.product_name
    FROM public.scans s
    WHERE s.status = 'salvo'
      AND s.price_captured IS NOT NULL
      AND s.price_captured > 0
      AND s.product_name IS NOT NULL
      AND public.normalize_product_key(s.product_name) = _key
  ),
  agg AS (
    SELECT
      MIN(price)::numeric AS min_price,
      AVG(price)::numeric AS avg_price,
      MAX(price)::numeric AS max_price,
      (percentile_cont(0.25) WITHIN GROUP (ORDER BY price))::numeric AS p25_price,
      (percentile_cont(0.75) WITHIN GROUP (ORDER BY price))::numeric AS p75_price,
      COUNT(*)::int AS samples,
      COUNT(DISTINCT establishment_id)::int AS stores_count,
      MAX(created_at) AS last_seen_at,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS display_name
    FROM src
  )
  INSERT INTO public.product_price_stats AS pps (
    product_key, display_name, min_price, avg_price, max_price,
    p25_price, p75_price, samples, stores_count, last_seen_at, updated_at
  )
  SELECT
    _key,
    a.display_name,
    ROUND(a.min_price, 2),
    ROUND(a.avg_price, 2),
    ROUND(a.max_price, 2),
    ROUND(a.p25_price, 2),
    ROUND(a.p75_price, 2),
    a.samples,
    a.stores_count,
    a.last_seen_at,
    now()
  FROM agg a
  WHERE a.samples > 0
  ON CONFLICT (product_key) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        min_price = EXCLUDED.min_price,
        avg_price = EXCLUDED.avg_price,
        max_price = EXCLUDED.max_price,
        p25_price = EXCLUDED.p25_price,
        p75_price = EXCLUDED.p75_price,
        samples = EXCLUDED.samples,
        stores_count = EXCLUDED.stores_count,
        last_seen_at = EXCLUDED.last_seen_at,
        updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.scans s
    WHERE s.status = 'salvo' AND s.price_captured IS NOT NULL
      AND s.product_name IS NOT NULL
      AND public.normalize_product_key(s.product_name) = _key)
  THEN
    DELETE FROM public.product_price_stats WHERE product_key = _key;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_product_price_stats_all()
RETURNS TABLE(refreshed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH src AS (
    SELECT
      public.normalize_product_key(s.product_name) AS product_key,
      s.price_captured::numeric AS price,
      s.establishment_id,
      s.created_at,
      s.product_name
    FROM public.scans s
    WHERE s.status = 'salvo'
      AND s.price_captured IS NOT NULL
      AND s.price_captured > 0
      AND s.product_name IS NOT NULL
  ),
  agg AS (
    SELECT
      product_key,
      MIN(price)::numeric AS min_price,
      AVG(price)::numeric AS avg_price,
      MAX(price)::numeric AS max_price,
      (percentile_cont(0.25) WITHIN GROUP (ORDER BY price))::numeric AS p25_price,
      (percentile_cont(0.75) WITHIN GROUP (ORDER BY price))::numeric AS p75_price,
      COUNT(*)::int AS samples,
      COUNT(DISTINCT establishment_id)::int AS stores_count,
      MAX(created_at) AS last_seen_at,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS display_name
    FROM src
    WHERE product_key IS NOT NULL AND length(product_key) > 0
    GROUP BY product_key
  ),
  up AS (
    INSERT INTO public.product_price_stats AS pps (
      product_key, display_name, min_price, avg_price, max_price,
      p25_price, p75_price, samples, stores_count, last_seen_at, updated_at
    )
    SELECT
      product_key,
      display_name,
      ROUND(min_price, 2),
      ROUND(avg_price, 2),
      ROUND(max_price, 2),
      ROUND(p25_price, 2),
      ROUND(p75_price, 2),
      samples,
      stores_count,
      last_seen_at,
      now()
    FROM agg
    ON CONFLICT (product_key) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          min_price = EXCLUDED.min_price,
          avg_price = EXCLUDED.avg_price,
          max_price = EXCLUDED.max_price,
          p25_price = EXCLUDED.p25_price,
          p75_price = EXCLUDED.p75_price,
          samples = EXCLUDED.samples,
          stores_count = EXCLUDED.stores_count,
          last_seen_at = EXCLUDED.last_seen_at,
          updated_at = now()
    RETURNING 1
  ),
  del AS (
    DELETE FROM public.product_price_stats
    WHERE product_key NOT IN (SELECT product_key FROM agg)
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM up)::int INTO v_count;

  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_product_price_stats_key(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_product_price_stats_all() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tg_refresh_price_stats_on_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_old_key text;
  v_new_key text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_key := public.normalize_product_key(OLD.product_name);
    IF v_old_key IS NOT NULL AND length(v_old_key) > 0 THEN
      PERFORM public.refresh_product_price_stats_key(v_old_key);
    END IF;
    RETURN OLD;
  END IF;

  v_new_key := public.normalize_product_key(NEW.product_name);
  IF TG_OP = 'UPDATE' THEN
    v_old_key := public.normalize_product_key(OLD.product_name);
    IF v_old_key IS DISTINCT FROM v_new_key
       AND v_old_key IS NOT NULL AND length(v_old_key) > 0 THEN
      PERFORM public.refresh_product_price_stats_key(v_old_key);
    END IF;
  END IF;

  IF v_new_key IS NOT NULL AND length(v_new_key) > 0 AND NEW.status = 'salvo' THEN
    PERFORM public.refresh_product_price_stats_key(v_new_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_price_stats ON public.scans;
CREATE TRIGGER trg_refresh_price_stats
AFTER INSERT OR UPDATE OF product_name, price_captured, status OR DELETE
ON public.scans
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_price_stats_on_scan();

SELECT public.refresh_product_price_stats_all();

CREATE INDEX IF NOT EXISTS idx_product_price_stats_updated_at
  ON public.product_price_stats (updated_at DESC);
