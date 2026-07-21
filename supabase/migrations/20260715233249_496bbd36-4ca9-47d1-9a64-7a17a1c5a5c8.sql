
CREATE TABLE IF NOT EXISTS public.product_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  pattern_norm TEXT GENERATED ALWAYS AS (lower(pattern)) STORED,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS product_blocklist_pattern_unique
  ON public.product_blocklist (pattern_norm);

GRANT SELECT ON public.product_blocklist TO authenticated;
GRANT ALL ON public.product_blocklist TO service_role;

ALTER TABLE public.product_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocklist"
  ON public.product_blocklist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read blocklist"
  ON public.product_blocklist FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.is_product_blocked(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.product_blocklist b
    WHERE lower(public.unaccent(coalesce(p_name, ''))) LIKE '%' || lower(public.unaccent(b.pattern)) || '%'
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_blocklist_on_scans()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.product_name IS NOT NULL AND public.is_product_blocked(NEW.product_name) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scans_blocklist ON public.scans;
CREATE TRIGGER trg_scans_blocklist
  BEFORE INSERT OR UPDATE OF product_name ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_blocklist_on_scans();

CREATE OR REPLACE FUNCTION public.enforce_blocklist_on_catalog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL AND public.is_product_blocked(NEW.display_name) THEN
    RAISE EXCEPTION 'Produto "%" está na lista de bloqueio da plataforma e não pode ser cadastrado.', NEW.display_name
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalog_blocklist ON public.product_catalog;
CREATE TRIGGER trg_catalog_blocklist
  BEFORE INSERT OR UPDATE OF display_name ON public.product_catalog
  FOR EACH ROW EXECUTE FUNCTION public.enforce_blocklist_on_catalog();

INSERT INTO public.product_blocklist (pattern, reason)
VALUES ('pão massa fina', 'Removido do sistema por decisão administrativa')
ON CONFLICT (pattern_norm) DO NOTHING;
