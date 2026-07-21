
-- 1) Add status to scans
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'salvo'
    CHECK (status IN ('capturado','revisado','salvo'));

-- 2) shared_comparisons table
CREATE TABLE IF NOT EXISTS public.shared_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  image_url TEXT,
  market_name TEXT,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shared_comparisons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_comparisons TO authenticated;
GRANT ALL ON public.shared_comparisons TO service_role;

ALTER TABLE public.shared_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired shares"
  ON public.shared_comparisons FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Owner can insert own share"
  ON public.shared_comparisons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own share"
  ON public.shared_comparisons FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own share"
  ON public.shared_comparisons FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS shared_comparisons_expires_idx
  ON public.shared_comparisons (expires_at);

CREATE TRIGGER set_shared_comparisons_updated_at
  BEFORE UPDATE ON public.shared_comparisons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
