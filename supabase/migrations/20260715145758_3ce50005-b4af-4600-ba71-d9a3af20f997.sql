
CREATE OR REPLACE FUNCTION public.platform_public_stats()
RETURNS TABLE(establishments int, price_drops_7d int, active_comparisons int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH est AS (
    SELECT COUNT(*)::int AS c FROM public.establishments WHERE active = true
  ),
  comps AS (
    SELECT COUNT(*)::int AS c FROM (
      SELECT public.normalize_product_key(product_name) AS pk
      FROM public.scans
      WHERE status = 'salvo' AND price_captured IS NOT NULL
        AND establishment_id IS NOT NULL AND user_id IS NULL
        AND product_name IS NOT NULL
      GROUP BY 1
      HAVING COUNT(DISTINCT establishment_id) >= 2
         AND public.normalize_product_key(product_name) <> ''
    ) t
  ),
  recent AS (
    SELECT DISTINCT ON (public.normalize_product_key(product_name), establishment_id)
      public.normalize_product_key(product_name) AS pk,
      establishment_id,
      price_captured,
      created_at
    FROM public.scans
    WHERE status = 'salvo' AND price_captured IS NOT NULL AND user_id IS NULL
      AND created_at >= now() - interval '7 days'
      AND product_name IS NOT NULL
    ORDER BY public.normalize_product_key(product_name), establishment_id, created_at DESC
  ),
  prior AS (
    SELECT public.normalize_product_key(product_name) AS pk,
           establishment_id,
           MIN(price_captured) AS prev_min
    FROM public.scans
    WHERE status = 'salvo' AND price_captured IS NOT NULL AND user_id IS NULL
      AND created_at < now() - interval '7 days'
      AND product_name IS NOT NULL
    GROUP BY 1, 2
  ),
  drops AS (
    SELECT COUNT(DISTINCT r.pk)::int AS c
    FROM recent r
    JOIN prior p ON p.pk = r.pk AND p.establishment_id = r.establishment_id
    WHERE r.price_captured < p.prev_min
      AND r.pk <> ''
  )
  SELECT est.c, drops.c, comps.c FROM est, drops, comps;
$$;

GRANT EXECUTE ON FUNCTION public.platform_public_stats() TO anon, authenticated, service_role;
