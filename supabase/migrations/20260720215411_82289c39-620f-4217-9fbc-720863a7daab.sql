
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.collaborator_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  market_name TEXT,
  city TEXT,
  purchase_date DATE,
  receipts_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','review','approved','rejected')),
  admin_notes TEXT,
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collab_subs_user ON public.collaborator_submissions(user_id);
CREATE INDEX idx_collab_subs_email ON public.collaborator_submissions(lower(email));
CREATE INDEX idx_collab_subs_status ON public.collaborator_submissions(status);

GRANT SELECT ON public.collaborator_submissions TO authenticated;
GRANT ALL ON public.collaborator_submissions TO service_role;

ALTER TABLE public.collaborator_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own submissions"
  ON public.collaborator_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all submissions"
  ON public.collaborator_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_collab_subs_updated
  BEFORE UPDATE ON public.collaborator_submissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE OR REPLACE VIEW public.collaborator_public_stats AS
SELECT
  COUNT(DISTINCT lower(email))::int AS collaborators_count,
  COUNT(*)::int AS submissions_count,
  COUNT(DISTINCT city) FILTER (WHERE city IS NOT NULL AND city <> '')::int AS cities_count
FROM public.collaborator_submissions;

GRANT SELECT ON public.collaborator_public_stats TO anon, authenticated;
