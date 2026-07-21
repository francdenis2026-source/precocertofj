ALTER TABLE public.products ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.price_history ALTER COLUMN owner_id SET DEFAULT auth.uid();