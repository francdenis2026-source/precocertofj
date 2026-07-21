
CREATE OR REPLACE FUNCTION public.enqueue_catalog_image_refresh_internal(
  _force boolean DEFAULT true,
  _older_than_days integer DEFAULT 30
)
RETURNS TABLE(enqueued integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_cutoff timestamptz := now() - make_interval(days => GREATEST(_older_than_days, 0));
BEGIN
  WITH scan_counts AS (
    SELECT public.normalize_product_key(s.product_name) AS nk, COUNT(*)::int AS c
    FROM public.scans s
    WHERE s.product_name IS NOT NULL
    GROUP BY 1
  ),
  candidates AS (
    SELECT pc.id AS catalog_id,
           COALESCE(sc.c, 0) AS priority
    FROM public.product_catalog pc
    LEFT JOIN scan_counts sc
      ON sc.nk = public.normalize_product_key(pc.display_name)
    WHERE (_force OR pc.image_url IS NULL)
      AND (_older_than_days <= 0 OR pc.updated_at <= v_cutoff OR pc.image_url IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.catalog_image_jobs j
        WHERE j.catalog_id = pc.id AND j.status IN ('pending','processing')
      )
  ),
  inserted AS (
    INSERT INTO public.catalog_image_jobs (catalog_id, priority, status)
    SELECT catalog_id, priority, 'pending' FROM candidates
    RETURNING id
  )
  SELECT COUNT(*)::int INTO v_count FROM inserted;
  RETURN QUERY SELECT v_count;
END;
$$;

-- Só service_role pode chamar (não expõe a anon/authenticated).
REVOKE ALL ON FUNCTION public.enqueue_catalog_image_refresh_internal(boolean, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_catalog_image_refresh_internal(boolean, integer) FROM anon;
REVOKE ALL ON FUNCTION public.enqueue_catalog_image_refresh_internal(boolean, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_catalog_image_refresh_internal(boolean, integer) TO service_role;
