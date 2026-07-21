
-- Add result tracking columns for image upload attempts (successes + failures)
ALTER TABLE public.product_catalog_audit
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS error_code text;

-- Allow the new action types used by the enriched flow
ALTER TABLE public.product_catalog_audit
  DROP CONSTRAINT IF EXISTS product_catalog_audit_action_check;

ALTER TABLE public.product_catalog_audit
  ADD CONSTRAINT product_catalog_audit_action_check
  CHECK (action = ANY (ARRAY[
    'update','image_upload','image_generated','merge','delete','create',
    'image_web','image_upload_failed','image_web_failed','image_generated_failed'
  ]));

ALTER TABLE public.product_catalog_audit
  DROP CONSTRAINT IF EXISTS product_catalog_audit_result_check;

ALTER TABLE public.product_catalog_audit
  ADD CONSTRAINT product_catalog_audit_result_check
  CHECK (result IS NULL OR result IN ('success','error'));

-- Backfill existing rows: everything already logged is a success
UPDATE public.product_catalog_audit
  SET result = 'success'
  WHERE result IS NULL;

-- Speed up per-product history queries filtered by field='image_url'
CREATE INDEX IF NOT EXISTS idx_pca_catalog_field_created
  ON public.product_catalog_audit (catalog_id, field, created_at DESC);
