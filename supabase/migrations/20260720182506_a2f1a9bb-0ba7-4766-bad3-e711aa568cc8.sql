
-- 1) product_catalog.product_key alinhado ao normalize_product_key(display_name)
ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS product_key TEXT;

UPDATE public.product_catalog
SET product_key = public.normalize_product_key(display_name)
WHERE product_key IS DISTINCT FROM public.normalize_product_key(display_name);

CREATE INDEX IF NOT EXISTS idx_product_catalog_product_key
  ON public.product_catalog (product_key);

CREATE INDEX IF NOT EXISTS idx_product_catalog_product_key_trgm
  ON public.product_catalog USING gin (product_key public.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.tg_catalog_set_product_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.product_key := public.normalize_product_key(NEW.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalog_set_product_key ON public.product_catalog;
CREATE TRIGGER trg_catalog_set_product_key
BEFORE INSERT OR UPDATE OF display_name ON public.product_catalog
FOR EACH ROW EXECUTE FUNCTION public.tg_catalog_set_product_key();

-- 2) Índices de performance em scans para busca por preço/data
CREATE INDEX IF NOT EXISTS idx_scans_saved_price_created
  ON public.scans (created_at DESC)
  WHERE status = 'salvo' AND user_id IS NULL AND price_captured IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scans_norm_key_saved
  ON public.scans (public.normalize_product_key(product_name))
  WHERE status = 'salvo' AND user_id IS NULL AND price_captured IS NOT NULL;

-- 3) Recomputar product_price_stats para todos os produtos
SELECT public.refresh_product_price_stats_all();
