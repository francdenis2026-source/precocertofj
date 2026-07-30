UPDATE public.scans s
SET market_name = e.name
FROM public.establishments e
WHERE e.id = s.establishment_id
  AND lower(trim(s.market_name)) <> lower(trim(e.name));