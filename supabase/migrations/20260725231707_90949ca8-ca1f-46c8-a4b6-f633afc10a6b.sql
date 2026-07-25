
REINDEX INDEX public.idx_scans_norm_key_saved;
REINDEX INDEX public.scans_product_name_trgm;
SELECT public.rebuild_comparison_cache_all();
