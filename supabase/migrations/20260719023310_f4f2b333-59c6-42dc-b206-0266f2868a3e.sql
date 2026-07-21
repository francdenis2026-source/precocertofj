
CREATE TABLE public.category_icon_overrides (
  slug TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('lucide','url')),
  value TEXT NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.category_icon_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_icon_overrides TO authenticated;
GRANT ALL ON public.category_icon_overrides TO service_role;

ALTER TABLE public.category_icon_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cio public read" ON public.category_icon_overrides
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "cio admin insert" ON public.category_icon_overrides
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cio admin update" ON public.category_icon_overrides
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cio admin delete" ON public.category_icon_overrides
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cio_updated_at BEFORE UPDATE ON public.category_icon_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
