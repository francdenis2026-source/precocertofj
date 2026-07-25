
CREATE OR REPLACE FUNCTION public.normalize_product_key(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
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
    SELECT DISTINCT
      CASE
        WHEN length(tok) >= 5 AND tok ~ '(oes|aes)$' THEN regexp_replace(tok, '(oes|aes)$', 'ao')
        WHEN length(tok) >= 5 AND tok ~ '[^aeiou]es$' THEN left(tok, length(tok) - 2)
        WHEN length(tok) >= 4 AND tok ~ 's$' THEN left(tok, length(tok) - 1)
        ELSE tok
      END AS tok
    FROM cleaned, unnest(string_to_array(trim(s), ' ')) AS t(tok)
    WHERE length(tok) >= 3
      AND tok NOT IN (
        'de','da','do','das','dos','com','sem','para','pra','the','and','tipo',
        'pet','gfa','garrafa','garrafao','lata','latinha','sache','sachet','saco',
        'pote','caixa','cxa','frasco','refil','embalagem','emb','pacote','pacotes',
        'vidro','plastico','descartavel','novo','nova','novos','novas'
      )
  )
  SELECT COALESCE(string_agg(DISTINCT tok, ' ' ORDER BY tok), '') FROM toks;
$function$;

SELECT public.rebuild_comparison_cache_all();
