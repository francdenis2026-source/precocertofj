
ALTER TABLE public.shopping_list_items
  ALTER COLUMN catalog_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchased_price NUMERIC;

ALTER TABLE public.shopping_list_items
  DROP CONSTRAINT IF EXISTS shopping_list_items_has_ref;
ALTER TABLE public.shopping_list_items
  ADD CONSTRAINT shopping_list_items_has_ref
  CHECK (catalog_id IS NOT NULL OR (display_name IS NOT NULL AND length(trim(display_name)) > 0));

CREATE OR REPLACE FUNCTION public.ensure_finance_utility_categories()
RETURNS SETOF public.finance_categories
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.finance_categories (user_id, name, slug, kind, color, icon, is_default, sort_order)
  VALUES
    (v_user, 'Água',    'agua',    'utility', '#0EA5E9', 'droplets', true, 50),
    (v_user, 'Energia', 'energia', 'utility', '#F59E0B', 'zap',      true, 40),
    (v_user, 'Gás',     'gas',     'gas',     '#EF4444', 'flame',    true, 30),
    (v_user, 'Combustível', 'combustivel', 'fuel', '#10B981', 'fuel', true, 20)
  ON CONFLICT (user_id, slug) DO NOTHING;

  RETURN QUERY
    SELECT * FROM public.finance_categories
    WHERE user_id = v_user AND slug IN ('agua','energia','gas','combustivel')
    ORDER BY sort_order, name;
END;
$$;
