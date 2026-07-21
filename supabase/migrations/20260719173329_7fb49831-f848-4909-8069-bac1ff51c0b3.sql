
CREATE OR REPLACE FUNCTION public.establishment_metrics()
RETURNS TABLE(
  establishment_id uuid,
  name text,
  active boolean,
  scans_total integer,
  unique_products integer,
  size_variants integer,
  cache_rows integer,
  stale boolean,
  last_scan_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH s AS (
    SELECT
      sc.establishment_id AS eid,
      COUNT(*)::int AS scans_total,
      COUNT(DISTINCT public.normalize_product_key(sc.product_name))::int AS unique_products,
      COUNT(DISTINCT (public.normalize_product_key(sc.product_name) || ':' || COALESCE(sz.size_value::text,'') || ':' || COALESCE(sz.size_unit,'')))::int AS size_variants,
      MAX(sc.created_at) AS last_scan_at,
      MAX(sc.updated_at) AS last_scan_updated
    FROM public.scans sc
    CROSS JOIN LATERAL public.extract_product_size(sc.product_name) sz
    WHERE sc.status = 'salvo' AND sc.price_captured IS NOT NULL AND sc.user_id IS NULL
      AND sc.establishment_id IS NOT NULL AND sc.product_name IS NOT NULL
    GROUP BY sc.establishment_id
  ),
  c AS (
    SELECT
      (st->>'establishment_id')::uuid AS eid,
      COUNT(*)::int AS cache_rows,
      MAX(pcc.updated_at) AS cache_updated
    FROM public.product_comparison_cache pcc
    CROSS JOIN LATERAL jsonb_array_elements(pcc.stores) AS st
    GROUP BY 1
  )
  SELECT
    e.id,
    e.name,
    e.active,
    COALESCE(s.scans_total, 0),
    COALESCE(s.unique_products, 0),
    COALESCE(s.size_variants, 0),
    COALESCE(c.cache_rows, 0),
    (COALESCE(s.last_scan_updated, s.last_scan_at) IS NOT NULL
      AND (c.cache_updated IS NULL OR c.cache_updated < COALESCE(s.last_scan_updated, s.last_scan_at))) AS stale,
    s.last_scan_at
  FROM public.establishments e
  LEFT JOIN s ON s.eid = e.id
  LEFT JOIN c ON c.eid = e.id
  ORDER BY COALESCE(s.scans_total, 0) DESC, e.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.establishment_metrics() TO authenticated;
