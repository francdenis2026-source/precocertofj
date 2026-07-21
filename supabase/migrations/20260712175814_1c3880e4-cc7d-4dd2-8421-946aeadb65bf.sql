
CREATE TABLE public.activation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  subscription_id TEXT,
  plan_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activation_codes_email ON public.activation_codes(email);
CREATE INDEX idx_activation_codes_code ON public.activation_codes(code);

GRANT ALL ON public.activation_codes TO service_role;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: only service_role (server-side) accesses these codes.
CREATE POLICY "Deny all client access" ON public.activation_codes FOR ALL TO authenticated USING (false) WITH CHECK (false);
