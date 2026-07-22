
CREATE TABLE public.favorite_neighborhoods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  neighborhood_key TEXT NOT NULL,
  neighborhood_name TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, neighborhood_key)
);

CREATE INDEX idx_favorite_neighborhoods_user ON public.favorite_neighborhoods(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_neighborhoods TO authenticated;
GRANT ALL ON public.favorite_neighborhoods TO service_role;

ALTER TABLE public.favorite_neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own favorite neighborhoods"
  ON public.favorite_neighborhoods
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
