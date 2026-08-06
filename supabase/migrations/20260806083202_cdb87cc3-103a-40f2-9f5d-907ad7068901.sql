CREATE TABLE public.price_drop_monitors (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    catalog_id uuid references public.product_catalog(id) on delete cascade not null,
    created_at timestamptz default now(),
    unique(user_id, catalog_id)
);

GRANT SELECT, INSERT, DELETE ON public.price_drop_monitors TO authenticated;
GRANT ALL ON public.price_drop_monitors TO service_role;

ALTER TABLE public.price_drop_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own monitors"
ON public.price_drop_monitors
FOR ALL
TO authenticated
USING (auth.uid() = user_id);
