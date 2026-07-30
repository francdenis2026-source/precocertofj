-- 1) Stats sem escrita no caminho de leitura
CREATE OR REPLACE FUNCTION public.platform_public_stats()
RETURNS TABLE(establishments integer, price_drops_7d integer, active_comparisons integer, unique_products integer, avg_savings numeric, total_savings numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.establishments, c.price_drops_7d, c.active_comparisons,
         c.unique_products, c.avg_savings, c.total_savings
  FROM public.platform_stats_cache c
  WHERE c.id
  UNION ALL
  SELECT f.establishments, f.price_drops_7d, f.active_comparisons,
         f.unique_products, f.avg_savings, f.total_savings
  FROM public.platform_public_stats_compute() f
  WHERE NOT EXISTS (SELECT 1 FROM public.platform_stats_cache)
  LIMIT 1;
$function$;

-- 2) Feed público de scans
CREATE INDEX IF NOT EXISTS idx_scans_public_feed
  ON public.scans (status, establishment_id, created_at DESC)
  INCLUDE (product_name, price_captured)
  WHERE user_id IS NULL;

-- 3) Índices para foreign keys sem cobertura
CREATE INDEX IF NOT EXISTS idx_collab_sub_reviewed_by ON public.collaborator_submissions (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_establishments_created_by ON public.establishments (created_by);
CREATE INDEX IF NOT EXISTS idx_favorite_items_catalog ON public.favorite_items (catalog_id);
CREATE INDEX IF NOT EXISTS idx_finance_sched_category ON public.finance_scheduled (category_id);
CREATE INDEX IF NOT EXISTS idx_finance_sched_tx ON public.finance_scheduled (completed_transaction_id);
CREATE INDEX IF NOT EXISTS idx_finance_sched_list ON public.finance_scheduled (list_id);
CREATE INDEX IF NOT EXISTS idx_license_codes_created_by ON public.license_codes (created_by);
CREATE INDEX IF NOT EXISTS idx_license_codes_plan ON public.license_codes (plan_id);
CREATE INDEX IF NOT EXISTS idx_pin_reset_user ON public.pin_reset_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_pas_establishment ON public.price_alert_subscriptions (establishment_id);
CREATE INDEX IF NOT EXISTS idx_price_reports_resolved_by ON public.price_reports (resolved_by);
CREATE INDEX IF NOT EXISTS idx_blocklist_created_by ON public.product_blocklist (created_by);
CREATE INDEX IF NOT EXISTS idx_pca_actor ON public.product_catalog_audit (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_jobs_receipt ON public.receipt_jobs (receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_jobs_sug_est ON public.receipt_jobs (suggested_establishment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON public.receipts (created_by);
CREATE INDEX IF NOT EXISTS idx_scans_verified_by ON public.scans (verified_by);
CREATE INDEX IF NOT EXISTS idx_shared_comparisons_user ON public.shared_comparisons (user_id);
CREATE INDEX IF NOT EXISTS idx_sba_establishment ON public.store_basket_alerts (establishment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_subscriber ON public.webhook_events (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_catalog_sug_reviewed_by ON public.catalog_suggestions (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_checkout_orders_coupon ON public.checkout_orders (coupon_id);
CREATE INDEX IF NOT EXISTS idx_checkout_orders_license ON public.checkout_orders (license_code_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_by ON public.import_batches (created_by);
CREATE INDEX IF NOT EXISTS idx_import_items_scan ON public.import_items (scan_id);
CREATE INDEX IF NOT EXISTS idx_catalog_sug_catalog ON public.catalog_suggestions (product_catalog_id);
CREATE INDEX IF NOT EXISTS idx_esq_license ON public.email_send_queue (license_code_id);
CREATE INDEX IF NOT EXISTS idx_esq_webhook ON public.email_send_queue (webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_created_by ON public.blocked_ips (created_by);
CREATE INDEX IF NOT EXISTS idx_pph_changed_by ON public.product_price_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_import_batches_establishment ON public.import_batches (establishment_id);
CREATE INDEX IF NOT EXISTS idx_basket_item_sets_created_by ON public.basket_item_sets (created_by);

-- 4) Índices nunca usados (custo de escrita sem benefício)
DROP INDEX IF EXISTS public.idx_scans_public_price_name;
DROP INDEX IF EXISTS public.idx_pcc_min_price;
DROP INDEX IF EXISTS public.idx_scans_receipt;
DROP INDEX IF EXISTS public.idx_scans_market_name;
DROP INDEX IF EXISTS public.idx_product_price_stats_updated_at;
DROP INDEX IF EXISTS public.idx_pca_catalog_field_created;