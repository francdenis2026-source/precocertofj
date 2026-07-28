CREATE OR REPLACE FUNCTION public.get_coverage_overview()
 RETURNS TABLE(establishment_id uuid, name text, produtos integer, faltando integer, cobertura_pct numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE v_total int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(DISTINCT public.normalize_product_key(s.product_name))::int INTO v_total
  FROM public.scans s
  WHERE s.status='salvo' AND s.user_id IS NULL AND s.product_name IS NOT NULL;

  RETURN QUERY
  SELECT
    e.id AS establishment_id,
    e.name AS name,
    COALESCE(x.produtos, 0)::int AS produtos,
    (v_total - COALESCE(x.produtos, 0))::int AS faltando,
    ROUND(100.0 * COALESCE(x.produtos, 0) / NULLIF(v_total, 0), 1) AS cobertura_pct
  FROM public.establishments e
  LEFT JOIN (
    SELECT s.establishment_id AS establishment_id,
           COUNT(DISTINCT public.normalize_product_key(s.product_name))::int AS produtos
    FROM public.scans s
    WHERE s.status='salvo' AND s.user_id IS NULL AND s.product_name IS NOT NULL
    GROUP BY s.establishment_id
  ) x ON x.establishment_id = e.id
  WHERE e.active = true
  ORDER BY COALESCE(x.produtos, 0) DESC, e.name ASC;
END;
$function$;