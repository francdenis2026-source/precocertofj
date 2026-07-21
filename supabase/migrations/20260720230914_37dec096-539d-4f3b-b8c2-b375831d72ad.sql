
-- Grants (não existiam)
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

-- Policies para admin (CRUD)
DROP POLICY IF EXISTS "plans admin read all" ON public.plans;
CREATE POLICY "plans admin read all" ON public.plans
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "plans admin insert" ON public.plans;
CREATE POLICY "plans admin insert" ON public.plans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "plans admin update" ON public.plans;
CREATE POLICY "plans admin update" ON public.plans
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "plans admin delete" ON public.plans;
CREATE POLICY "plans admin delete" ON public.plans
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed dos 4 planos padrão (idempotente)
INSERT INTO public.plans (id, name, cycle, days, price, original_price, description, features, active, highlight)
VALUES
  ('trial-30', 'Teste Grátis', 'trial', 30, 0, NULL,
   'Experimente todos os recursos por 30 dias, sem cartão.',
   '["Acesso completo","Comparador ilimitado","Alertas de preço","Suporte por e-mail"]'::jsonb,
   true, false),
  ('monthly-30', 'Mensal', 'monthly', 30, 19.9, NULL,
   'Ideal para quem quer economizar todo mês.',
   '["Tudo do Teste Grátis","Histórico de preços","Exportar listas","Sem anúncios"]'::jsonb,
   true, false),
  ('semester-180', 'Semestral', 'semester', 180, 99.9, 119.4,
   'Economize 16% pagando 6 meses.',
   '["Tudo do Mensal","Prioridade nos alertas","Relatórios mensais","2 meses grátis"]'::jsonb,
   true, true),
  ('yearly-365', 'Anual', 'yearly', 365, 179.9, 238.8,
   'Economize 24% pagando o ano inteiro.',
   '["Tudo do Semestral","Selo de fundador","Beta de novos recursos","Suporte VIP"]'::jsonb,
   true, false)
ON CONFLICT (id) DO NOTHING;
