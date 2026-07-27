-- 1) Realtime: incluir tabelas na publicação e garantir payload completo em UPDATEs
ALTER TABLE public.establishments   REPLICA IDENTITY FULL;
ALTER TABLE public.product_catalog  REPLICA IDENTITY FULL;
ALTER TABLE public.profiles         REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='establishments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.establishments';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='product_catalog'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.product_catalog';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  END IF;
END $$;

-- 2) Cascade: ao remover um estabelecimento, remover também as capturas (scans),
--    recibos, alertas e demais registros vinculados. Mantém SET NULL apenas em
--    tabelas onde o registro do usuário deve sobreviver sem o estabelecimento
--    (favoritos, transações financeiras pessoais e sugestões de recibos em fila).
ALTER TABLE public.scans
  DROP CONSTRAINT IF EXISTS scans_establishment_id_fkey,
  ADD  CONSTRAINT scans_establishment_id_fkey
       FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE;

ALTER TABLE public.import_batches
  DROP CONSTRAINT IF EXISTS import_batches_establishment_id_fkey,
  ADD  CONSTRAINT import_batches_establishment_id_fkey
       FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE SET NULL;
