-- Improved catalog suggestion search: token-based, partial words, brand + category.
-- Splits the query into tokens (accent-insensitive) and requires each token to
-- appear somewhere in display_name || brand || category. Ranks prefix > substring.

CREATE OR REPLACE FUNCTION public.search_catalog_suggestions(_q text, _limit integer DEFAULT 8)
RETURNS TABLE(id uuid, display_name text, brand text, category text, image_url text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_norm text;
  v_tokens text[];
BEGIN
  v_norm := regexp_replace(public.unaccent(lower(coalesce(_q, ''))), '[^a-z0-9\s]+', ' ', 'g');
  v_tokens := ARRAY(SELECT t FROM regexp_split_to_table(trim(v_norm), '\s+') AS t WHERE length(t) >= 1);

  IF array_length(v_tokens, 1) IS NULL THEN
    RETURN QUERY
      SELECT pc.id, pc.display_name, pc.brand, pc.category, pc.image_url
      FROM public.product_catalog pc
      ORDER BY pc.created_at DESC
      LIMIT LEAST(GREATEST(_limit, 1), 20);
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
      public.unaccent(lower(coalesce(pc.display_name, ''))) AS n_name,
      public.unaccent(lower(coalesce(pc.brand, ''))) AS n_brand,
      public.unaccent(lower(coalesce(pc.category, ''))) AS n_cat
    FROM public.product_catalog pc
  ),
  filtered AS (
    SELECT s.*
    FROM scored s
    WHERE (
      SELECT bool_and(s.n_name LIKE '%' || t || '%'
                   OR s.n_brand LIKE '%' || t || '%'
                   OR s.n_cat   LIKE '%' || t || '%')
      FROM unnest(v_tokens) AS t
    )
  )
  SELECT f.id, f.display_name, f.brand, f.category, f.image_url
  FROM filtered f
  ORDER BY
    -- prefixo no nome: melhor
    CASE WHEN f.n_name LIKE v_tokens[1] || '%' THEN 0
         WHEN f.n_brand LIKE v_tokens[1] || '%' THEN 1
         WHEN f.n_name LIKE '%' || v_tokens[1] || '%' THEN 2
         ELSE 3 END,
    length(f.display_name) ASC
  LIMIT LEAST(GREATEST(_limit, 1), 20);
END;
$$;