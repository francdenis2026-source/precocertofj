
-- 1) Categoria + classificador
ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS idx_product_catalog_category
  ON public.product_catalog(category);

CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  WITH n AS (SELECT unaccent(lower(coalesce(name, ''))) AS s)
  SELECT CASE
    WHEN s ~ '\y(leite|queijo|manteiga|margarina|iogurte|requeij|creme de leite|nata|coalhad|danone|batavo|italac|itamb|qualy|vigor|claybom)\y' THEN 'laticinios'
    WHEN s ~ '\y(frango|carne|boi|bovin|suin|porco|peixe|tilapia|salmao|linguica|salsich|presunto|mortadel|bacon|hamburg|pernil|costela|coxao|acem|patinho|file)\y' THEN 'carnes'
    WHEN s ~ '\y(pao|torrada|bolo|panetone|rosquinha|croissant)\y' THEN 'padaria'
    WHEN s ~ '\y(maca|banana|laranja|limao|mamao|melancia|abacaxi|uva|manga|pera|cebola|batata|tomate|alface|cenoura|abobora|abobrinha|pimentao|alho|beterraba|couve|repolho|mandioca)\y' THEN 'hortifruti'
    WHEN s ~ '\y(biscoit|bolach|wafer|cracker|cream cracker|oreo|club social|richester|itamaraty|minueto)\y' THEN 'biscoitos'
    WHEN s ~ '\y(chocolat|bombom|bala|brigadeiro|doce de leite|geleia|paçoca|pacoca)\y' THEN 'doces'
    WHEN s ~ '\y(refrigerante|coca|guarana|pepsi|fanta|suco|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|agua mineral|agua tonic)\y' THEN 'bebidas'
    WHEN s ~ '\y(cafe|achocolat|nescau|toddy|cha|matte|leite em po|mingau|sucrilhos|cereal|nutribom|brassuk|icebel|suco em po)\y' THEN 'bebidas_em_po'
    WHEN s ~ '\y(arroz|feijao|acucar|farinha|macarrao|espaguete|penne|parafuso|oleo|azeite|vinagre|sal|fuba|amido|fermento|tempero|colorif|coloral|extrato|pol[pv]a|molho|maionese|catchup|ketchup|mostarda|atum|sardinha|azeitona|milho|ervilha|selita|selita|seleta)\y' THEN 'mercearia'
    WHEN s ~ '\y(sorvete|congelad|pizza congelada|nugget)\y' THEN 'congelados'
    WHEN s ~ '\y(sabao|sabonete|shampoo|condicionador|desodorante|pasta de dente|papel higienic|absorvent|fralda|algodao)\y' THEN 'higiene'
    WHEN s ~ '\y(detergent|alvejant|amaciant|desinfet|agua sanitaria|multiuso|lava roupa|omo|ariel|ype)\y' THEN 'limpeza'
    ELSE 'outros'
  END
  FROM n;
$$;

-- Preenche categorias existentes
UPDATE public.product_catalog
SET category = public.classify_product_category(display_name)
WHERE category IS NULL;

-- 2) Nova versão do comparativo, com categoria + filtro
DROP FUNCTION IF EXISTS public.get_price_comparisons();

CREATE OR REPLACE FUNCTION public.get_price_comparisons(p_category text DEFAULT NULL)
RETURNS TABLE(
  product_key text,
  display_name text,
  category text,
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
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH base AS (
    SELECT
      s.product_name,
      s.price_captured,
      s.establishment_id,
      e.name AS store_name,
      public.normalize_product_key(s.product_name) AS pkey,
      public.classify_product_category(s.product_name) AS cat,
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
      pkey, cat, size_value, size_unit,
      establishment_id, store_name,
      MIN(price_captured) AS price,
      (array_agg(product_name ORDER BY length(product_name)))[1] AS product_name
    FROM base
    WHERE pkey <> ''
    GROUP BY pkey, cat, size_value, size_unit, establishment_id, store_name
  ),
  agg AS (
    SELECT
      pkey, cat, size_value, size_unit,
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
    GROUP BY pkey, cat, size_value, size_unit
    HAVING COUNT(DISTINCT establishment_id) >= 2
  )
  SELECT
    pkey,
    display_name,
    cat,
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
  WHERE p_category IS NULL OR cat = p_category
  ORDER BY
    store_count DESC,
    CASE WHEN avg_price > 0 THEN (avg_price - min_price) / avg_price ELSE 0 END DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_price_comparisons(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_product_category(text) TO anon, authenticated;

-- 3) Remove duplicatas no Central Super (mantém o mais recente)
DELETE FROM public.scans s
USING (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY establishment_id, lower(trim(product_name))
      ORDER BY created_at DESC
    ) AS rn
  FROM public.scans
  WHERE status = 'salvo'
    AND user_id IS NULL
    AND establishment_id = 'ecd238df-2566-4c66-8af5-62dfa2991857'
) d
WHERE s.id = d.id AND d.rn > 1;

-- 4) Remove imagem de nota fiscal do Pão Massa Fina
UPDATE public.scans
SET image_url = NULL
WHERE product_name ILIKE '%massa fina%'
  AND image_url ILIKE '%central-super-nf%';
