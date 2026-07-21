-- Restaurar capas de produtos removidas por engano (fetch da última entrada válida no audit)
WITH last_img AS (
  SELECT DISTINCT ON (a.catalog_id)
    a.catalog_id,
    a.new_value AS image_url,
    a.action
  FROM public.product_catalog_audit a
  WHERE a.field = 'image_url'
    AND a.new_value IS NOT NULL
    AND a.action IN ('image_upload','image_web')
  ORDER BY a.catalog_id, a.created_at DESC
)
UPDATE public.product_catalog pc
SET image_url = li.image_url,
    image_source = CASE WHEN li.action = 'image_upload' THEN 'upload' ELSE 'web' END,
    image_search_found = true,
    image_search_attempted_at = now(),
    updated_at = now()
FROM last_img li
WHERE li.catalog_id = pc.id
  AND pc.image_url IS NULL;

-- Log da restauração no audit
INSERT INTO public.product_catalog_audit (catalog_id, action, field, old_value, new_value, metadata, result)
SELECT pc.id, 'update', 'image_url', NULL, pc.image_url,
       jsonb_build_object('reason','restore_from_audit_history'), 'success'
FROM public.product_catalog pc
WHERE pc.image_url IS NOT NULL
  AND pc.updated_at > now() - interval '1 minute'
  AND EXISTS (
    SELECT 1 FROM public.product_catalog_audit a
    WHERE a.catalog_id = pc.id AND a.field='image_url' AND a.new_value = pc.image_url
      AND a.action IN ('image_upload','image_web')
  );