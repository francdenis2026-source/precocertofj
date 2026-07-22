
-- Ensure updated_at helper exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- IMPORT BATCHES
CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  market_name TEXT,
  note TEXT,
  created_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage import batches" ON public.import_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_import_batches_updated
  BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- IMPORT ITEMS
CREATE TABLE public.import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  price NUMERIC(10,2),
  quantity NUMERIC,
  unit TEXT,
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  confidence NUMERIC(4,3),
  log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_import_items_batch ON public.import_items(batch_id);
CREATE INDEX idx_import_items_status ON public.import_items(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_items TO authenticated;
GRANT ALL ON public.import_items TO service_role;
ALTER TABLE public.import_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage import items" ON public.import_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CATALOG SUGGESTIONS
CREATE TABLE public.catalog_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  product_catalog_id UUID REFERENCES public.product_catalog(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  suggested_brand TEXT,
  suggested_type TEXT,
  suggested_package TEXT,
  suggested_normalized_name TEXT,
  confidence NUMERIC(4,3),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_catalog_suggestions_status ON public.catalog_suggestions(status);
CREATE INDEX idx_catalog_suggestions_scan ON public.catalog_suggestions(scan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_suggestions TO authenticated;
GRANT ALL ON public.catalog_suggestions TO service_role;
ALTER TABLE public.catalog_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage catalog suggestions" ON public.catalog_suggestions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_catalog_suggestions_updated
  BEFORE UPDATE ON public.catalog_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
