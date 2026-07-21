CREATE TABLE public.store_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  store_name text NOT NULL,
  cart jsonb NOT NULL,
  comparison jsonb,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_quotes TO authenticated;
GRANT ALL ON public.store_quotes TO service_role;

ALTER TABLE public.store_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own quotes"
  ON public.store_quotes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own quotes"
  ON public.store_quotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own quotes"
  ON public.store_quotes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX store_quotes_user_created_idx
  ON public.store_quotes (user_id, created_at DESC);