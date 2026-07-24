
CREATE OR REPLACE FUNCTION public.find_similar_scans_v2(
  p_name text,
  p_brand text DEFAULT NULL,
  p_size_value numeric DEFAULT NULL,
  p_size_unit text DEFAULT NULL,
  p_establishment_id uuid DEFAULT NULL,
  p_threshold real DEFAULT 0.45
)
RETURNS TABLE(
  id uuid,
  product_name text,
  price_captured numeric,
  quantity numeric,
  unit text,
  barcode text,
  similarity real,
  brand_match boolean,
  size_match boolean,
  score real
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_catalog'
AS $function$
  WITH q AS (
    SELECT
      public.normalize_product_name(coalesce(p_name,'')) AS nq,
      nullif(lower(trim(coalesce(p_brand,''))), '') AS bq,
      p_size_value AS sv,
      nullif(lower(trim(coalesce(p_size_unit,''))), '') AS su
  )
  SELECT
    s.id,
    s.product_name,
    s.price_captured,
    s.quantity,
    s.unit,
    s.barcode,
    similarity(public.normalize_product_name(s.product_name), q.nq) AS similarity,
    -- brand_match: NULL when no brand informed; TRUE when brand token found inside stored name
    CASE
      WHEN q.bq IS NULL THEN NULL
      WHEN position(q.bq in lower(coalesce(s.product_name,''))) > 0 THEN TRUE
      ELSE FALSE
    END AS brand_match,
    -- size_match: NULL when no size informed; TRUE when the numeric value appears near a unit OR matches quantity/unit columns
    CASE
      WHEN q.sv IS NULL THEN NULL
      WHEN s.quantity IS NOT NULL
           AND abs(coalesce(s.quantity,0) - q.sv) < 0.01
           AND (q.su IS NULL OR lower(coalesce(s.unit,'')) = q.su)
        THEN TRUE
      WHEN lower(coalesce(s.product_name,'')) ~ (
            '(^|[^0-9])' ||
            regexp_replace(q.sv::text, '\.0+$', '') ||
            '\s*' || coalesce(q.su, '(g|kg|ml|l|un)') || '(\s|$|[^a-z0-9])'
          )
        THEN TRUE
      ELSE FALSE
    END AS size_match,
    -- composite score: text sim + brand bonus + size bonus, penalizing when brand/size were informed but do not match
    (
      similarity(public.normalize_product_name(s.product_name), q.nq)
      + CASE
          WHEN q.bq IS NULL THEN 0
          WHEN position(q.bq in lower(coalesce(s.product_name,''))) > 0 THEN 0.15
          ELSE -0.20
        END
      + CASE
          WHEN q.sv IS NULL THEN 0
          WHEN s.quantity IS NOT NULL AND abs(coalesce(s.quantity,0) - q.sv) < 0.01
               AND (q.su IS NULL OR lower(coalesce(s.unit,'')) = q.su) THEN 0.15
          WHEN lower(coalesce(s.product_name,'')) ~ (
                '(^|[^0-9])' ||
                regexp_replace(q.sv::text, '\.0+$', '') ||
                '\s*' || coalesce(q.su, '(g|kg|ml|l|un)') || '(\s|$|[^a-z0-9])'
               ) THEN 0.10
          ELSE -0.25
        END
    )::real AS score
  FROM public.scans s, q
  WHERE s.establishment_id = p_establishment_id
    AND s.status = 'salvo'
    AND similarity(public.normalize_product_name(s.product_name), q.nq) >= p_threshold
  ORDER BY score DESC, similarity DESC
  LIMIT 5;
$function$;

GRANT EXECUTE ON FUNCTION public.find_similar_scans_v2(text, text, numeric, text, uuid, real) TO authenticated, service_role;
