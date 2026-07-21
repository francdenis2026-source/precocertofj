CREATE OR REPLACE FUNCTION public.search_scans_unaccented(_q text, _limit integer DEFAULT 300)
 RETURNS TABLE(product_name text, price_captured numeric, market_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_norm text;
  v_tokens text[];
BEGIN
  v_norm := regexp_replace(public.unaccent(lower(coalesce(_q, ''))), '[^a-z0-9\s]+', ' ', 'g');
  v_tokens := ARRAY(
    SELECT t FROM regexp_split_to_table(trim(v_norm), '\s+') AS t
    WHERE length(t) >= 1
  );

  IF array_length(v_tokens, 1) IS NULL THEN
    RETURN QUERY
      SELECT s.product_name, s.price_captured, s.market_name, s.created_at
      FROM public.scans s
      WHERE s.price_captured IS NOT NULL
        AND s.product_name IS NOT NULL
      ORDER BY s.created_at DESC
      LIMIT LEAST(GREATEST(_limit, 1), 500);
    RETURN;
  END IF;

  RETURN QUERY
  WITH src AS (
    SELECT
      s.product_name,
      s.price_captured,
      s.market_name,
      s.created_at,
      public.unaccent(lower(coalesce(s.product_name, ''))) AS n_name
    FROM public.scans s
    WHERE s.price_captured IS NOT NULL
      AND s.product_name IS NOT NULL
  )
  SELECT src.product_name, src.price_captured, src.market_name, src.created_at
  FROM src
  WHERE (
    SELECT bool_and(src.n_name LIKE '%' || t || '%')
    FROM unnest(v_tokens) AS t
  )
  ORDER BY src.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 500);
END;
$function$;