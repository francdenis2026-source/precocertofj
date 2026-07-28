-- ============================================================
-- Cesta Básica: versionamento e gestão de itens
-- ============================================================

CREATE TABLE public.basket_item_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version INTEGER NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version)
);

CREATE UNIQUE INDEX basket_item_sets_only_one_active
  ON public.basket_item_sets ((true))
  WHERE active = TRUE;

GRANT SELECT ON public.basket_item_sets TO anon, authenticated;
GRANT ALL ON public.basket_item_sets TO service_role;

ALTER TABLE public.basket_item_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "basket_item_sets read all"
  ON public.basket_item_sets FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "basket_item_sets admin write"
  ON public.basket_item_sets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------

CREATE TABLE public.basket_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.basket_item_sets(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999),
  patterns TEXT[] NOT NULL DEFAULT '{}',
  exclude_tokens TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (set_id, key)
);

CREATE INDEX basket_items_set_id_idx ON public.basket_items (set_id);
CREATE INDEX basket_items_set_enabled_idx ON public.basket_items (set_id, enabled);

GRANT SELECT ON public.basket_items TO anon, authenticated;
GRANT ALL ON public.basket_items TO service_role;

ALTER TABLE public.basket_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "basket_items read all"
  ON public.basket_items FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "basket_items admin write"
  ON public.basket_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers (reuse public.set_updated_at if present)
CREATE TRIGGER basket_item_sets_touch
  BEFORE UPDATE ON public.basket_item_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER basket_items_touch
  BEFORE UPDATE ON public.basket_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Seed: versão 1 com os itens atuais
-- ============================================================

INSERT INTO public.basket_item_sets (version, label, active)
VALUES (1, 'Cesta básica padrão', TRUE);

WITH v1 AS (SELECT id FROM public.basket_item_sets WHERE version = 1)
INSERT INTO public.basket_items (set_id, key, label, category, quantity, patterns, exclude_tokens, enabled, sort_order)
SELECT v1.id, x.key, x.label, x.category, 1, x.patterns, x.exclude_tokens, TRUE, x.sort_order
FROM v1, (VALUES
  ('arroz',    'Arroz',              'graos',      ARRAY['arroz'],                                                       ARRAY['doce'],                              1),
  ('feijao',   'Feijão',             'graos',      ARRAY['feijao'],                                                      ARRAY[]::text[],                            2),
  ('oleo',     'Óleo de soja',       'mercearia',  ARRAY['oleo de soja','oleo soja'],                                    ARRAY[]::text[],                            3),
  ('acucar',   'Açúcar',             'graos',      ARRAY['acucar'],                                                      ARRAY[]::text[],                            4),
  ('cafe',     'Café',               'mercearia',  ARRAY['cafe'],                                                        ARRAY['achocolatado'],                      5),
  ('leite',    'Leite',              'laticinios', ARRAY['leite'],                                                       ARRAY['condensado','po','pó','coco'],       6),
  ('macarrao', 'Macarrão',           'graos',      ARRAY['macarrao','espaguete','espaghetti'],                           ARRAY[]::text[],                            7),
  ('farinha',  'Farinha de trigo',   'graos',      ARRAY['farinha de trigo','farinha trigo'],                            ARRAY[]::text[],                            8),
  ('sal',      'Sal',                'mercearia',  ARRAY['sal refinado','sal grosso','sal iodado','sal 1kg','sal comum'],ARRAY[]::text[],                            9),
  ('molho',    'Molho de tomate',    'mercearia',  ARRAY['molho de tomate','extrato de tomate'],                         ARRAY[]::text[],                           10),
  ('sabao',    'Sabão em pó',        'limpeza',    ARRAY['sabao em po','sabao po'],                                      ARRAY[]::text[],                           11),
  ('papel',    'Papel higiênico',    'higiene',    ARRAY['papel higienico'],                                             ARRAY[]::text[],                           12),
  ('manteiga', 'Manteiga/Margarina', 'laticinios', ARRAY['manteiga','margarina'],                                        ARRAY[]::text[],                           13),
  ('ovos',     'Ovos',               'laticinios', ARRAY['ovo','ovos'],                                                  ARRAY[]::text[],                           14)
) AS x(key, label, category, patterns, exclude_tokens, sort_order);