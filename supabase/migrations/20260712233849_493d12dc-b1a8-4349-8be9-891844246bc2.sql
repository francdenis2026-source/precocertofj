
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_catalog_barcode
  ON public.product_catalog(barcode)
  WHERE barcode IS NOT NULL;
