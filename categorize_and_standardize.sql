-- 1. Padronizar nomes de categorias existentes no catálogo
UPDATE public.product_catalog SET category = 'Limpeza' WHERE category ILIKE 'limpeza';
UPDATE public.product_catalog SET category = 'Higiene' WHERE category ILIKE 'higiene%' OR category ILIKE 'higiene pessoal' OR category = 'perfumaria' OR category = 'cuidados_pele' OR category = 'cabelo' OR category = 'bucal';
UPDATE public.product_catalog SET category = 'Mercearia' WHERE category ILIKE 'mercearia' OR category = 'alimentos' OR category = 'biscoitos' OR category = 'Biscoitos' OR category = 'bebidas_em_po' OR category = 'condimentos' OR category = 'doces' OR category = 'snacks' OR category = 'prontos';
UPDATE public.product_catalog SET category = 'Bebidas' WHERE category ILIKE 'bebidas';
UPDATE public.product_catalog SET category = 'Açougue' WHERE category ILIKE 'acougues' OR category = 'carnes';
UPDATE public.product_catalog SET category = 'Hortifruti' WHERE category ILIKE 'hortifruti';
UPDATE public.product_catalog SET category = 'Padaria' WHERE category ILIKE 'padaria';
UPDATE public.product_catalog SET category = 'Laticínios' WHERE category ILIKE 'laticinios%';
UPDATE public.product_catalog SET category = 'Infantil' WHERE category ILIKE 'infantil';
UPDATE public.product_catalog SET category = 'Farmácia' WHERE category ILIKE 'medicamentos' OR category = 'suplementos';
UPDATE public.product_catalog SET category = 'Outros' WHERE category IN ('bazar', 'papelaria', 'pet', 'papel_descartaveis', 'Test Category') OR category IS NULL;

-- 2. Classificar produtos nulos baseado em palavras-chave no display_name
UPDATE public.product_catalog
SET category = 'Mercearia'
WHERE category = 'Outros' AND display_name ILIKE ANY (ARRAY['%arroz%', '%feijão%', '%açúcar%', '%sal%', '%óleo%', '%macarrão%', '%café%', '%farinha%']);

UPDATE public.product_catalog
SET category = 'Açougue'
WHERE category = 'Outros' AND display_name ILIKE ANY (ARRAY['%carne%', '%frango%', '%linguiça%', '%bovino%', '%suíno%']);

UPDATE public.product_catalog
SET category = 'Bebidas'
WHERE category = 'Outros' AND display_name ILIKE ANY (ARRAY['%refrigerante%', '%suco%', '%cerveja%', '%vinho%', '%água%', '%leite%']);

UPDATE public.product_catalog
SET category = 'Limpeza'
WHERE category = 'Outros' AND display_name ILIKE ANY (ARRAY['%detergente%', '%sabão%', '%amaciante%', '%desinfetante%', '%cloro%']);

-- 3. Verificar o resultado final
SELECT category, COUNT(*) FROM public.product_catalog GROUP BY category ORDER BY COUNT(*) DESC;
