ALTER TABLE public.product_catalog DROP CONSTRAINT IF EXISTS product_catalog_image_source_check;
ALTER TABLE public.product_catalog ADD CONSTRAINT product_catalog_image_source_check
  CHECK (image_source IS NULL OR image_source = ANY (ARRAY['web'::text,'upload'::text,'ai'::text,'manual'::text,'url'::text]));