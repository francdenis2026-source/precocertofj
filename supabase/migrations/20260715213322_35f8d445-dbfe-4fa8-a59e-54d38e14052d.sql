
CREATE TABLE IF NOT EXISTS public.receipt_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','extracting','ready_for_review','importing','done','failed','cancelled')),
  progress SMALLINT NOT NULL DEFAULT 0,
  step_label TEXT,
  image_url TEXT,
  extract JSONB,
  suggested_establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_jobs TO authenticated;
GRANT ALL ON public.receipt_jobs TO service_role;

ALTER TABLE public.receipt_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin owns own receipt_jobs"
  ON public.receipt_jobs
  FOR ALL
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_receipt_jobs_updated_at
  BEFORE UPDATE ON public.receipt_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_receipt_jobs_user_created ON public.receipt_jobs(user_id, created_at DESC);
CREATE INDEX idx_receipt_jobs_status ON public.receipt_jobs(status) WHERE status IN ('queued','extracting','importing');
