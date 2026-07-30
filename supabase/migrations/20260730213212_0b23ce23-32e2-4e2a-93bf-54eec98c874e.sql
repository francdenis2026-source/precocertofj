CREATE OR REPLACE FUNCTION public.search_catalog_suggestions(_q text, _limit integer DEFAULT 8)
 RETURNS TABLE(id uuid, display_name text, brand text, category text, image_url text, is_fuzzy boolean, similarity real)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
      SELECT pc.id, pc.display_name, pc.brand, pc.category, pc.image_url,
             false AS is_fuzzy, 0::real AS similarity
      FROM public.product_catalog pc
      ORDER BY pc.created_at DESC
      LIMIT v_limit;
    RETURN;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT pc.id,
           pc.display_name,
           pc.brand,
           pc.category,
           pc.image_url,
           pc.normalized_name
    FROM public.product_catalog pc
    UNION ALL
    SELECT md5(cc.product_key)::uuid AS id,
           cc.display_name,
           NULL::text AS brand,
           cc.category,
           cc.image_url,
           cc.product_key AS normalized_name
    FROM public.product_comparison_cache cc
    WHERE cc.display_name IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.product_catalog pc2
        WHERE public.unaccent(lower(pc2.display_name)) = public.unaccent(lower(cc.display_name))
      )
  ),
  hay AS (
    SELECT
      b.id,
      b.display_name,
      b.brand,
      b.category,
      b.image_url,
      public.unaccent(lower(coalesce(b.display_name, '')))    AS n_name,
      public.unaccent(lower(coalesce(b.brand, '')))           AS n_brand,
      (public.unaccent(lower(coalesce(b.display_name, ''))) || ' ' ||
       public.unaccent(lower(coalesce(b.normalized_name, ''))) || ' ' ||
       public.unaccent(lower(coalesce(b.brand, ''))) || ' ' ||
       public.unaccent(lower(coalesce(b.category, '')))) AS haystack
    FROM base b
  ),
  matched AS (
    SELECT h.*,
           (SELECT count(*) FROM unnest(v_tokens) AS t WHERE h.haystack LIKE '%' || t || '%') AS hits
    FROM hay h
  ),
  strict_matches AS (
    SELECT m.* FROM matched m WHERE m.hits = array_length(v_tokens, 1)
  ),
  partial_matches AS (
    SELECT m.* FROM matched m
    WHERE m.hits > 0
      AND m.hits < array_length(v_tokens, 1)
      AND NOT EXISTS (SELECT 1 FROM strict_matches)
  ),
  fuzzy_matches AS (
    SELECT m.* FROM matched m
    WHERE m.hits = 0
      AND NOT EXISTS (SELECT 1 FROM strict_matches)
      AND NOT EXISTS (SELECT 1 FROM partial_matches)
      AND public.similarity(m.haystack, v_joined) > 0.28
  ),
  combined AS (
    SELECT sm.id, sm.display_name, sm.brand, sm.category, sm.image_url, sm.n_name, sm.n_brand, sm.hits,
           0 AS bucket, public.similarity(sm.haystack, v_joined)::real AS sim
    FROM strict_matches sm
    UNION ALL
    SELECT pm.id, pm.display_name, pm.brand, pm.category, pm.image_url, pm.n_name, pm.n_brand, pm.hits,
           1 AS bucket, public.similarity(pm.haystack, v_joined)::real AS sim
    FROM partial_matches pm
    UNION ALL
    SELECT fm.id, fm.display_name, fm.brand, fm.category, fm.image_url, fm.n_name, fm.n_brand, fm.hits,
           2 AS bucket, public.similarity(fm.haystack, v_joined)::real AS sim
    FROM fuzzy_matches fm
  )
  SELECT c.id, c.display_name, c.brand, c.category, c.image_url,
         (c.bucket > 0) AS is_fuzzy,
         c.sim          AS similarity
  FROM combined c
  ORDER BY
    c.bucket ASC,
    CASE WHEN c.bucket = 0 THEN
      CASE WHEN c.n_name  LIKE v_tokens[1] || '%' THEN 0
           WHEN c.n_brand LIKE v_tokens[1] || '%' THEN 1
           WHEN c.n_name  LIKE '%' || v_tokens[1] || '%' THEN 2
           ELSE 3 END
    ELSE 9 END ASC,
    CASE WHEN c.bucket > 0 THEN -c.hits ELSE 0 END ASC,
    CASE WHEN c.bucket > 0 THEN -c.sim ELSE 0 END ASC,
    length(c.display_name) ASC
  LIMIT v_limit;
END;
$function$;