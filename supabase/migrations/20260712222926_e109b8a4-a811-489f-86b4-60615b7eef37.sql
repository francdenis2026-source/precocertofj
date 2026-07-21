
CREATE TABLE public.establishments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  kind TEXT NOT NULL DEFAULT 'mercado' CHECK (kind IN ('mercado','atacado','hortifruti','farmacia','conveniencia','outro')),
  address TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT,
  phone TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_establishments_city ON public.establishments (city, state);
CREATE INDEX idx_establishments_active ON public.establishments (active);
CREATE UNIQUE INDEX idx_establishments_cnpj ON public.establishments (cnpj) WHERE cnpj IS NOT NULL;

GRANT SELECT ON public.establishments TO anon;
GRANT SELECT ON public.establishments TO authenticated;
GRANT ALL ON public.establishments TO service_role;

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active establishments"
  ON public.establishments FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can view all establishments"
  ON public.establishments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert establishments"
  ON public.establishments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update establishments"
  ON public.establishments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete establishments"
  ON public.establishments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_establishments_updated
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
