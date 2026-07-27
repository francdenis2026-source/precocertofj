ALTER TABLE public.establishments DROP CONSTRAINT establishments_kind_check;
ALTER TABLE public.establishments ADD CONSTRAINT establishments_kind_check
  CHECK (kind = ANY (ARRAY['mercado','atacado','hortifruti','farmacia','conveniencia','acougue','outro']));
UPDATE public.establishments SET kind='acougue' WHERE name='Recanto da Carne';