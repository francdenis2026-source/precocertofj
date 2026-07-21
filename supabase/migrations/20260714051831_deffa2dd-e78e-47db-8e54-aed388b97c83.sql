
-- 1) Auto-deduplication trigger for scans (public + salvo, same establishment/product/size/price)
CREATE OR REPLACE FUNCTION public.dedupe_scan_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_size record;
BEGIN
  IF NEW.establishment_id IS NULL OR NEW.status <> 'salvo' OR NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_key := public.normalize_product_key(NEW.product_name);
  IF v_key = '' THEN
    RETURN NEW;
  END IF;

  SELECT size_value, size_unit INTO v_size FROM public.extract_product_size(NEW.product_name);

  -- Remove older duplicates: same store + same normalized product + same size + same price (rounded)
  DELETE FROM public.scans s
  USING public.extract_product_size(s.product_name) sz
  WHERE s.id <> NEW.id
    AND s.establishment_id = NEW.establishment_id
    AND s.status = 'salvo'
    AND s.user_id IS NULL
    AND public.normalize_product_key(s.product_name) = v_key
    AND COALESCE(sz.size_value, -1) = COALESCE(v_size.size_value, -1)
    AND sz.size_unit = v_size.size_unit
    AND ROUND(COALESCE(s.price_captured, 0)::numeric, 2) = ROUND(COALESCE(NEW.price_captured, 0)::numeric, 2)
    AND s.created_at <= NEW.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dedupe_scan_on_insert ON public.scans;
CREATE TRIGGER trg_dedupe_scan_on_insert
AFTER INSERT OR UPDATE OF product_name, price_captured, establishment_id, status
ON public.scans
FOR EACH ROW
EXECUTE FUNCTION public.dedupe_scan_on_insert();

-- 2) Catalog image job queue
CREATE TABLE IF NOT EXISTS public.catalog_image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed','cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  image_url TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT catalog_image_jobs_unique_open UNIQUE (catalog_id, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_catalog_image_jobs_status_priority
  ON public.catalog_image_jobs (status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_catalog_image_jobs_catalog ON public.catalog_image_jobs (catalog_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_image_jobs TO authenticated;
GRANT ALL ON public.catalog_image_jobs TO service_role;

ALTER TABLE public.catalog_image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage catalog image jobs"
  ON public.catalog_image_jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_catalog_image_jobs_updated_at ON public.catalog_image_jobs;
CREATE TRIGGER trg_catalog_image_jobs_updated_at
BEFORE UPDATE ON public.catalog_image_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Enqueue helper: adds pending jobs for catalog items without image, prioritized by scan count
CREATE OR REPLACE FUNCTION public.enqueue_catalog_image_jobs()
RETURNS TABLE(enqueued INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
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
    WHERE pc.image_url IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.catalog_image_jobs j
        WHERE j.catalog_id = pc.id
          AND j.status IN ('pending','processing')
      )
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

-- 4) Stats function
CREATE OR REPLACE FUNCTION public.catalog_image_job_stats()
RETURNS TABLE(
  pending INTEGER,
  processing INTEGER,
  done INTEGER,
  failed INTEGER,
  cancelled INTEGER,
  total INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::int,
    COUNT(*) FILTER (WHERE status = 'processing')::int,
    COUNT(*) FILTER (WHERE status = 'done')::int,
    COUNT(*) FILTER (WHERE status = 'failed')::int,
    COUNT(*) FILTER (WHERE status = 'cancelled')::int,
    COUNT(*)::int
  FROM public.catalog_image_jobs;
$$;
