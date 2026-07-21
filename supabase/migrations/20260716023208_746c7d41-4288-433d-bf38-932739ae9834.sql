
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.search_catalog_suggestions(_q text, _limit integer DEFAULT 8)
RETURNS TABLE(id uuid, display_name text, brand text, category text, image_url text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_norm text;
  v_tokens text[];
  v_joined text;
  v_limit int := LEAST(GREATEST(_limit, 1), 20);
BEGIN
  v_norm := regexp_replace(public.unaccent(lower(coalesce(_q, ''))), '[^a-z0-9\s]+', ' ', 'g');
  v_tokens := ARRAY(SELECT t FROM regexp_split_to_table(trim(v_norm), '\s+') AS t WHERE length(t) >= 1);
  v_joined := trim(v_norm);

  IF array_length(v_tokens, 1) IS NULL THEN
    RETURN QUERY
      SELECT pc.id, pc.display_name, pc.brand, pc.category, pc.image_url
      FROM public.product_catalog pc
      ORDER BY pc.created_at DESC
      LIMIT v_limit;
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored AS (
    SELECT
      pc.id,
      pc.display_name,
      pc.brand,
      pc.category,
      pc.image_url,
      public.unaccent(lower(coalesce(pc.display_name, '')))    AS n_name,
      public.unaccent(lower(coalesce(pc.normalized_name, ''))) AS n_norm,
      public.unaccent(lower(coalesce(pc.brand, '')))           AS n_brand,
      public.unaccent(lower(coalesce(pc.category, '')))        AS n_cat
    FROM public.product_catalog pc
  ),
  hay AS (
    SELECT
      s.*,
      (s.n_name || ' ' || s.n_norm || ' ' || s.n_brand || ' ' || s.n_cat) AS haystack
    FROM scored s
  ),
  strict_matches AS (
    SELECT h.*
    FROM hay h
    WHERE (
      SELECT bool_and(h.haystack LIKE '%' || t || '%')
      FROM unnest(v_tokens) AS t
    )
  ),
  fuzzy_matches AS (
    SELECT h.*
    FROM hay h
    WHERE NOT EXISTS (SELECT 1 FROM strict_matches)
      AND public.similarity(h.haystack, v_joined) > 0.28
  ),
  combined AS (
    SELECT sm.*, 0 AS bucket, 0::float AS sim FROM strict_matches sm
    UNION ALL
    SELECT fm.*, 1 AS bucket, public.similarity(fm.haystack, v_joined) AS sim FROM fuzzy_matches fm
  )
  SELECT c.id, c.display_name, c.brand, c.category, c.image_url
  FROM combined c
  ORDER BY
    c.bucket ASC,
    CASE WHEN c.bucket = 0 THEN
      CASE WHEN c.n_name  LIKE v_tokens[1] || '%' THEN 0
           WHEN c.n_brand LIKE v_tokens[1] || '%' THEN 1
           WHEN c.n_name  LIKE '%' || v_tokens[1] || '%' THEN 2
           ELSE 3 END
    ELSE 9 END ASC,
    CASE WHEN c.bucket = 1 THEN -c.sim ELSE 0 END ASC,
    length(c.display_name) ASC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_catalog_suggestions(text, int) TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_product_catalog_display_name_trgm
  ON public.product_catalog USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_product_catalog_normalized_name_trgm
  ON public.product_catalog USING gin (normalized_name gin_trgm_ops);
