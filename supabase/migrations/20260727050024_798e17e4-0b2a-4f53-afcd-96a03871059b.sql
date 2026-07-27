-- 1) Normalizador IMMUTABLE (permite índice de expressão)
CREATE OR REPLACE FUNCTION public.search_norm(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT regexp_replace(
    public.unaccent('unaccent'::regdictionary, lower(coalesce(txt, ''))),
    '[^a-z0-9]+', ' ', 'g'
  );
$$;

-- 2) Índices de busca
CREATE INDEX IF NOT EXISTS idx_scans_search_norm_trgm
  ON public.scans USING gin (public.search_norm(product_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pps_display_name_trgm
  ON public.product_price_stats USING gin (public.search_norm(display_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pcc_savings_pct
  ON public.product_comparison_cache (savings_pct DESC);
CREATE INDEX IF NOT EXISTS idx_pcc_min_price
  ON public.product_comparison_cache (min_price ASC);
CREATE INDEX IF NOT EXISTS idx_pcc_updated_at
  ON public.product_comparison_cache (updated_at DESC);

-- 3) Busca por nome usando o índice trigram
CREATE OR REPLACE FUNCTION public.search_scans_unaccented(_q text, _limit integer DEFAULT 300)
RETURNS TABLE(product_name text, price_captured numeric, market_name text, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $function$
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
  ORDER BY s.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 500);
END;
$function$;

-- 4) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_comparison_cache;