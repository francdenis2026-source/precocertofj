ALTER TABLE public.catalog_image_jobs
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS catalog_image_jobs_provider_idx
  ON public.catalog_image_jobs (provider);

CREATE OR REPLACE FUNCTION public.catalog_image_job_provider_stats()
RETURNS TABLE(
  provider TEXT,
  done INTEGER,
  failed INTEGER,
  total INTEGER,
  avg_duration_ms NUMERIC,
  total_attempts INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(provider, 'unknown') AS provider,
    COUNT(*) FILTER (WHERE status = 'done')::int AS done,
    COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
    COUNT(*)::int AS total,
    ROUND(AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0)::numeric AS avg_duration_ms,
    COALESCE(SUM(attempts), 0)::int AS total_attempts
  FROM public.catalog_image_jobs
  WHERE status IN ('done','failed')
  GROUP BY COALESCE(provider, 'unknown')
  ORDER BY total DESC;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_image_job_provider_stats() TO authenticated, service_role;