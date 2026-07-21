
-- =========================================================
-- FINANCE MODULE: categories, transactions, scheduled
-- =========================================================

-- 1) finance_categories ------------------------------------
CREATE TABLE public.finance_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'variable' CHECK (kind IN ('fixed','variable','utility','fuel','gas','market','other')),
  color TEXT,
  icon TEXT,
  monthly_budget NUMERIC(12,2),
  alert_threshold NUMERIC(4,2) DEFAULT 0.80 CHECK (alert_threshold IS NULL OR (alert_threshold > 0 AND alert_threshold <= 2)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories TO authenticated;
GRANT ALL ON public.finance_categories TO service_role;

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own finance_categories - select" ON public.finance_categories
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own finance_categories - insert" ON public.finance_categories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own finance_categories - update" ON public.finance_categories
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own finance_categories - delete" ON public.finance_categories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_finance_categories_user ON public.finance_categories(user_id);

CREATE TRIGGER trg_finance_categories_updated
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) finance_transactions ----------------------------------
CREATE TABLE public.finance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash','debit','credit','pix','transfer','voucher','other')),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO authenticated;
GRANT ALL ON public.finance_transactions TO service_role;

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own finance_transactions - select" ON public.finance_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own finance_transactions - insert" ON public.finance_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own finance_transactions - update" ON public.finance_transactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own finance_transactions - delete" ON public.finance_transactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_finance_transactions_user_date ON public.finance_transactions(user_id, occurred_on DESC);
CREATE INDEX idx_finance_transactions_category ON public.finance_transactions(category_id);
CREATE INDEX idx_finance_transactions_establishment ON public.finance_transactions(establishment_id);

CREATE TRIGGER trg_finance_transactions_updated
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) finance_scheduled -------------------------------------
CREATE TABLE public.finance_scheduled (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2),
  description TEXT NOT NULL,
  list_id UUID REFERENCES public.shopping_lists(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped')),
  completed_transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_scheduled TO authenticated;
GRANT ALL ON public.finance_scheduled TO service_role;

ALTER TABLE public.finance_scheduled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own finance_scheduled - select" ON public.finance_scheduled
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own finance_scheduled - insert" ON public.finance_scheduled
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own finance_scheduled - update" ON public.finance_scheduled
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own finance_scheduled - delete" ON public.finance_scheduled
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_finance_scheduled_user_date ON public.finance_scheduled(user_id, due_date);

CREATE TRIGGER trg_finance_scheduled_updated
  BEFORE UPDATE ON public.finance_scheduled
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) View: monthly summary ---------------------------------
CREATE OR REPLACE VIEW public.finance_monthly_summary_v
WITH (security_invoker = true) AS
SELECT
  t.user_id,
  date_trunc('month', t.occurred_on)::date AS month,
  t.category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.kind AS category_kind,
  c.color AS category_color,
  COUNT(*)::int AS entries,
  SUM(t.amount)::numeric AS total
FROM public.finance_transactions t
LEFT JOIN public.finance_categories c ON c.id = t.category_id
GROUP BY t.user_id, date_trunc('month', t.occurred_on), t.category_id, c.name, c.slug, c.kind, c.color;

GRANT SELECT ON public.finance_monthly_summary_v TO authenticated;
GRANT SELECT ON public.finance_monthly_summary_v TO service_role;

-- 5) Seed default categories function ----------------------
CREATE OR REPLACE FUNCTION public.finance_seed_default_categories()
RETURNS SETOF public.finance_categories
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.finance_categories (user_id, name, slug, kind, color, icon, is_default, sort_order)
  VALUES
    (v_user, 'Alimentação',  'alimentacao', 'market',  '#2E7D6B', 'shopping-basket', true, 10),
    (v_user, 'Combustível',  'combustivel', 'fuel',    '#B08948', 'fuel',            true, 20),
    (v_user, 'Gás',          'gas',         'gas',     '#8C6A2F', 'flame',           true, 30),
    (v_user, 'Energia',      'energia',     'utility', '#3B6FA0', 'zap',             true, 40),
    (v_user, 'Água',         'agua',        'utility', '#4A90A4', 'droplets',        true, 50),
    (v_user, 'Farmácia',     'farmacia',    'variable','#B4536F', 'pill',            true, 60),
    (v_user, 'Casa',         'casa',        'fixed',   '#6B7280', 'home',            true, 70),
    (v_user, 'Transporte',   'transporte',  'variable','#4B7A8A', 'car',             true, 80),
    (v_user, 'Lazer',        'lazer',       'variable','#A88540', 'sparkles',        true, 90),
    (v_user, 'Outros',       'outros',      'other',   '#7A8290', 'more-horizontal', true, 100)
  ON CONFLICT (user_id, slug) DO NOTHING;

  RETURN QUERY
    SELECT * FROM public.finance_categories WHERE user_id = v_user ORDER BY sort_order, name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finance_seed_default_categories() TO authenticated;
