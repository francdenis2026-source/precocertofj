ALTER TABLE public.scans ENABLE TRIGGER trg_refresh_comparison_cache;
ALTER TABLE public.scans ENABLE TRIGGER trg_refresh_price_stats;
ALTER TABLE public.scans ENABLE TRIGGER trg_record_price_history_on_scan;
ALTER TABLE public.scans ENABLE TRIGGER trg_dedupe_scan_on_insert;
ALTER TABLE public.scans ENABLE TRIGGER tg_check_price_alert_subs;
DROP TABLE IF EXISTS public.scans_import_staging;