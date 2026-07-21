
CREATE OR REPLACE FUNCTION public.search_scans_unaccented(_q text, _limit int DEFAULT 300)
RETURNS TABLE(
  product_name text,
  price_captured numeric,
  market_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT s.product_name, s.price_captured, s.market_name, s.created_at
  FROM public.scans s
  WHERE s.price_captured IS NOT NULL
    AND s.product_name IS NOT NULL
    AND public.unaccent(lower(s.product_name)) LIKE '%' || public.unaccent(lower(coalesce(_q, ''))) || '%'
  ORDER BY s.created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 500);
$$;

CREATE OR REPLACE FUNCTION public.search_catalog_suggestions(_q text, _limit int DEFAULT 8)
RETURNS TABLE(
  id uuid,
  display_name text,
  brand text,
  category text,
  image_url text
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT pc.id, pc.display_name, pc.brand, pc.category, pc.image_url
  FROM public.product_catalog pc
  WHERE public.unaccent(lower(pc.display_name)) LIKE '%' || public.unaccent(lower(coalesce(_q, ''))) || '%'
     OR public.unaccent(lower(coalesce(pc.brand, ''))) LIKE '%' || public.unaccent(lower(coalesce(_q, ''))) || '%'
  ORDER BY
    -- prefix match ranks higher
    CASE
      WHEN public.unaccent(lower(pc.display_name)) LIKE public.unaccent(lower(coalesce(_q, ''))) || '%' THEN 0
      ELSE 1
    END,
    length(pc.display_name) ASC
  LIMIT LEAST(GREATEST(_limit, 1), 20);
$$;

GRANT EXECUTE ON FUNCTION public.search_scans_unaccented(text, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_catalog_suggestions(text, int) TO anon, authenticated, service_role;
