
CREATE OR REPLACE FUNCTION public.get_coverage_overview()
RETURNS TABLE(establishment_id uuid, name text, produtos int, faltando int, cobertura_pct numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_total int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(DISTINCT public.normalize_product_key(product_name))::int INTO v_total
  FROM public.scans WHERE status='salvo' AND user_id IS NULL AND product_name IS NOT NULL;

  RETURN QUERY
  SELECT e.id, e.name,
    COALESCE(x.produtos, 0)::int,
    (v_total - COALESCE(x.produtos, 0))::int AS faltando,
    ROUND(100.0 * COALESCE(x.produtos, 0) / NULLIF(v_total, 0), 1) AS cobertura_pct
  FROM public.establishments e
  LEFT JOIN (
    SELECT establishment_id, COUNT(DISTINCT public.normalize_product_key(product_name))::int AS produtos
    FROM public.scans WHERE status='salvo' AND user_id IS NULL AND product_name IS NOT NULL
    GROUP BY establishment_id
  ) x ON x.establishment_id = e.id
  WHERE e.active = true
  ORDER BY produtos DESC, e.name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_missing_products_for_establishment(
  _establishment_id uuid, _search text DEFAULT NULL, _category text DEFAULT NULL, _limit int DEFAULT 500
) RETURNS TABLE(
  product_key text, display_name text, category text,
  stores_count int, min_price numeric, avg_price numeric, max_price numeric
) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN QUERY
  WITH present_at AS (
    SELECT DISTINCT public.normalize_product_key(product_name) AS k
    FROM public.scans
    WHERE establishment_id = _establishment_id AND status='salvo' AND user_id IS NULL AND product_name IS NOT NULL
  ),
  agg AS (
    SELECT
      public.normalize_product_key(s.product_name) AS k,
      (array_agg(s.product_name ORDER BY length(s.product_name)))[1] AS display_name,
      public.classify_product_category((array_agg(s.product_name ORDER BY length(s.product_name)))[1]) AS category,
      COUNT(DISTINCT s.establishment_id)::int AS stores_count,
      MIN(s.price_captured)::numeric AS min_price,
      ROUND(AVG(s.price_captured)::numeric, 2) AS avg_price,
      MAX(s.price_captured)::numeric AS max_price
    FROM public.scans s
    WHERE s.status='salvo' AND s.user_id IS NULL AND s.product_name IS NOT NULL AND s.price_captured IS NOT NULL
    GROUP BY 1
  )
  SELECT a.k, a.display_name, a.category, a.stores_count, a.min_price, a.avg_price, a.max_price
  FROM agg a
  WHERE a.k NOT IN (SELECT k FROM present_at) AND length(a.k) > 0
    AND (_search IS NULL OR _search = '' OR a.display_name ILIKE '%' || _search || '%')
    AND (_category IS NULL OR _category = '' OR a.category = _category)
  ORDER BY a.stores_count DESC, a.display_name ASC
  LIMIT GREATEST(_limit, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_present_products_for_establishment(
  _establishment_id uuid, _search text DEFAULT NULL, _category text DEFAULT NULL, _limit int DEFAULT 500
) RETURNS TABLE(
  product_key text, display_name text, category text,
  stores_count int, min_price numeric, avg_price numeric, max_price numeric,
  local_price numeric, last_seen_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN QUERY
  WITH local AS (
    SELECT
      public.normalize_product_key(product_name) AS k,
      (array_agg(product_name ORDER BY created_at DESC))[1] AS display_name,
      MIN(price_captured)::numeric AS local_price,
      MAX(created_at) AS last_seen_at
    FROM public.scans
    WHERE establishment_id = _establishment_id AND status='salvo' AND user_id IS NULL AND product_name IS NOT NULL
    GROUP BY 1
  ),
  global AS (
    SELECT
      public.normalize_product_key(product_name) AS k,
      COUNT(DISTINCT establishment_id)::int AS stores_count,
      MIN(price_captured)::numeric AS min_price,
      ROUND(AVG(price_captured)::numeric, 2) AS avg_price,
      MAX(price_captured)::numeric AS max_price
    FROM public.scans
    WHERE status='salvo' AND user_id IS NULL AND product_name IS NOT NULL AND price_captured IS NOT NULL
    GROUP BY 1
  )
  SELECT l.k, l.display_name, public.classify_product_category(l.display_name),
    COALESCE(g.stores_count, 0), g.min_price, g.avg_price, g.max_price,
    l.local_price, l.last_seen_at
  FROM local l
  LEFT JOIN global g ON g.k = l.k
  WHERE length(l.k) > 0
    AND (_search IS NULL OR _search = '' OR l.display_name ILIKE '%' || _search || '%')
    AND (_category IS NULL OR _category = '' OR public.classify_product_category(l.display_name) = _category)
  ORDER BY l.last_seen_at DESC NULLS LAST, l.display_name ASC
  LIMIT GREATEST(_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_coverage_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_missing_products_for_establishment(uuid, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_present_products_for_establishment(uuid, text, text, int) TO authenticated;
