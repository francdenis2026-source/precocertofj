
-- RPC: enfileira produtos para reprocessamento de imagem.
-- _force = true → inclui produtos que JÁ TÊM image_url
-- _older_than_days → só considera produtos cuja imagem foi atualizada há mais que N dias (0 = todos)
CREATE OR REPLACE FUNCTION public.enqueue_catalog_image_refresh(
  _force boolean DEFAULT false,
  _older_than_days integer DEFAULT 0
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
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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
    WHERE (
      _force
      OR pc.image_url IS NULL
    )
    AND (
      _older_than_days <= 0
      OR pc.updated_at <= v_cutoff
      OR pc.image_url IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.catalog_image_jobs j
      WHERE j.catalog_id = pc.id
        AND j.status IN ('pending','processing')
    )
  ),
  -- Se force=true, limpa tentativas anteriores para permitir nova busca na web
  cleared AS (
    UPDATE public.product_catalog pc
    SET image_search_attempted_at = NULL,
        image_search_found = NULL
    FROM candidates c
    WHERE _force AND pc.id = c.catalog_id
    RETURNING pc.id
  ),
  inserted AS (
    INSERT INTO public.catalog_image_jobs (catalog_id, priority, status)
    SELECT catalog_id, priority, 'pending'
    FROM candidates
    RETURNING id
  )
  SELECT COUNT(*)::int INTO v_count FROM inserted;

  RETURN QUERY SELECT v_count;
END;
$$;
