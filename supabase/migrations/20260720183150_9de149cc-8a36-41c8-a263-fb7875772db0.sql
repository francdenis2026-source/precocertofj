
-- Desativa plano de 15 dias (baixo valor por dia)
UPDATE public.license_plans
SET active = false, updated_at = now()
WHERE slug = 'p15';

-- Mensal (30 dias) — o mais popular
UPDATE public.license_plans
SET name = 'Mensal',
    days = 30,
    price_cents = 2490,
    description = 'Acesso completo por 30 dias. Ideal para quem quer começar. Renova quando quiser.',
    sort_order = 20,
    active = true,
    updated_at = now()
WHERE slug = 'p30';

-- Trimestral (90 dias) — substitui o antigo 60 dias
UPDATE public.license_plans
SET name = 'Trimestral',
    slug = 'p90',
    days = 90,
    price_cents = 5990,
    description = '3 meses de acesso completo. Economize 20% em relação ao mensal.',
    sort_order = 30,
    active = true,
    updated_at = now()
WHERE slug = 'p60';

-- Semestral (180 dias)
UPDATE public.license_plans
SET name = 'Semestral',
    days = 180,
    price_cents = 9990,
    description = '6 meses com desconto. Comparação de preços, cesta inteligente e finanças.',
    sort_order = 40,
    active = true,
    updated_at = now()
WHERE slug = 'p180';

-- Bianual (720 dias)
UPDATE public.license_plans
SET name = 'Bianual',
    days = 720,
    price_cents = 29900,
    description = '2 anos de tranquilidade. Trave o preço e não se preocupe mais.',
    sort_order = 60,
    active = true,
    updated_at = now()
WHERE slug = 'p720';

-- Anual (365 dias) — novo, destaque "melhor valor"
INSERT INTO public.license_plans (name, slug, days, price_cents, active, sort_order, description)
VALUES (
  'Anual',
  'p365',
  365,
  17990,
  true,
  50,
  'Melhor custo-benefício: 12 meses com o maior desconto e IA liberada o ano inteiro.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  days = EXCLUDED.days,
  price_cents = EXCLUDED.price_cents,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();
