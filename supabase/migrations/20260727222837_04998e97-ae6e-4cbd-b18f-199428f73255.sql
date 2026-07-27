
-- 1) Aumenta TTL do cache de 5min para 30min (menos cálculos pesados por hora)
CREATE OR REPLACE FUNCTION public.platform_public_stats()
 RETURNS TABLE(establishments integer, price_drops_7d integer, active_comparisons integer, unique_products integer, avg_savings numeric, total_savings numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cached public.platform_stats_cache%ROWTYPE;
  fresh RECORD;
BEGIN
  SELECT * INTO cached FROM public.platform_stats_cache WHERE id LIMIT 1;

  -- Cache válido por 30 minutos; refresh acontece em background via pg_cron.
  IF cached.id IS NOT NULL AND cached.computed_at > now() - interval '30 minutes' THEN
    RETURN QUERY SELECT cached.establishments, cached.price_drops_7d, cached.active_comparisons,
                        cached.unique_products, cached.avg_savings, cached.total_savings;
    RETURN;
  END IF;

  -- Fallback: se cache expirou (ex.: primeira execução), recomputa on-demand.
  SELECT * INTO fresh FROM public.platform_public_stats_compute();

  INSERT INTO public.platform_stats_cache AS c
    (id, establishments, price_drops_7d, active_comparisons, unique_products, avg_savings, total_savings, computed_at)
  VALUES (true, fresh.establishments, fresh.price_drops_7d, fresh.active_comparisons,
          fresh.unique_products, fresh.avg_savings, fresh.total_savings, now())
  ON CONFLICT (id) DO UPDATE SET
    establishments = EXCLUDED.establishments,
    price_drops_7d = EXCLUDED.price_drops_7d,
    active_comparisons = EXCLUDED.active_comparisons,
    unique_products = EXCLUDED.unique_products,
    avg_savings = EXCLUDED.avg_savings,
    total_savings = EXCLUDED.total_savings,
    computed_at = now();

  RETURN QUERY SELECT fresh.establishments, fresh.price_drops_7d, fresh.active_comparisons,
                      fresh.unique_products, fresh.avg_savings, fresh.total_savings;
END;
$function$;

-- 2) Warmer job: recomputa stats a cada 10 minutos, sempre em background
CREATE OR REPLACE FUNCTION public.refresh_platform_stats_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  fresh RECORD;
BEGIN
  SELECT * INTO fresh FROM public.platform_public_stats_compute();
  INSERT INTO public.platform_stats_cache AS c
    (id, establishments, price_drops_7d, active_comparisons, unique_products, avg_savings, total_savings, computed_at)
  VALUES (true, fresh.establishments, fresh.price_drops_7d, fresh.active_comparisons,
          fresh.unique_products, fresh.avg_savings, fresh.total_savings, now())
  ON CONFLICT (id) DO UPDATE SET
    establishments = EXCLUDED.establishments,
    price_drops_7d = EXCLUDED.price_drops_7d,
    active_comparisons = EXCLUDED.active_comparisons,
    unique_products = EXCLUDED.unique_products,
    avg_savings = EXCLUDED.avg_savings,
    total_savings = EXCLUDED.total_savings,
    computed_at = now();
END;
$$;

-- Remove agendamentos antigos (se existirem) e recria a cada 10 minutos
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh_platform_stats_cache';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'refresh_platform_stats_cache',
  '*/10 * * * *',
  $$SELECT public.refresh_platform_stats_cache();$$
);
