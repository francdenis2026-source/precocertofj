DROP FUNCTION IF EXISTS public.platform_public_stats();

CREATE OR REPLACE FUNCTION public.platform_public_stats()
RETURNS TABLE (
  establishments int,
  price_drops_7d int,
  active_comparisons int,
  unique_products int,
  avg_savings numeric,
  total_savings numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.platform_public_stats() TO anon, authenticated, service_role;