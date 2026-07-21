
CREATE TABLE public.search_synonym_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical TEXT NOT NULL UNIQUE,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  exclude_tokens TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_synonym_groups TO anon, authenticated;
GRANT ALL ON public.search_synonym_groups TO service_role;

ALTER TABLE public.search_synonym_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active synonym groups"
  ON public.search_synonym_groups FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert synonym groups"
  ON public.search_synonym_groups FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update synonym groups"
  ON public.search_synonym_groups FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete synonym groups"
  ON public.search_synonym_groups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_search_synonym_groups_updated_at
  BEFORE UPDATE ON public.search_synonym_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed com os grupos atualmente hardcoded (não sobrescreve se já existir)
INSERT INTO public.search_synonym_groups (canonical, synonyms, exclude_tokens) VALUES
  ('sal',
   ARRAY['sal','sal de cozinha','sal refinado','sal grosso','sal moido','sal marinho','sal iodado'],
   ARRAY['margarina','manteiga','biscoito','bolacha','salgadinho','salsicha','aji','tempero','salgado','amendoim','batata','pipoca','requeijao','queijo']),
  ('acucar',
   ARRAY['acucar','acucar refinado','acucar cristal','acucar demerara','acucar mascavo'],
   ARRAY['adocante','achocolatado','biscoito','bolacha','doce']),
  ('oleo',
   ARRAY['oleo','oleo de soja','oleo de girassol','oleo de milho','oleo vegetal'],
   ARRAY['azeite','sardinha','atum','conserva']),
  ('cafe',
   ARRAY['cafe','cafe em po','cafe torrado','cafe moido','cafe soluvel'],
   ARRAY['cafeteira','filtro','capsula','bombom','biscoito']),
  ('leite',
   ARRAY['leite','leite integral','leite desnatado','leite semidesnatado','leite uht'],
   ARRAY['condensado','creme de leite','chocolate','achocolatado','biscoito','doce de leite','leite de coco','leite em po']),
  ('arroz',
   ARRAY['arroz','arroz branco','arroz parboilizado','arroz integral','arroz agulhinha'],
   ARRAY['arrozina','biscoito','bebida']),
  ('feijao',
   ARRAY['feijao','feijao carioca','feijao preto','feijao fradinho'],
   ARRAY['biscoito','tempero'])
ON CONFLICT (canonical) DO NOTHING;
