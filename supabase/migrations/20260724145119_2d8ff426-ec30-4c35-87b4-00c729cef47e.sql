ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS brand_color text;

COMMENT ON COLUMN public.establishments.brand_color IS 'Hex color (#RRGGBB) usada como assinatura visual do estabelecimento em resultados de busca, matriz e listagens.';

-- Seed cores distintas, acessíveis (contraste bom com texto branco), coexistindo com navy/gold
UPDATE public.establishments SET brand_color = '#1E5AA8'  WHERE id = '2148aff3-4b80-4b0d-adf8-a06e50e3c2c4'; -- CENTRAL SUPER
UPDATE public.establishments SET brand_color = '#2E7D6B'  WHERE id = '905ca83b-5bd5-4d91-a543-76b2966e7d45'; -- COMERCIAL PARCEIRÃO
UPDATE public.establishments SET brand_color = '#B4536F'  WHERE id = '555544d3-d211-4125-8bdb-70351e768b63'; -- COMERCIAL VANDERLEY
UPDATE public.establishments SET brand_color = '#B08948'  WHERE id = '5c71b8fb-4fe2-4f65-8bd0-80726d92a243'; -- DOCE DIA
UPDATE public.establishments SET brand_color = '#7A4FB3'  WHERE id = 'f773cd4e-4561-48e7-a438-3ff26790d22a'; -- DROGARIA ULTRA POPULAR
UPDATE public.establishments SET brand_color = '#4A6741'  WHERE id = 'c3f3df85-42fe-41ed-97a1-3115330783e2'; -- MERCANTIL REBOUÇAS
UPDATE public.establishments SET brand_color = '#C2410C'  WHERE id = '2de4712e-e767-4cfe-acf0-1ec111a316b8'; -- Recanto da Carne
UPDATE public.establishments SET brand_color = '#0F766E'  WHERE id = '0b39b658-42f1-42c4-b1ac-eb81e4ba27bf'; -- SUPERMERCADO 100% FEIJOENSE