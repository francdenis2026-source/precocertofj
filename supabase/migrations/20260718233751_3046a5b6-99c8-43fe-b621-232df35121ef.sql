
-- Saved baskets
CREATE TABLE public.saved_baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'compare' CHECK (mode IN ('compare','budget')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_saved_baskets_user ON public.saved_baskets(user_id, created_at DESC);
CREATE INDEX idx_saved_baskets_token ON public.saved_baskets(share_token) WHERE share_token IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_baskets TO authenticated;
GRANT SELECT ON public.saved_baskets TO anon;
GRANT ALL ON public.saved_baskets TO service_role;
ALTER TABLE public.saved_baskets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_baskets_all" ON public.saved_baskets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public_shared_basket_read" ON public.saved_baskets
  FOR SELECT TO anon, authenticated
  USING (share_token IS NOT NULL);
CREATE TRIGGER trg_saved_baskets_updated_at
  BEFORE UPDATE ON public.saved_baskets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit log
CREATE TABLE public.edit_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('shopping_item','finance_tx')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('update','delete')),
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_edit_audit_entity ON public.edit_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_edit_audit_user ON public.edit_audit_log(user_id, created_at DESC);
GRANT SELECT ON public.edit_audit_log TO authenticated;
GRANT ALL ON public.edit_audit_log TO service_role;
ALTER TABLE public.edit_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_audit_read" ON public.edit_audit_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: shopping_list_items
CREATE OR REPLACE FUNCTION public.tg_audit_shopping_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
BEGIN
  SELECT sl.user_id INTO v_user FROM public.shopping_lists sl
    WHERE sl.id = COALESCE(NEW.list_id, OLD.list_id);
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.edit_audit_log(user_id, entity_type, entity_id, action, before, after)
    VALUES (v_user, 'shopping_item', OLD.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.edit_audit_log(user_id, entity_type, entity_id, action, before, after)
    VALUES (v_user, 'shopping_item', OLD.id, 'delete', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_audit_shopping_item
  AFTER UPDATE OR DELETE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_shopping_item();

-- Trigger: finance_transactions
CREATE OR REPLACE FUNCTION public.tg_audit_finance_tx()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.edit_audit_log(user_id, entity_type, entity_id, action, before, after)
    VALUES (COALESCE(NEW.user_id, OLD.user_id), 'finance_tx', OLD.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.edit_audit_log(user_id, entity_type, entity_id, action, before, after)
    VALUES (OLD.user_id, 'finance_tx', OLD.id, 'delete', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_audit_finance_tx
  AFTER UPDATE OR DELETE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_finance_tx();
