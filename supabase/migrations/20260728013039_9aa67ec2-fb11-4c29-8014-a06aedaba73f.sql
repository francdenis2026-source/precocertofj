ALTER TABLE public.subscribers DROP CONSTRAINT IF EXISTS subscribers_plan_id_fkey;
DROP TABLE IF EXISTS public.plans CASCADE;

ALTER TABLE public.license_plans
  ADD COLUMN IF NOT EXISTS cycle text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_price_cents integer;

UPDATE public.license_plans
SET cycle = CASE
  WHEN days <= 0 THEN 'trial'
  WHEN days <= 45 THEN 'monthly'
  WHEN days <= 200 THEN 'semester'
  ELSE 'yearly'
END
WHERE cycle IS NULL;

ALTER TABLE public.license_plans ALTER COLUMN cycle SET NOT NULL;
ALTER TABLE public.license_plans ALTER COLUMN cycle SET DEFAULT 'monthly';
ALTER TABLE public.license_plans DROP CONSTRAINT IF EXISTS license_plans_cycle_check;
ALTER TABLE public.license_plans ADD CONSTRAINT license_plans_cycle_check CHECK (cycle IN ('trial','monthly','semester','yearly'));