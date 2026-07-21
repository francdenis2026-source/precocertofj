-- product_catalog_audit: registra alterações de nome, marca, unidade, barcode, imagem e merges
CREATE TABLE public.product_catalog_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id uuid NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('update','image_upload','image_generated','merge','delete','create')),
  field text NULL,
  old_value text NULL,
  new_value text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pca_catalog ON public.product_catalog_audit(catalog_id, created_at DESC);
CREATE INDEX idx_pca_created ON public.product_catalog_audit(created_at DESC);

GRANT SELECT, INSERT ON public.product_catalog_audit TO authenticated;
GRANT ALL ON public.product_catalog_audit TO service_role;

ALTER TABLE public.product_catalog_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.product_catalog_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
  ON public.product_catalog_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));