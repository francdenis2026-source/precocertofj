
-- Normalização robusta: minúsculas, sem acento, sem pontuação, sem palavras "ruído"
CREATE OR REPLACE FUNCTION public.normalize_product_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  s TEXT;
BEGIN
  IF p_name IS NULL THEN RETURN ''; END IF;
  s := lower(public.unaccent(p_name));
  -- remove marcas/frases irrelevantes comuns em rótulos
  s := regexp_replace(s, '\b(sabor|com|sem|de|do|da|dos|das|e|em|para|tipo|marca|premium|tradicional|original|classico|pacote|pct|un|und|unidade|unidades|embalagem|nova|novo)\b', ' ', 'g');
  -- normaliza unidades de medida (mantém números + unidade juntos)
  s := regexp_replace(s, '(\d+)\s*(kg|g|ml|l|un|und|litros|litro)\b', '\1\2', 'g');
  -- remove pontuação
  s := regexp_replace(s, '[^a-z0-9]+', ' ', 'g');
  -- plurais simples
  s := regexp_replace(s, '\b(\w+?)s\b', '\1', 'g');
  -- colapsa espaços
  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  RETURN s;
END;
$$;

-- Índice GIN por trigrama para busca rápida
CREATE INDEX IF NOT EXISTS scans_product_name_trgm_idx
  ON public.scans USING gin (public.normalize_product_name(product_name) gin_trgm_ops);

-- Função de busca de duplicatas em um estabelecimento
CREATE OR REPLACE FUNCTION public.find_similar_scans(
  p_name TEXT,
  p_establishment_id UUID,
  p_threshold REAL DEFAULT 0.55
)
RETURNS TABLE (
  id UUID,
  product_name TEXT,
  price_captured NUMERIC,
  similarity REAL
)
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT s.id,
         s.product_name,
         s.price_captured,
         similarity(
           public.normalize_product_name(s.product_name),
           public.normalize_product_name(p_name)
         ) AS similarity
  FROM public.scans s
  WHERE s.establishment_id = p_establishment_id
    AND similarity(
          public.normalize_product_name(s.product_name),
          public.normalize_product_name(p_name)
        ) >= p_threshold
  ORDER BY similarity DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_product_name(TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.find_similar_scans(TEXT, UUID, REAL) TO authenticated, service_role;
