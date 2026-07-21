
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
      '(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litros?|un|und|unid|unidades?)\y',
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
          '(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litros?|un|und|unid|unidades?|pack|cx|kit|pct)\y',
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
    WHERE length(tok) >= 3
      AND tok NOT IN ('de','da','do','com','sem','para','pra','the','and')
  )
  SELECT COALESCE(string_agg(tok, ' ' ORDER BY tok), '') FROM toks;
$$;
