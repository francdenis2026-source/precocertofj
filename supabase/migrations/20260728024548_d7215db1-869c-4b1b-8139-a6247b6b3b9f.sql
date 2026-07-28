CREATE TABLE public.favorite_establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, establishment_id)
);

CREATE INDEX idx_favorite_establishments_user ON public.favorite_establishments(user_id);
CREATE INDEX idx_favorite_establishments_est ON public.favorite_establishments(establishment_id);

GRANT SELECT, INSERT, DELETE ON public.favorite_establishments TO authenticated;
GRANT ALL ON public.favorite_establishments TO service_role;

ALTER TABLE public.favorite_establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own favorite establishments"
  ON public.favorite_establishments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own favorite establishments"
  ON public.favorite_establishments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own favorite establishments"
  ON public.favorite_establishments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);