
-- Add review fields
ALTER TABLE public.collaborator_submissions
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS reward_days integer,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Allow admin/service inserts from webhook (webhook uses service_role bypassing RLS anyway)
-- Notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own notifications read" ON public.user_notifications;
CREATE POLICY "own notifications read" ON public.user_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own notifications update" ON public.user_notifications;
CREATE POLICY "own notifications update" ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin manage notifications" ON public.user_notifications;
CREATE POLICY "admin manage notifications" ON public.user_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON public.user_notifications (user_id) WHERE read_at IS NULL;

-- Admin review RPC
CREATE OR REPLACE FUNCTION public.admin_review_collab_submission(
  _id uuid,
  _status text,
  _rejection_reason text DEFAULT NULL,
  _admin_notes text DEFAULT NULL,
  _reward_days integer DEFAULT NULL
)
RETURNS public.collaborator_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.collaborator_submissions;
  v_user uuid;
  v_new_paid timestamptz;
  v_title text;
  v_body text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _status NOT IN ('received','review','approved','rejected') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.collaborator_submissions
     SET status = _status,
         rejection_reason = CASE WHEN _status = 'rejected' THEN _rejection_reason ELSE NULL END,
         admin_notes = COALESCE(_admin_notes, admin_notes),
         reward_days = COALESCE(_reward_days, reward_days),
         reward_granted = CASE WHEN _status = 'approved' THEN true ELSE reward_granted END,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = _id
   RETURNING * INTO v_sub;

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'submission not found';
  END IF;

  v_user := v_sub.user_id;

  -- Extend paid_until on approval when user is known and reward_days > 0
  IF _status = 'approved' AND v_user IS NOT NULL AND COALESCE(_reward_days, 0) > 0 THEN
    UPDATE public.profiles p
       SET paid_until = GREATEST(COALESCE(p.paid_until, now()), now()) + make_interval(days => _reward_days),
           updated_at = now()
     WHERE p.id = v_user
     RETURNING p.paid_until INTO v_new_paid;
  END IF;

  -- Create in-app notification when user is known
  IF v_user IS NOT NULL THEN
    IF _status = 'approved' THEN
      v_title := 'Comprovante aprovado 🎉';
      v_body := CASE
        WHEN v_new_paid IS NOT NULL
          THEN 'Seu envio foi aprovado. Sua conta grátis está ativa até ' || to_char(v_new_paid AT TIME ZONE 'America/Rio_Branco', 'DD/MM/YYYY') || '.'
        ELSE 'Seu envio foi aprovado. Obrigado por colaborar!'
      END;
    ELSIF _status = 'rejected' THEN
      v_title := 'Comprovante não aceito';
      v_body := COALESCE('Motivo: ' || _rejection_reason, 'Seu envio não pôde ser validado desta vez.');
    ELSIF _status = 'review' THEN
      v_title := 'Comprovante em análise';
      v_body := 'Estamos revisando seu envio. Você será avisado quando terminar.';
    ELSE
      v_title := 'Comprovante recebido';
      v_body := 'Recebemos seu envio e ele entrou na fila.';
    END IF;

    INSERT INTO public.user_notifications (user_id, kind, title, body, link, metadata)
    VALUES (
      v_user,
      'collab_status_' || _status,
      v_title,
      v_body,
      '/perfil',
      jsonb_build_object('submission_id', v_sub.id, 'status', _status, 'reward_days', _reward_days)
    );
  END IF;

  RETURN v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_collab_submission(uuid, text, text, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_review_collab_submission(uuid, text, text, text, integer) TO authenticated;

-- Helper to attach an anonymous submission to a user by email match (used post-signup or by admin)
CREATE OR REPLACE FUNCTION public.attach_collab_submissions_to_user(_user_id uuid, _email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF _user_id IS NULL OR _email IS NULL OR _email = '' THEN RETURN 0; END IF;
  UPDATE public.collaborator_submissions
     SET user_id = _user_id, updated_at = now()
   WHERE user_id IS NULL AND lower(email) = lower(_email);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_collab_submissions_to_user(uuid, text) TO authenticated, service_role;
