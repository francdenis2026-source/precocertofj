-- 1. Analisar produtos por estabelecimento
SELECT m.name as market_name, COUNT(p.id) as product_count
FROM public.product_catalog p
JOIN public.establishments m ON p.establishment_id = m.id
GROUP BY m.name;

-- 2. Garantir que as categorias básicas existam
INSERT INTO public.categories (name, slug, icon)
VALUES 
  ('Alimentos Básicos', 'alimentos-basicos', 'Utensils'),
  ('Carnes e Frios', 'carnes-e-frios', 'Beef'),
  ('Hortifruti', 'hortifruti', 'Apple'),
  ('Padaria', 'padaria', 'Coffee'),
  ('Laticínios e Ovos', 'laticinios-e-ovos', 'Milk'),
  ('Bebidas', 'bebidas', 'Beer'),
  ('Limpeza', 'limpeza', 'Droplets'),
  ('Higiene e Perfumaria', 'higiene-e-perfumaria', 'Smile')
ON CONFLICT (slug) DO NOTHING;

-- 3. Classificar produtos automaticamente baseado em palavras-chave no nome
-- Esta é uma simplificação para o "mecanismo de reclassificação" solicitado
UPDATE public.product_catalog
SET category_id = (SELECT id FROM public.categories WHERE slug = 'alimentos-basicos')
WHERE name ILIKE ANY (ARRAY['%arroz%', '%feijão%', '%açúcar%', '%sal%', '%óleo%', '%macarrão%'])
AND category_id IS NULL;

UPDATE public.product_catalog
SET category_id = (SELECT id FROM public.categories WHERE slug = 'carnes-e-frios')
WHERE name ILIKE ANY (ARRAY['%carne%', '%frango%', '%linguiça%', '%presunto%', '%queijo%', '%salsicha%', '%bovino%', '%suíno%'])
AND category_id IS NULL;

UPDATE public.product_catalog
SET category_id = (SELECT id FROM public.categories WHERE slug = 'bebidas')
WHERE name ILIKE ANY (ARRAY['%refrigerante%', '%suco%', '%cerveja%', '%vinho%', '%água%', '%leite%'])
AND category_id IS NULL;

UPDATE public.product_catalog
SET category_id = (SELECT id FROM public.categories WHERE slug = 'limpeza')
WHERE name ILIKE ANY (ARRAY['%detergente%', '%sabão%', '%amaciante%', '%desinfetante%', '%cloro%'])
AND category_id IS NULL;

-- 4. Grant permissões se necessário (assumindo que as tabelas já existem)
GRANT SELECT ON public.categories TO authenticated, anon;
