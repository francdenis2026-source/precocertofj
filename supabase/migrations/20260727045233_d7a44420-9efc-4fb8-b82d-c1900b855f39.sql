CREATE TABLE IF NOT EXISTS public.platform_stats_cache (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  establishments integer NOT NULL DEFAULT 0,
  price_drops_7d integer NOT NULL DEFAULT 0,
  active_comparisons integer NOT NULL DEFAULT 0,
  unique_products integer NOT NULL DEFAULT 0,
  avg_savings numeric NOT NULL DEFAULT 0,
  total_savings numeric NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.platform_stats_cache TO service_role;
ALTER TABLE public.platform_stats_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.platform_public_stats_compute()
RETURNS TABLE(establishments integer, price_drops_7d integer, active_comparisons integer, unique_products integer, avg_savings numeric, total_savings numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      public.normalize_product_key(product_name) AS pk,
      establishment_id,
      price_captured,
      created_at,
      id
    FROM public.scans
    WHERE status = 'salvo'
      AND price_captured IS NOT NULL
      AND user_id IS NULL
      AND product_name IS NOT NULL
      AND public.normalize_product_key(product_name) <> ''
  ),
  est AS (
    SELECT COUNT(*)::int AS c FROM public.establishments WHERE active = true
  ),
  comps AS (
    SELECT COUNT(*)::int AS c FROM (
      SELECT pk FROM base
      WHERE establishment_id IS NOT NULL
      GROUP BY pk
      HAVING COUNT(DISTINCT establishment_id) >= 2
    ) t
  ),
  uniq AS (
    SELECT COUNT(DISTINCT pk)::int AS c FROM base
  ),
  ranked AS (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY pk, establishment_id ORDER BY created_at DESC, id DESC
    ) AS rn
    FROM base
    WHERE establishment_id IS NOT NULL
  ),
  drops AS (
    SELECT COUNT(DISTINCT cur.pk)::int AS c
    FROM (SELECT * FROM ranked WHERE rn = 1) cur
    JOIN (SELECT * FROM ranked WHERE rn = 2) prev
      ON prev.pk = cur.pk AND prev.establishment_id = cur.establishment_id
    WHERE cur.price_captured < prev.price_captured
      AND cur.created_at >= now() - interval '30 days'
  ),
  latest AS (
    SELECT pk, establishment_id, price_captured
    FROM ranked
    WHERE rn = 1
  ),
  spread AS (
    SELECT pk,
           AVG(price_captured) AS avg_p,
           MIN(price_captured) AS min_p,
           COUNT(DISTINCT establishment_id) AS sc
    FROM latest
    GROUP BY pk
  ),
  sav AS (
    SELECT
      COALESCE(ROUND(AVG(avg_p - min_p)::numeric, 2), 0) AS avg_s,
      COALESCE(ROUND(SUM(avg_p - min_p)::numeric, 2), 0) AS total_s
    FROM spread
    WHERE sc >= 2 AND avg_p > min_p
  )
  SELECT est.c, drops.c, comps.c, uniq.c, sav.avg_s, sav.total_s
  FROM est, drops, comps, uniq, sav;
$function$;

CREATE OR REPLACE FUNCTION public.platform_public_stats()
RETURNS TABLE(establishments integer, price_drops_7d integer, active_comparisons integer, unique_products integer, avg_savings numeric, total_savings numeric)
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cached public.platform_stats_cache%ROWTYPE;
  fresh RECORD;
BEGIN
  SELECT * INTO cached FROM public.platform_stats_cache WHERE id LIMIT 1;

  IF cached.id IS NOT NULL AND cached.computed_at > now() - interval '5 minutes' THEN
    RETURN QUERY SELECT cached.establishments, cached.price_drops_7d, cached.active_comparisons,
                        cached.unique_products, cached.avg_savings, cached.total_savings;
    RETURN;
  END IF;

  SELECT * INTO fresh FROM public.platform_public_stats_compute();

  INSERT INTO public.platform_stats_cache AS c
    (id, establishments, price_drops_7d, active_comparisons, unique_products, avg_savings, total_savings, computed_at)
  VALUES (true, fresh.establishments, fresh.price_drops_7d, fresh.active_comparisons,
          fresh.unique_products, fresh.avg_savings, fresh.total_savings, now())
  ON CONFLICT (id) DO UPDATE SET
    establishments = EXCLUDED.establishments,
    price_drops_7d = EXCLUDED.price_drops_7d,
    active_comparisons = EXCLUDED.active_comparisons,
    unique_products = EXCLUDED.unique_products,
    avg_savings = EXCLUDED.avg_savings,
    total_savings = EXCLUDED.total_savings,
    computed_at = now();

  RETURN QUERY SELECT fresh.establishments, fresh.price_drops_7d, fresh.active_comparisons,
                      fresh.unique_products, fresh.avg_savings, fresh.total_savings;
END;
$function$;