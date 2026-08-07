CREATE OR REPLACE FUNCTION public.search_scans_unaccented_v2(_q text, _category text DEFAULT NULL, _limit integer DEFAULT 300)
RETURNS TABLE(product_name text, price_captured numeric, market_name text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_tokens text[];
  v_pattern text[];
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
        AND (_category IS NULL OR _category = '' OR s.category = _category)
      ORDER BY s.created_at DESC
      LIMIT LEAST(GREATEST(_limit, 1), 500);
    RETURN;
  END IF;

  v_pattern := ARRAY(SELECT '%' || t || '%' FROM unnest(v_tokens) AS t);

  RETURN QUERY
  SELECT s.product_name, s.price_captured, s.market_name, s.created_at
  FROM public.scans s
  WHERE s.price_captured IS NOT NULL
    AND s.product_name IS NOT NULL
    AND public.search_norm(s.product_name) LIKE ALL (v_pattern)
    AND (_category IS NULL OR _category = '' OR s.category = _category)
  ORDER BY s.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 500);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_scans_unaccented_v2(text, text, integer) TO anon, authenticated, service_role;