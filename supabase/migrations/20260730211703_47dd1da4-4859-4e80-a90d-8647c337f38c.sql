UPDATE public.scans s
SET market_name = e.name
FROM public.establishments e
WHERE e.id = s.establishment_id
  AND s.market_name IS DISTINCT FROM e.name;

UPDATE public.favorite_markets f
SET market_name = e.name
FROM public.establishments e
WHERE lower(trim(f.market_name)) = lower(trim(e.name))
  AND f.market_name IS DISTINCT FROM e.name;

UPDATE public.price_alerts p
SET market_name = e.name
FROM public.establishments e
WHERE lower(trim(p.market_name)) = lower(trim(e.name))
  AND p.market_name IS DISTINCT FROM e.name;