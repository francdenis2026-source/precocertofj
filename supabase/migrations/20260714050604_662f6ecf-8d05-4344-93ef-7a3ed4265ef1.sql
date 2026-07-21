
CREATE OR REPLACE FUNCTION public.get_price_comparisons()
RETURNS TABLE(
  product_key text,
  display_name text,
  size_value numeric,
  size_unit text,
  store_count int,
  min_price numeric,
  avg_price numeric,
  max_price numeric,
  savings_pct numeric,
  cheapest_store text,
  cheapest_establishment_id uuid,
  stores jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH base AS (
    SELECT
      s.product_name,
      s.price_captured,
      s.establishment_id,
      e.name AS store_name,
      public.normalize_product_key(s.product_name) AS pkey,
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
      pkey, size_value, size_unit,
      establishment_id, store_name,
      MIN(price_captured) AS price,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS product_name
    FROM base
    WHERE pkey <> ''
    GROUP BY pkey, size_value, size_unit, establishment_id, store_name
  ),
  agg AS (
    SELECT
      pkey, size_value, size_unit,
      COUNT(DISTINCT establishment_id)::int AS store_count,
      MIN(price) AS min_price,
      ROUND(AVG(price)::numeric, 2) AS avg_price,
      MAX(price) AS max_price,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS display_name,
      jsonb_agg(
        jsonb_build_object(
          'establishment_id', establishment_id,
          'store_name', store_name,
          'price', price,
          'product_name', product_name
        ) ORDER BY price
      ) AS stores
    FROM per_store
    GROUP BY pkey, size_value, size_unit
    HAVING COUNT(DISTINCT establishment_id) >= 2
  )
  SELECT
    pkey,
    display_name,
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
    stores
  FROM agg
  ORDER BY
    store_count DESC,
    CASE WHEN avg_price > 0 THEN (avg_price - min_price) / avg_price ELSE 0 END DESC;
$$;
