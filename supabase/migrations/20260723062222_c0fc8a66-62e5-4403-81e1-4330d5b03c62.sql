
CREATE TABLE IF NOT EXISTS public.email_send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'activation',
  order_id UUID REFERENCES public.checkout_orders(id) ON DELETE CASCADE,
  license_code_id UUID REFERENCES public.license_codes(id) ON DELETE SET NULL,
  webhook_event_id UUID REFERENCES public.webhook_events(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_send_queue TO authenticated;
GRANT ALL ON public.email_send_queue TO service_role;

ALTER TABLE public.email_send_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler fila de e-mails"
  ON public.email_send_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_email_send_queue_due
  ON public.email_send_queue (status, next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_send_queue_order
  ON public.email_send_queue (order_id);

CREATE TRIGGER trg_email_send_queue_updated_at
  BEFORE UPDATE ON public.email_send_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
