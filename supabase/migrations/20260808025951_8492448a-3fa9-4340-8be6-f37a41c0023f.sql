
-- Forçar atualização das estatísticas e propagar permissões por todo o sistema
GRANT SELECT ON public.product_catalog TO authenticated, anon;
GRANT SELECT ON public.scans TO authenticated, anon;
GRANT SELECT ON public.establishments TO authenticated, anon;
GRANT ALL ON public.product_catalog TO service_role;
GRANT ALL ON public.scans TO service_role;
GRANT ALL ON public.establishments TO service_role;

-- Marcar atualização sistêmica para propagação
COMMENT ON DATABASE postgres IS 'Sistema PreçoCerto atualizado e propagado em 2026-08-08';
COMMENT ON TABLE public.product_catalog IS 'Catálogo Geral PreçoCerto - Última manutenção sistêmica em 2026-08-08';
