-- Seed Merchant Plans with JSONB
INSERT INTO public.license_plans (name, slug, days, price_cents, description, features, active, highlight, sort_order)
VALUES 
('Parceiro Local', 'parceiro-local', 30, 2990, 'Para pequenos comércios locais.', '["Perfil verificado", "Gestão de catálogo", "Ofertas básicas", "Métricas básicas"]'::jsonb, true, false, 10),
('Parceiro Pro', 'parceiro-pro', 30, 6990, 'Para estabelecimentos de médio porte.', '["Tudo do Local", "Analytics avançado", "Produtos mais buscados", "Desempenho de ofertas"]'::jsonb, true, true, 20),
('Parceiro Business', 'parceiro-business', 30, 14990, 'Para grandes supermercados.', '["Tudo do Pro", "Inteligência competitiva", "Relatórios exportáveis", "Múltiplos usuários"]'::jsonb, true, false, 30),
('Enterprise', 'parceiro-enterprise', 365, 0, 'Soluções personalizadas.', '["Múltiplas filiais", "Integração ERP/API", "Suporte dedicado", "Analytics personalizado"]'::jsonb, true, false, 40)
ON CONFLICT (slug) DO UPDATE SET 
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features;
