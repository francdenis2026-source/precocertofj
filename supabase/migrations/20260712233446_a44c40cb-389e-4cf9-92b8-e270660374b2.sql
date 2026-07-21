
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.product_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  normalized_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  brand TEXT,
  default_unit TEXT,
  barcode TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_catalog_barcode ON public.product_catalog(barcode);

GRANT SELECT ON public.product_catalog TO anon, authenticated;
GRANT ALL ON public.product_catalog TO service_role;

ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product catalog"
  ON public.product_catalog FOR SELECT USING (true);

CREATE POLICY "Admins manage product catalog"
  ON public.product_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_product_catalog_updated_at
  BEFORE UPDATE ON public.product_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.product_catalog (normalized_name, display_name, brand, default_unit, barcode, image_url) VALUES
('IOGURTE BOB TRADICIONAL CHOCOLATE C/ DISQUETE 125G BATAVINHO', 'Iogurte Batavinho Bob Chocolate 125g', 'Batavo', 'UN', '41216', 'https://qqljafhdlabzhoptasrz.supabase.co/storage/v1/object/public/logos/products/iogurte-batavinho-125g.jpg'),
('FRANGO SABBOR KG', 'Frango Sabbor', 'Sabbor', 'KG', '25898', 'https://qqljafhdlabzhoptasrz.supabase.co/storage/v1/object/public/logos/products/frango-sabbor.jpg'),
('POLPA SOFRUTAS MARACUJA 350G', 'Polpa Sofrutas Maracujá 350g', 'Sofrutas', 'UN', '19073', 'https://qqljafhdlabzhoptasrz.supabase.co/storage/v1/object/public/logos/products/polpa-sofrutas-maracuja-350g.jpg'),
('PRESUNTO COZIDO SEARA FATIADO DISFRI KG', 'Presunto Cozido Seara Fatiado', 'Seara', 'KG', NULL, 'https://qqljafhdlabzhoptasrz.supabase.co/storage/v1/object/public/logos/products/presunto-cozido-seara.jpg'),
('PRESUNTO LEVISSIMO SEARA A VACUO KG', 'Presunto Levíssimo Seara a Vácuo', 'Seara', 'KG', '36783', 'https://qqljafhdlabzhoptasrz.supabase.co/storage/v1/object/public/logos/products/presunto-levissimo-seara.jpg'),
('QUEIJO MUSSARELA ITALAC FATIADO 150G', 'Queijo Mussarela Italac Fatiado 150g', 'Italac', 'UN', '36482', 'https://qqljafhdlabzhoptasrz.supabase.co/storage/v1/object/public/logos/products/queijo-mussarela-italac-150g.jpg');
