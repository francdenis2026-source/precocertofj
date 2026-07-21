
CREATE OR REPLACE FUNCTION public.get_price_comparisons(p_category text DEFAULT NULL::text)
 RETURNS TABLE(product_key text, display_name text, category text, size_value numeric, size_unit text, store_count integer, min_price numeric, avg_price numeric, max_price numeric, savings_pct numeric, cheapest_store text, cheapest_establishment_id uuid, image_url text, catalog_slug text, stores jsonb, last_seen_at timestamp with time zone, total_scans integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
 SET statement_timeout TO '30s'
AS $function$
  WITH base AS (
    SELECT
      s.product_name,
      s.price_captured,
      s.establishment_id,
      s.created_at,
      e.name AS store_name,
      public.normalize_product_key(s.product_name) AS pkey,
      public.classify_product_category(s.product_name) AS cat,
      sz.size_value,
      sz.size_unit
    FROM public.scans s
    JOIN public.establishments e ON e.id = s.establishment_id
    CROSS JOIN LATERAL public.extract_product_size(s.product_name) sz
    WHERE s.establishment_id IS NOT NULL
      AND s.price_captured IS NOT NULL
      AND s.status = 'salvo'
      AND s.user_id IS NULL
  ),
  per_store AS (
    SELECT
      pkey, cat, size_value, size_unit,
      establishment_id, store_name,
      MIN(price_captured) AS price,
      MAX(created_at) AS last_seen,
      COUNT(*)::int AS scans_count,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS product_name
    FROM base
    WHERE pkey <> ''
    GROUP BY pkey, cat, size_value, size_unit, establishment_id, store_name
  ),
  agg AS (
    SELECT
      pkey, cat, size_value, size_unit,
      COUNT(DISTINCT establishment_id)::int AS store_count,
      MIN(price) AS min_price,
      ROUND(AVG(price)::numeric, 2) AS avg_price,
      MAX(price) AS max_price,
      MAX(last_seen) AS last_seen_at,
      SUM(scans_count)::int AS total_scans,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS display_name,
      jsonb_agg(
        jsonb_build_object(
          'establishment_id', establishment_id,
          'store_name', store_name,
          'price', price,
          'product_name', product_name,
          'last_seen_at', last_seen,
          'scans_count', scans_count
        ) ORDER BY price
      ) AS stores
    FROM per_store
    GROUP BY pkey, cat, size_value, size_unit
  ),
  joined AS (
    SELECT a.*,
      pc.image_url,
      pc.id::text AS catalog_slug
    FROM agg a
    LEFT JOIN LATERAL (
      SELECT id, image_url
      FROM public.product_catalog pc
      WHERE public.normalize_product_key(pc.display_name) = a.pkey
      ORDER BY (pc.image_url IS NOT NULL) DESC, pc.created_at DESC
      LIMIT 1
    ) pc ON true
  )
  SELECT
    pkey AS product_key,
    display_name,
    cat AS category,
    size_value,
    size_unit,
    store_count,
    min_price,
    avg_price,
    max_price,
    CASE WHEN avg_price > 0
      THEN ROUND(((avg_price - min_price) / avg_price * 100)::numeric, 1)
      ELSE 0
    END AS savings_pct,
    (stores->0->>'store_name') AS cheapest_store,
    ((stores->0->>'establishment_id'))::uuid AS cheapest_establishment_id,
    image_url,
    catalog_slug,
    stores,
    last_seen_at,
    total_scans
  FROM joined
  WHERE p_category IS NULL OR cat = p_category
  ORDER BY
    store_count DESC,
    CASE WHEN avg_price > 0 THEN (avg_price - min_price) / avg_price ELSE 0 END DESC,
    display_name ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_price_comparisons(text) TO anon, authenticated;
