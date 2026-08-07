CREATE OR REPLACE FUNCTION public.search_scans_unaccented_v2(
    _q text,
    _category text DEFAULT NULL,
    _limit integer DEFAULT 100
)
RETURNS TABLE(
    product_name text,
    price_captured numeric,
    market_name text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.display_name as product_name,
        s.price_captured,
        e.name as market_name,
        s.created_at
    FROM scans s
    JOIN product_catalog pc ON s.product_id = pc.id
    JOIN establishments e ON s.establishment_id = e.id
    WHERE 
        (
            _q IS NULL OR _q = '' 
            OR to_tsvector('portuguese', unaccent(pc.display_name)) @@ to_tsquery('portuguese', unaccent(replace(_q, ' ', ' & ')))
            OR pc.display_name ILIKE '%' || _q || '%'
        )
        AND (_category IS NULL OR pc.category = _category)
    ORDER BY s.created_at DESC
    LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_scans_unaccented_v2(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_scans_unaccented_v2(text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.search_scans_unaccented_v2(text, text, integer) TO service_role;
