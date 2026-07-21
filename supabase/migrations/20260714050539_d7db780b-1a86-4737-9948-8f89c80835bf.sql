
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Extrai tamanho canônico (ml, g ou un) do nome do produto
CREATE OR REPLACE FUNCTION public.extract_product_size(name text)
RETURNS TABLE(size_value numeric, size_unit text)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH matches AS (
    SELECT m[1] AS val, m[2] AS u, row_number() OVER () AS ord
    FROM regexp_matches(
      lower(coalesce(name, '')),
      '(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litros?|un|und|unid|unidades?)\b',
      'g'
    ) AS m
  ),
  chosen AS (
    SELECT val, u FROM matches ORDER BY ord DESC LIMIT 1
  )
  SELECT
    CASE u
      WHEN 'kg' THEN replace(val, ',', '.')::numeric * 1000
      WHEN 'l' THEN replace(val, ',', '.')::numeric * 1000
      WHEN 'litro' THEN replace(val, ',', '.')::numeric * 1000
      WHEN 'litros' THEN replace(val, ',', '.')::numeric * 1000
      ELSE replace(val, ',', '.')::numeric
    END AS size_value,
    CASE u
      WHEN 'kg' THEN 'g'
      WHEN 'g' THEN 'g'
      WHEN 'l' THEN 'ml'
      WHEN 'ml' THEN 'ml'
      WHEN 'litro' THEN 'ml'
      WHEN 'litros' THEN 'ml'
      ELSE 'un'
    END AS size_unit
  FROM chosen
  UNION ALL
  SELECT NULL::numeric, 'un'::text WHERE NOT EXISTS (SELECT 1 FROM chosen)
  LIMIT 1;
$$;

-- Normaliza nome do produto para agrupar variações leves
-- (remove acentos, caixa, pontuação, tamanhos, stop words e ordena tokens)
CREATE OR REPLACE FUNCTION public.normalize_product_key(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  WITH cleaned AS (
    SELECT regexp_replace(
      regexp_replace(
        regexp_replace(
          unaccent(lower(coalesce(name, ''))),
          '(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litros?|un|und|unid|unidades?|pack|cx|kit|pct)\b',
          ' ', 'g'
        ),
        '[^a-z0-9]+', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    ) AS s
  ),
  toks AS (
    SELECT tok
    FROM cleaned, unnest(string_to_array(trim(s), ' ')) AS t(tok)
    WHERE length(tok) >= 2
      AND tok NOT IN ('de','da','do','a','o','e','com','sem','para','ao','pra','no','na','em')
  )
  SELECT COALESCE(string_agg(tok, ' ' ORDER BY tok), '') FROM toks;
$$;

-- Comparativo de preços entre estabelecimentos
CREATE OR REPLACE FUNCTION public.get_price_comparisons()
RETURNS TABLE(
  product_key text,
  display_name text,
  size_value numeric,
  size_unit text,
  store_count int,
  min_price numeric,
  avg_price numeric,
  max_price numeric,
  savings_pct numeric,
  cheapest_store text,
  cheapest_establishment_id uuid,
  stores jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH base AS (
    SELECT
      s.product_name,
      s.price_captured,
      s.establishment_id,
      e.name AS store_name,
      public.normalize_product_key(s.product_name) AS pkey,
      sz.size_value,
      sz.size_unit
    FROM public.scans s
    JOIN public.establishments e ON e.id = s.establishment_id
    CROSS JOIN LATERAL public.extract_product_size(s.product_name) sz
    WHERE s.establishment_id IS NOT NULL
      AND s.price_captured IS NOT NULL
      AND s.status = 'salvo'
      AND s.user_id IS NULL
  ),
  per_store AS (
    SELECT
      pkey, size_value, size_unit,
      establishment_id, store_name,
      MIN(price_captured) AS price,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS product_name
    FROM base
    WHERE pkey <> ''
    GROUP BY pkey, size_value, size_unit, establishment_id, store_name
  ),
  agg AS (
    SELECT
      pkey, size_value, size_unit,
      COUNT(DISTINCT establishment_id)::int AS store_count,
      MIN(price) AS min_price,
      ROUND(AVG(price)::numeric, 2) AS avg_price,
      MAX(price) AS max_price,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS display_name,
      jsonb_agg(
        jsonb_build_object(
          'establishment_id', establishment_id,
          'store_name', store_name,
          'price', price,
          'product_name', product_name
        ) ORDER BY price
      ) AS stores
    FROM per_store
    GROUP BY pkey, size_value, size_unit
    HAVING COUNT(DISTINCT establishment_id) >= 2
  )
  SELECT
    pkey,
    display_name,
    size_value,
    size_unit,
    store_count,
    min_price,
    avg_price,
    max_price,
    CASE WHEN avg_price > 0
      THEN ROUND(((avg_price - min_price) / avg_price * 100)::numeric, 1)
      ELSE 0
    END AS savings_pct,
    (stores->0->>'store_name') AS cheapest_store,
    ((stores->0->>'establishment_id'))::uuid AS cheapest_establishment_id,
    stores
  FROM agg
  ORDER BY
    store_count DESC,
    CASE WHEN avg_price > 0 THEN (avg_price - min_price) / avg_price ELSE 0 END DESC;
$$;

GRANT EXECUTE ON FUNCTION public.extract_product_size(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_product_key(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_price_comparisons() TO anon, authenticated;
