-- Gatilho duplicado (substituído por trg_scans_sync_market_name)
DROP TRIGGER IF EXISTS trg_fill_scan_market_name ON public.scans;

-- Recalcular cache de comparação só quando algo relevante muda
DROP TRIGGER IF EXISTS trg_refresh_comparison_cache ON public.scans;
CREATE TRIGGER trg_refresh_comparison_cache
  AFTER INSERT OR DELETE OR UPDATE OF product_name, price_captured, status, establishment_id
  ON public.scans
  FOR EACH ROW EXECUTE FUNCTION tg_refresh_comparison_cache_on_scan();

ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS category text;

CREATE OR REPLACE FUNCTION public.tg_scans_set_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.category := public.classify_product_category(NEW.product_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scans_set_category ON public.scans;
CREATE TRIGGER trg_scans_set_category
  BEFORE INSERT OR UPDATE OF product_name ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.tg_scans_set_category();

-- Backfill sem disparar os gatilhos pesados
ALTER TABLE public.scans DISABLE TRIGGER USER;
UPDATE public.scans
SET category = public.classify_product_category(product_name)
WHERE category IS NULL;
ALTER TABLE public.scans ENABLE TRIGGER USER;

CREATE INDEX IF NOT EXISTS idx_scans_category_public
  ON public.scans (category, establishment_id)
  WHERE status = 'salvo' AND user_id IS NULL;

CREATE OR REPLACE FUNCTION public.establishments_overview()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH s AS (
  SELECT sc.establishment_id,
         lower(btrim(sc.product_name)) AS pkey,
         sc.price_captured,
         sc.created_at,
         COALESCE(sc.category, 'outros') AS category
  FROM public.scans sc
  WHERE sc.status = 'salvo' AND sc.user_id IS NULL AND sc.product_name IS NOT NULL
),
per_product AS (
  SELECT establishment_id, pkey,
         min(price_captured) FILTER (WHERE price_captured > 0) AS min_price,
         max(price_captured) FILTER (WHERE price_captured > 0) AS max_price
  FROM s GROUP BY 1, 2
),
per_est AS (
  SELECT establishment_id,
         count(*) AS products_count,
         max(COALESCE(max_price, 0) - COALESCE(min_price, 0)) AS max_savings,
         min(min_price) AS min_price
  FROM per_product GROUP BY 1
),
last_upd AS (
  SELECT establishment_id, max(created_at) AS last_update FROM s GROUP BY 1
),
cats AS (
  SELECT establishment_id, category, count(*) AS n FROM s GROUP BY 1, 2
),
top_cats AS (
  SELECT establishment_id,
         jsonb_agg(jsonb_build_object('category', category, 'count', n) ORDER BY n DESC) AS list
  FROM (
    SELECT *, row_number() OVER (PARTITION BY establishment_id ORDER BY n DESC) AS rn FROM cats
  ) t WHERE rn <= 4 GROUP BY 1
),
global_product AS (
  SELECT pkey, min(price_captured) FILTER (WHERE price_captured > 0) AS mn,
         max(price_captured) FILTER (WHERE price_captured > 0) AS mx
  FROM s GROUP BY 1
),
global_cats AS (
  SELECT category, sum(n) AS n FROM cats GROUP BY 1
),
items AS (
  SELECT jsonb_agg(x ORDER BY (x->>'productsCount')::int DESC, x->>'name') AS list
  FROM (
    SELECT jsonb_build_object(
      'id', e.id, 'name', e.name, 'city', e.city, 'state', e.state,
      'neighborhood', e.neighborhood, 'latitude', e.latitude, 'longitude', e.longitude,
      'logoUrl', e.logo_url, 'brandColor', e.brand_color, 'kind', e.kind,
      'productsCount', COALESCE(pe.products_count, 0),
      'topCategories', COALESCE(tc.list, '[]'::jsonb),
      'lastUpdate', lu.last_update,
      'maxSavings', round(COALESCE(pe.max_savings, 0)::numeric, 2),
      'minPrice', round(pe.min_price::numeric, 2)
    ) AS x
    FROM public.establishments e
    LEFT JOIN per_est pe ON pe.establishment_id = e.id
    LEFT JOIN top_cats tc ON tc.establishment_id = e.id
    LEFT JOIN last_upd lu ON lu.establishment_id = e.id
    WHERE e.active = true
  ) q
)
SELECT jsonb_build_object(
  'items', COALESCE((SELECT list FROM items), '[]'::jsonb),
  'totalEstablishments', (SELECT count(*) FROM public.establishments WHERE active = true),
  'totalProducts', (SELECT COALESCE(sum(products_count), 0) FROM per_est),
  'totalCategories', (SELECT count(*) FROM global_cats),
  'totalMaxSavings', (SELECT round(COALESCE(max(COALESCE(mx,0) - COALESCE(mn,0)), 0)::numeric, 2) FROM global_product),
  'topGlobalCategories', COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('category', category, 'count', n) ORDER BY n DESC)
     FROM (SELECT category, n FROM global_cats ORDER BY n DESC LIMIT 8) g), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION public.establishments_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.establishments_overview() TO anon, authenticated, service_role;

ANALYZE public.scans;