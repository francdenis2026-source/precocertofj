
CREATE TABLE IF NOT EXISTS public.product_comparison_cache (
  product_key text NOT NULL,
  size_value numeric,
  size_unit text NOT NULL DEFAULT 'un',
  size_key numeric GENERATED ALWAYS AS (COALESCE(size_value, -1)) STORED,
  display_name text,
  category text,
  store_count int NOT NULL DEFAULT 0,
  min_price numeric,
  avg_price numeric,
  max_price numeric,
  savings_pct numeric,
  cheapest_store text,
  cheapest_establishment_id uuid,
  image_url text,
  catalog_slug text,
  stores jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_seen_at timestamptz,
  total_scans int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_key, size_key, size_unit)
);

GRANT SELECT ON public.product_comparison_cache TO anon, authenticated;
GRANT ALL ON public.product_comparison_cache TO service_role;

ALTER TABLE public.product_comparison_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comparison cache" ON public.product_comparison_cache;
CREATE POLICY "Public read comparison cache"
  ON public.product_comparison_cache
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_pcc_category ON public.product_comparison_cache(category);
CREATE INDEX IF NOT EXISTS idx_pcc_store_count ON public.product_comparison_cache(store_count DESC);

CREATE OR REPLACE FUNCTION public.refresh_comparison_cache_key(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _key IS NULL OR length(_key) = 0 THEN RETURN; END IF;

  DELETE FROM public.product_comparison_cache WHERE product_key = _key;

  WITH base AS (
    SELECT
      s.product_name,
      s.price_captured,
      s.establishment_id,
      s.created_at,
      e.name AS store_name,
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
      AND public.normalize_product_key(s.product_name) = _key
  ),
  per_store AS (
    SELECT
      cat, size_value, size_unit,
      establishment_id, store_name,
      MIN(price_captured) AS price,
      MAX(created_at) AS last_seen,
      COUNT(*)::int AS scans_count,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS product_name
    FROM base
    GROUP BY cat, size_value, size_unit, establishment_id, store_name
  ),
  agg AS (
    SELECT
      cat, size_value, size_unit,
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
    GROUP BY cat, size_value, size_unit
  )
  INSERT INTO public.product_comparison_cache (
    product_key, size_value, size_unit, display_name, category,
    store_count, min_price, avg_price, max_price, savings_pct,
    cheapest_store, cheapest_establishment_id, image_url, catalog_slug,
    stores, last_seen_at, total_scans, updated_at
  )
  SELECT
    _key,
    a.size_value,
    a.size_unit,
    a.display_name,
    a.cat,
    a.store_count,
    a.min_price,
    a.avg_price,
    a.max_price,
    CASE WHEN a.avg_price > 0
      THEN ROUND(((a.avg_price - a.min_price) / a.avg_price * 100)::numeric, 1)
      ELSE 0 END,
    (a.stores->0->>'store_name'),
    ((a.stores->0->>'establishment_id'))::uuid,
    pc.image_url,
    pc.id::text,
    a.stores,
    a.last_seen_at,
    a.total_scans,
    now()
  FROM agg a
  LEFT JOIN LATERAL (
    SELECT id, image_url
    FROM public.product_catalog pc
    WHERE public.normalize_product_key(pc.display_name) = _key
    ORDER BY (pc.image_url IS NOT NULL) DESC, pc.created_at DESC
    LIMIT 1
  ) pc ON true;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_refresh_comparison_cache_on_scan()
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
      PERFORM public.refresh_comparison_cache_key(v_old_key);
    END IF;
    RETURN OLD;
  END IF;

  v_new_key := public.normalize_product_key(NEW.product_name);

  IF TG_OP = 'UPDATE' THEN
    v_old_key := public.normalize_product_key(OLD.product_name);
    IF v_old_key IS DISTINCT FROM v_new_key
       AND v_old_key IS NOT NULL AND length(v_old_key) > 0 THEN
      PERFORM public.refresh_comparison_cache_key(v_old_key);
    END IF;
  END IF;

  IF v_new_key IS NOT NULL AND length(v_new_key) > 0 THEN
    PERFORM public.refresh_comparison_cache_key(v_new_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_comparison_cache ON public.scans;
CREATE TRIGGER trg_refresh_comparison_cache
AFTER INSERT OR UPDATE OR DELETE ON public.scans
FOR EACH ROW
EXECUTE FUNCTION public.tg_refresh_comparison_cache_on_scan();

CREATE OR REPLACE FUNCTION public.rebuild_comparison_cache_all()
RETURNS TABLE(rebuilt int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  TRUNCATE TABLE public.product_comparison_cache;

  FOR r IN
    SELECT DISTINCT public.normalize_product_key(product_name) AS k
    FROM public.scans
    WHERE status = 'salvo'
      AND price_captured IS NOT NULL
      AND establishment_id IS NOT NULL
      AND user_id IS NULL
      AND product_name IS NOT NULL
  LOOP
    IF r.k IS NOT NULL AND length(r.k) > 0 THEN
      PERFORM public.refresh_comparison_cache_key(r.k);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_price_comparisons(p_category text DEFAULT NULL)
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
    c.display_name ASC;
$$;

-- Initial backfill
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT public.normalize_product_key(product_name) AS k
    FROM public.scans
    WHERE status = 'salvo'
      AND price_captured IS NOT NULL
      AND establishment_id IS NOT NULL
      AND user_id IS NULL
      AND product_name IS NOT NULL
  LOOP
    IF r.k IS NOT NULL AND length(r.k) > 0 THEN
      PERFORM public.refresh_comparison_cache_key(r.k);
    END IF;
  END LOOP;
END $$;
