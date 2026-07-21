
CREATE TABLE public.favorite_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_id UUID NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, catalog_id)
);
CREATE INDEX favorite_items_user_idx ON public.favorite_items(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_items TO authenticated;
GRANT ALL ON public.favorite_items TO service_role;
ALTER TABLE public.favorite_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own favorite items"
  ON public.favorite_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.favorite_markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, market_name)
);
CREATE INDEX favorite_markets_user_idx ON public.favorite_markets(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_markets TO authenticated;
GRANT ALL ON public.favorite_markets TO service_role;
ALTER TABLE public.favorite_markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own favorite markets"
  ON public.favorite_markets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
