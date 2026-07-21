CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  barcode TEXT,
  product_name TEXT,
  price_captured NUMERIC(10,2),
  average_price NUMERIC(10,2),
  diff_pct NUMERIC(6,2),
  verdict TEXT NOT NULL DEFAULT 'unknown' CHECK (verdict IN ('barato','justo','caro','unknown')),
  image_url TEXT,
  market_name TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scans_created_at_idx ON public.scans (created_at DESC);
CREATE INDEX scans_user_id_idx ON public.scans (user_id);
CREATE INDEX scans_barcode_idx ON public.scans (barcode);

GRANT SELECT, INSERT ON public.scans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own or public scans"
  ON public.scans FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Anon reads public scans"
  ON public.scans FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Users insert own scans"
  ON public.scans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anon insert public scans"
  ON public.scans FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Users delete own scans"
  ON public.scans FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());