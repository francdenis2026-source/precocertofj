
-- Remove duplicata "Comercial Vanderley" (sem logo); mantém "Mercantil Wanderley" com a logomarca
DELETE FROM public.establishments WHERE id = 'fa3c0930-0cdd-48eb-af19-6af37c0300f2';

-- Completa cadastro
UPDATE public.establishments
SET cnpj = '07.024.999/0001-58',
    address = 'Trav Benjamin Constant, 25',
    neighborhood = 'Centro',
    city = 'Feijó',
    state = 'AC',
    zip = '69960-000',
    kind = 'mercado',
    updated_at = now()
WHERE id = 'aac01d30-6938-4333-92a0-de1f537a4d11';

-- Registra cupom fiscal e itens
WITH new_receipt AS (
  INSERT INTO public.receipts (
    establishment_id, coupon_number, access_key, issued_at, total, amount_paid
  ) VALUES (
    'aac01d30-6938-4333-92a0-de1f537a4d11',
    '65123',
    '12260707024999000158650120000651231200725379',
    '2026-07-09T17:17:54-05:00'::timestamptz,
    98.50,
    98.50
  )
  RETURNING id
)
INSERT INTO public.scans (
  receipt_id, establishment_id, market_name, product_name,
  price_captured, total_price, quantity, unit, verdict, status, created_at
)
SELECT r.id, 'aac01d30-6938-4333-92a0-de1f537a4d11', 'Mercantil Wanderley',
       item.product_name, item.price, item.total, item.qty, item.unit,
       'unknown', 'salvo', '2026-07-09T17:17:54-05:00'::timestamptz
FROM new_receipt r,
(VALUES
  ('IOGURTE BOB TRADICIONAL CHOCOLATE C/ DISQUETE 125G BATAVINHO', 6.75::numeric, 6.75::numeric, 1::numeric, 'UN'),
  ('FRANGO SABBOR KG', 14.99, 50.43, 3.3642, 'KG'),
  ('POLPA SOFRUTAS MARACUJA 350G', 15.00, 15.00, 1, 'UN'),
  ('PRESUNTO COZIDO SEARA FATIADO DISFRI KG', 53.00, 8.16, 0.1540, 'KG'),
  ('PRESUNTO LEVISSIMO SEARA A VACUO KG', 53.00, 8.16, 0.1540, 'KG'),
  ('QUEIJO MUSSARELA ITALAC FATIADO 150G', 10.00, 10.00, 1, 'UN')
) AS item(product_name, price, total, qty, unit);
