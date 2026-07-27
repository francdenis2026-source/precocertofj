-- 1) Índices compostos para casar com a ordenação da RPC
CREATE INDEX IF NOT EXISTS idx_pcc_store_count_savings
  ON public.product_comparison_cache (store_count DESC, savings_pct DESC);

CREATE INDEX IF NOT EXISTS idx_pcc_category_store_count
  ON public.product_comparison_cache (category, store_count DESC);

-- 2) Nova assinatura da RPC com paginação/limite opcional
DROP FUNCTION IF EXISTS public.get_price_comparisons(text);

CREATE OR REPLACE FUNCTION public.get_price_comparisons(
  p_category text DEFAULT NULL,
  p_limit    integer DEFAULT NULL,
  p_offset   integer DEFAULT 0
)
RETURNS TABLE(
  product_key text,
  display_name text,
  category text,
  size_value numeric,
  size_unit text,
  store_count integer,
  min_price numeric,
  avg_price numeric,
  max_price numeric,
  savings_pct numeric,
  cheapest_store text,
  cheapest_establishment_id uuid,
  image_url text,
  catalog_slug text,
  stores jsonb,
  last_seen_at timestamptz,
  total_scans integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    c.product_key,
    c.display_name,
    c.category,
    c.size_value,
    c.size_unit,
    c.store_count,
    c.min_price,
    c.avg_price,
    c.max_price,
    c.savings_pct,
    c.cheapest_store,
    c.cheapest_establishment_id,
    c.image_url,
    c.catalog_slug,
    c.stores,
    c.last_seen_at,
    c.total_scans
  FROM public.product_comparison_cache c
  WHERE p_category IS NULL OR c.category = p_category
  ORDER BY
    c.store_count DESC,
    CASE WHEN c.avg_price > 0 THEN (c.avg_price - c.min_price) / c.avg_price ELSE 0 END DESC,
    c.display_name ASC
  LIMIT CASE WHEN p_limit IS NULL OR p_limit <= 0 THEN NULL ELSE LEAST(p_limit, 5000) END
  OFFSET GREATEST(coalesce(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_price_comparisons(text, integer, integer) TO anon, authenticated, service_role;