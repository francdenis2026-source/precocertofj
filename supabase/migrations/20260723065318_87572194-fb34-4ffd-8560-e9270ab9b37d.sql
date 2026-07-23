
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE INDEX IF NOT EXISTS profiles_suspended_at_idx ON public.profiles (suspended_at) WHERE suspended_at IS NOT NULL;
