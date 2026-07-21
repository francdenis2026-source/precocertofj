
ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS image_source TEXT
    CHECK (image_source IN ('web','upload','ai')),
  ADD COLUMN IF NOT EXISTS image_search_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_search_found BOOLEAN;

-- Backfill: produtos com imagem — heurística pelo path
UPDATE public.product_catalog
   SET image_source = 'ai',
       image_search_attempted_at = COALESCE(image_search_attempted_at, updated_at),
       image_search_found = COALESCE(image_search_found, FALSE)
 WHERE image_url IS NOT NULL
   AND image_url LIKE '%-ai-%'
   AND image_source IS NULL;

UPDATE public.product_catalog
   SET image_source = 'web',
       image_search_attempted_at = COALESCE(image_search_attempted_at, updated_at),
       image_search_found = TRUE
 WHERE image_url IS NOT NULL
   AND image_url NOT LIKE '%-ai-%'
   AND image_source IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_catalog_needs_ai
  ON public.product_catalog (image_search_attempted_at)
  WHERE image_url IS NULL;
