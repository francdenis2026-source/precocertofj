
ALTER TABLE public.checkout_orders DROP CONSTRAINT IF EXISTS checkout_orders_status_check;
ALTER TABLE public.checkout_orders ADD CONSTRAINT checkout_orders_status_check
  CHECK (status = ANY (ARRAY['pending','approved','failed','cancelled','refunded','charged_back','rejected']::text[]));
