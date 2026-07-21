ALTER TABLE public.favorite_items
  ADD COLUMN IF NOT EXISTS preferred_establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS favorite_items_preferred_establishment_idx
  ON public.favorite_items(preferred_establishment_id);