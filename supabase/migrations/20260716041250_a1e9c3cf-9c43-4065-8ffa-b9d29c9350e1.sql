
DELETE FROM public.catalog_image_jobs WHERE status IN ('failed','processing');
INSERT INTO public.catalog_image_jobs (catalog_id, status, attempts)
SELECT pc.id, 'pending', 0
FROM public.product_catalog pc
WHERE pc.image_url IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.catalog_image_jobs j
    WHERE j.catalog_id = pc.id AND j.status = 'pending'
  );
