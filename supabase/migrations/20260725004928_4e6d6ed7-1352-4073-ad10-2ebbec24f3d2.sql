
-- 1) Coluna do token no perfil (único por usuário)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS collab_token text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_collab_token_key
  ON public.profiles (collab_token)
  WHERE collab_token IS NOT NULL;

-- 2) Coluna com dias efetivamente creditados na submissão (pode diferir do reward_days pedido devido ao teto mensal)
ALTER TABLE public.collaborator_submissions
  ADD COLUMN IF NOT EXISTS reward_days_awarded integer NOT NULL DEFAULT 0;

-- 3) Função utilitária: gera um token PC-XXXX-XXXX usando alfabeto sem ambiguidade (sem 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_collab_token()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  alphabet CONSTANT text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  seg1 text := '';
  seg2 text := '';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    seg1 := seg1 || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
    seg2 := seg2 || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
  END LOOP;
  RETURN 'PC-' || seg1 || '-' || seg2;
END;
$$;

-- 4) Retorna (ou cria) o token do usuário logado
CREATE OR REPLACE FUNCTION public.get_or_create_collab_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_token text;
  v_try int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT collab_token INTO v_token FROM public.profiles WHERE id = v_user;
  IF v_token IS NOT NULL AND v_token <> '' THEN
    RETURN v_token;
  END IF;

  -- Tenta até 10 vezes evitar colisão (extremamente improvável)
  LOOP
    v_try := v_try + 1;
    v_token := public.generate_collab_token();
    BEGIN
      UPDATE public.profiles
         SET collab_token = v_token, updated_at = now()
       WHERE id = v_user;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try >= 10 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN v_token;
END;
$$;

-- 5) Admin: encontra o dono de um envio a partir do token (para vincular automaticamente)
CREATE OR REPLACE FUNCTION public.find_user_by_collab_token(_token text)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
    SELECT p.id, u.email::text, p.full_name
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
     WHERE p.collab_token = upper(btrim(_token))
     LIMIT 1;
END;
$$;

-- 6) Progresso mensal: dias já concedidos e restantes (0..30) para o usuário logado
CREATE OR REPLACE FUNCTION public.get_my_collab_month_progress()
RETURNS TABLE(
  month_key text,
  submissions_month int,
  approved_month int,
  days_awarded int,
  days_remaining int,
  monthly_cap int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cap int := 30;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    to_char(now(), 'YYYY-MM') AS month_key,
    COUNT(*) FILTER (WHERE date_trunc('month', s.created_at) = date_trunc('month', now()))::int AS submissions_month,
    COUNT(*) FILTER (WHERE s.status = 'approved' AND date_trunc('month', COALESCE(s.reviewed_at, s.created_at)) = date_trunc('month', now()))::int AS approved_month,
    COALESCE(SUM(s.reward_days_awarded) FILTER (
      WHERE s.status = 'approved'
        AND date_trunc('month', COALESCE(s.reviewed_at, s.created_at)) = date_trunc('month', now())
    ), 0)::int AS days_awarded,
    GREATEST(0, v_cap - COALESCE(SUM(s.reward_days_awarded) FILTER (
      WHERE s.status = 'approved'
        AND date_trunc('month', COALESCE(s.reviewed_at, s.created_at)) = date_trunc('month', now())
    ), 0))::int AS days_remaining,
    v_cap AS monthly_cap
  FROM public.collaborator_submissions s
  WHERE s.user_id = v_user;
END;
$$;

-- 7) Reescreve a função de revisão do admin para aplicar teto mensal (30 dias / usuário / mês) e gravar dias efetivos
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
SET search_path TO 'public'
AS $$
DECLARE
  v_sub public.collaborator_submissions;
  v_user uuid;
  v_new_paid timestamptz;
  v_title text;
  v_body text;
  v_cap int := 30;
  v_per_submission_default int := 7;
  v_requested int;
  v_already int := 0;
  v_effective int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _status NOT IN ('received','review','approved','rejected') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  -- Carrega estado atual (para saber dono/mês)
  SELECT * INTO v_sub FROM public.collaborator_submissions WHERE id = _id FOR UPDATE;
  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'submission not found';
  END IF;

  v_user := v_sub.user_id;
  v_requested := COALESCE(_reward_days, v_per_submission_default);

  -- Se aprovando, calcula dias efetivos respeitando o teto do mês (usa mês da revisão)
  IF _status = 'approved' AND v_user IS NOT NULL THEN
    SELECT COALESCE(SUM(reward_days_awarded), 0) INTO v_already
      FROM public.collaborator_submissions
     WHERE user_id = v_user
       AND status = 'approved'
       AND id <> _id
       AND date_trunc('month', COALESCE(reviewed_at, created_at)) = date_trunc('month', now());
    v_effective := GREATEST(0, LEAST(v_requested, v_cap - v_already));
  END IF;

  UPDATE public.collaborator_submissions
     SET status = _status,
         rejection_reason = CASE WHEN _status = 'rejected' THEN _rejection_reason ELSE NULL END,
         admin_notes = COALESCE(_admin_notes, admin_notes),
         reward_days = CASE WHEN _status = 'approved' THEN v_requested ELSE reward_days END,
         reward_days_awarded = CASE WHEN _status = 'approved' THEN v_effective ELSE reward_days_awarded END,
         reward_granted = CASE WHEN _status = 'approved' THEN true ELSE reward_granted END,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         updated_at = now()
   WHERE id = _id
   RETURNING * INTO v_sub;

  -- Estende paid_until proporcionalmente aos dias efetivos
  IF _status = 'approved' AND v_user IS NOT NULL AND v_effective > 0 THEN
    UPDATE public.profiles p
       SET paid_until = GREATEST(COALESCE(p.paid_until, now()), now()) + make_interval(days => v_effective),
           updated_at = now()
     WHERE p.id = v_user
     RETURNING p.paid_until INTO v_new_paid;
  END IF;

  -- Notificação in-app
  IF v_user IS NOT NULL THEN
    IF _status = 'approved' THEN
      v_title := 'Comprovante aprovado 🎉';
      IF v_effective > 0 AND v_new_paid IS NOT NULL THEN
        v_body := '+' || v_effective || ' dia(s) grátis. Sua conta está ativa até '
               || to_char(v_new_paid AT TIME ZONE 'America/Rio_Branco', 'DD/MM/YYYY')
               || '. Já usou ' || (v_already + v_effective) || '/' || v_cap || ' dias este mês.';
      ELSIF v_effective = 0 AND v_requested > 0 THEN
        v_body := 'Envio aprovado, mas você já atingiu o teto de ' || v_cap || ' dias grátis neste mês. Obrigado por colaborar!';
      ELSE
        v_body := 'Seu envio foi aprovado. Obrigado por colaborar!';
      END IF;
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
      jsonb_build_object(
        'submission_id', v_sub.id,
        'status', _status,
        'reward_days_requested', v_requested,
        'reward_days_awarded', v_effective,
        'monthly_cap', v_cap,
        'used_this_month', v_already + v_effective
      )
    );
  END IF;

  RETURN v_sub;
END;
$$;
