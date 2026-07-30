-- ============ 1. ÍNDICES: elimina sequential scans em scans ============
CREATE INDEX IF NOT EXISTS idx_scans_public_agg
  ON public.scans (establishment_id, created_at DESC)
  INCLUDE (product_name, price_captured)
  WHERE status = 'salvo' AND user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_scans_public_price_name
  ON public.scans (price_captured)
  INCLUDE (product_name, establishment_id)
  WHERE status = 'salvo' AND user_id IS NULL AND price_captured IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scans_user_created
  ON public.scans (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scans_barcode_saved
  ON public.scans (barcode)
  WHERE barcode IS NOT NULL AND status = 'salvo' AND user_id IS NULL;

-- índices duplicados (mesma definição) — remove o excedente
DROP INDEX IF EXISTS public.idx_scans_establishment;

ANALYZE public.scans;

-- ============ 2. market_name derivado do cadastro oficial ============
CREATE OR REPLACE FUNCTION public.tg_scans_sync_market_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.establishment_id IS NULL AND NEW.market_name IS NOT NULL THEN
    SELECT e.id INTO NEW.establishment_id
    FROM public.establishments e
    WHERE lower(btrim(e.name)) = lower(btrim(NEW.market_name))
    LIMIT 1;
  END IF;

  IF NEW.establishment_id IS NULL THEN
    RAISE EXCEPTION 'scans.establishment_id é obrigatório (mercado "%" não cadastrado)', NEW.market_name;
  END IF;

  SELECT e.name INTO v_name FROM public.establishments e WHERE e.id = NEW.establishment_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento % não existe', NEW.establishment_id;
  END IF;

  NEW.market_name := v_name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scans_sync_market_name ON public.scans;
CREATE TRIGGER trg_scans_sync_market_name
  BEFORE INSERT OR UPDATE OF establishment_id, market_name ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.tg_scans_sync_market_name();

-- Propaga renomeações do cadastro oficial para todas as tabelas com texto livre
CREATE OR REPLACE FUNCTION public.tg_establishments_propagate_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.scans SET market_name = NEW.name WHERE establishment_id = NEW.id;
    UPDATE public.favorite_markets SET market_name = NEW.name WHERE market_name = OLD.name;
    UPDATE public.price_alerts SET market_name = NEW.name WHERE market_name = OLD.name;
    UPDATE public.import_batches SET market_name = NEW.name WHERE market_name = OLD.name;
    UPDATE public.shared_comparisons SET market_name = NEW.name WHERE market_name = OLD.name;
    UPDATE public.collaborator_submissions SET market_name = NEW.name WHERE market_name = OLD.name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_establishments_propagate_name ON public.establishments;
CREATE TRIGGER trg_establishments_propagate_name
  AFTER UPDATE OF name ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.tg_establishments_propagate_name();

-- Garante o vínculo obrigatório (dados já estão 100% vinculados)
ALTER TABLE public.scans ALTER COLUMN establishment_id SET NOT NULL;

-- ============ 3. Agregação de estabelecimentos em uma única query ============
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
         sc.product_name,
         sc.price_captured,
         sc.created_at,
         public.classify_product_category(sc.product_name) AS category
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

-- ============ 4. RLS: platform_stats_cache (agregado público, só leitura) ============
GRANT SELECT ON public.platform_stats_cache TO anon, authenticated;
GRANT ALL ON public.platform_stats_cache TO service_role;
DROP POLICY IF EXISTS "Stats cache readable by everyone" ON public.platform_stats_cache;
CREATE POLICY "Stats cache readable by everyone"
  ON public.platform_stats_cache FOR SELECT TO anon, authenticated USING (true);

-- ============ 5. Auditoria e rate limit de IA ============
GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

DROP POLICY IF EXISTS "Usuário registra próprio uso IA" ON public.ai_usage;
CREATE POLICY "Usuário registra próprio uso IA"
  ON public.ai_usage FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_fn_created
  ON public.ai_usage (user_id, function_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  _user_id uuid,
  _function_name text,
  _max_calls integer DEFAULT 30,
  _window_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
BEGIN
  SELECT count(*) INTO v_used
  FROM public.ai_usage
  WHERE user_id = _user_id
    AND function_name = _function_name
    AND created_at > now() - make_interval(mins => _window_minutes);

  RETURN jsonb_build_object(
    'allowed', v_used < _max_calls,
    'used', v_used,
    'limit', _max_calls,
    'windowMinutes', _window_minutes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, text, integer, integer) TO authenticated, service_role;