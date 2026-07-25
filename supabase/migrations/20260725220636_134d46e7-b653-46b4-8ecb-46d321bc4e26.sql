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
    SELECT DISTINCT tok
    FROM cleaned, unnest(string_to_array(trim(s), ' ')) AS t(tok)
    WHERE length(tok) >= 3
      AND tok NOT IN (
        'de','da','do','das','dos','com','sem','para','pra','the','and','tipo',
        -- ruído de embalagem: não deve criar produtos distintos
        'pet','gfa','garrafa','garrafao','lata','latinha','sache','sachet','saco',
        'pote','caixa','cxa','frasco','refil','embalagem','emb','pacote','pacotes',
        'vidro','plastico','descartavel','novo','nova','novos','novas'
      )
  )
  SELECT COALESCE(string_agg(tok, ' ' ORDER BY tok), '') FROM toks;
$$;

SELECT public.rebuild_comparison_cache_all();