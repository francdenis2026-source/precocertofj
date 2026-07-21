CREATE TABLE public.pin_reset_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  phone_masked TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  request_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.pin_reset_codes TO service_role;

ALTER TABLE public.pin_reset_codes ENABLE ROW LEVEL SECURITY;

-- Deny-all: only service_role (edge) touches this table
CREATE POLICY "no direct access" ON public.pin_reset_codes
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX idx_pin_reset_cpf_created ON public.pin_reset_codes (cpf, created_at DESC);
CREATE INDEX idx_pin_reset_expires ON public.pin_reset_codes (expires_at);