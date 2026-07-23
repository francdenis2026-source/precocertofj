
ALTER TABLE public.checkout_orders
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_code_base64 TEXT,
  ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pix_payment_id TEXT;
