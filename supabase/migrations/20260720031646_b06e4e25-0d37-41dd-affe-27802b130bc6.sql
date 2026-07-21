
CREATE OR REPLACE FUNCTION public.ensure_finance_food_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  INSERT INTO public.finance_categories (user_id, name, slug, kind, color, icon, sort_order, is_default)
  SELECT uid, v.name, v.slug, 'market'::text, v.color, v.icon, v.sort_order, false
  FROM (VALUES
    ('Açougue',   'acougue',   '#DC2626', 'beef',      11),
    ('Padaria',   'padaria',   '#D97706', 'croissant', 12),
    ('Hortifruti','hortifruti','#16A34A', 'apple',     13),
    ('Feira',     'feira',     '#22C55E', 'carrot',    14)
  ) AS v(name, slug, color, icon, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.finance_categories fc
    WHERE fc.user_id = uid AND fc.slug = v.slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_finance_food_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_finance_food_categories() TO authenticated;
