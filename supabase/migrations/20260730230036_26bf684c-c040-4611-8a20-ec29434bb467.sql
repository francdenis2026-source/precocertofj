-- 1) Funções auxiliares (IMMUTABLE para permitir colunas geradas)
CREATE OR REPLACE FUNCTION public.pc_deaccent(txt text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path = public AS $$
  SELECT lower(translate(txt,
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'));
$$;

CREATE OR REPLACE FUNCTION public.pc_size_key(name text, unit text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE m text[]; qty numeric; u text;
BEGIN
  IF name IS NULL THEN RETURN NULL; END IF;
  m := regexp_match(
        translate(public.pc_deaccent(name), ',', '.'),
        '([0-9]+(?:\.[0-9]+)?)\s*(kg|g|mg|l|ml|un|unidades|unidade|und|litros|litro|gramas|grama)([^a-z0-9]|$)');
  IF m IS NULL THEN RETURN NULL; END IF;
  qty := m[1]::numeric;
  u := m[2];
  u := CASE
         WHEN u IN ('gramas','grama') THEN 'g'
         WHEN u IN ('litros','litro') THEN 'l'
         WHEN u IN ('unidades','unidade','und') THEN 'un'
         ELSE u END;
  -- normaliza para a menor unidade da família (g / ml) para 1kg = 1000g
  IF u = 'kg' THEN qty := qty * 1000; u := 'g'; END IF;
  IF u = 'l'  THEN qty := qty * 1000; u := 'ml'; END IF;
  RETURN trim(trailing '.' from trim(trailing '0' from to_char(qty, 'FM9999999990.999'))) || u;
END;
$$;

CREATE OR REPLACE FUNCTION public.pc_variant_key(name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN name IS NULL THEN NULL ELSE (
    SELECT string_agg(t, ' ' ORDER BY t)
    FROM unnest(regexp_split_to_array(
      regexp_replace(public.pc_deaccent(name), '[^a-z0-9]+', ' ', 'g'), '\s+')) AS t
    WHERE t <> ''
  ) END;
$$;

-- 2) Colunas derivadas
ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS size_key text
    GENERATED ALWAYS AS (public.pc_size_key(display_name, default_unit)) STORED,
  ADD COLUMN IF NOT EXISTS variant_key text
    GENERATED ALWAYS AS (public.pc_variant_key(display_name)) STORED;

-- 3) Consolidação dos duplicados verdadeiros
CREATE TEMP TABLE pc_merge ON COMMIT DROP AS
WITH ranked AS (
  SELECT id, product_key, size_key, variant_key,
         first_value(id) OVER (
           PARTITION BY product_key, size_key, variant_key
           ORDER BY (image_url IS NULL), created_at, id
         ) AS keep_id
  FROM public.product_catalog
  WHERE product_key IS NOT NULL AND variant_key IS NOT NULL
)
SELECT id AS dup_id, keep_id FROM ranked WHERE id <> keep_id;

-- remove referências que colidiriam com o registro mantido
DELETE FROM public.favorite_items f USING pc_merge m
 WHERE f.catalog_id = m.dup_id
   AND EXISTS (SELECT 1 FROM public.favorite_items k
                WHERE k.catalog_id = m.keep_id AND k.user_id = f.user_id);
DELETE FROM public.price_alerts a USING pc_merge m
 WHERE a.catalog_id = m.dup_id
   AND EXISTS (SELECT 1 FROM public.price_alerts k
                WHERE k.catalog_id = m.keep_id AND k.user_id = a.user_id);
DELETE FROM public.catalog_image_jobs j USING pc_merge m
 WHERE j.catalog_id = m.dup_id
   AND EXISTS (SELECT 1 FROM public.catalog_image_jobs k
                WHERE k.catalog_id = m.keep_id AND k.status = j.status);

UPDATE public.favorite_items f SET catalog_id = m.keep_id FROM pc_merge m WHERE f.catalog_id = m.dup_id;
UPDATE public.price_alerts a SET catalog_id = m.keep_id FROM pc_merge m WHERE a.catalog_id = m.dup_id;
UPDATE public.shopping_list_items s SET catalog_id = m.keep_id FROM pc_merge m WHERE s.catalog_id = m.dup_id;
UPDATE public.catalog_image_jobs j SET catalog_id = m.keep_id FROM pc_merge m WHERE j.catalog_id = m.dup_id;
UPDATE public.catalog_suggestions c SET product_catalog_id = m.keep_id FROM pc_merge m WHERE c.product_catalog_id = m.dup_id;
UPDATE public.price_history h SET product_id = m.keep_id FROM pc_merge m WHERE h.product_id = m.dup_id;
UPDATE public.product_catalog_audit u SET catalog_id = m.keep_id FROM pc_merge m WHERE u.catalog_id = m.dup_id;

-- completa dados faltantes no registro mantido antes de descartar o duplicado
UPDATE public.product_catalog k SET
  image_url = COALESCE(k.image_url, d.image_url),
  image_source = COALESCE(k.image_source, d.image_source),
  barcode = COALESCE(k.barcode, d.barcode),
  brand = COALESCE(k.brand, d.brand),
  category = COALESCE(k.category, d.category),
  updated_at = now()
FROM pc_merge m JOIN public.product_catalog d ON d.id = m.dup_id
WHERE k.id = m.keep_id;

DELETE FROM public.product_catalog p USING pc_merge m WHERE p.id = m.dup_id;

-- 4) Trava contra novos duplicados verdadeiros (variações reais continuam permitidas)
CREATE UNIQUE INDEX IF NOT EXISTS product_catalog_key_size_variant_uidx
  ON public.product_catalog (product_key, size_key, variant_key)
  WHERE product_key IS NOT NULL AND variant_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_catalog_size_key
  ON public.product_catalog (size_key) WHERE size_key IS NOT NULL;