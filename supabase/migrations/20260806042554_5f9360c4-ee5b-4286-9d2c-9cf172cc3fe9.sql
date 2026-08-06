-- Fixing permissions for scans table to allow trigger execution (DELETE)
GRANT ALL ON public.scans TO service_role;

-- Retrying the import with service_role privileges
DO $$
DECLARE
    est_id uuid := 'f02c23db-3934-41f4-9e61-dc16c6c28115';
BEGIN
    -- Image 225e8b12: Macarrão Espaguete Miragina 500g - R$ 4.50
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Macarrão Espaguete Miragina 500g', est_id, 4.50, 'salvo', 'unknown', 'Mercearia');

    -- Image 305ca5ed: Margarina Delícia com Creme de Leite 1kg - R$ 24.00
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Margarina Delícia com Creme de Leite 1kg', est_id, 24.00, 'salvo', 'unknown', 'Laticínios');

    -- Image 369e1e80: Nissin Lámen Sabores - R$ 3.25
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Macarrão Instantâneo Nissin Lámen Galinha 85g', est_id, 3.25, 'salvo', 'unknown', 'Mercearia');
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Macarrão Instantâneo Nissin Lámen Frango Assado com Limão 85g', est_id, 3.25, 'salvo', 'unknown', 'Mercearia');
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Macarrão Instantâneo Nissin Lámen Carne 85g', est_id, 3.25, 'salvo', 'unknown', 'Mercearia');

    -- Image 372caf2f: Massa para Lasanha Dona Benta 500g - R$ 12.50
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Massa para Lasanha Dona Benta 500g', est_id, 12.50, 'salvo', 'unknown', 'Mercearia');

    -- Image 464cb137: Sabão em Pó Tixan Ypê 2.4kg (R$ 37.00) and 4kg (R$ 55.00)
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Lava Roupas em Pó Tixan Ypê Primavera 2.4kg', est_id, 37.00, 'salvo', 'unknown', 'Limpeza');
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Lava Roupas em Pó Tixan Ypê Primavera 4kg', est_id, 55.00, 'salvo', 'unknown', 'Limpeza');

    -- Image 488aa23f: Limpador Casa & Perfume 500ml - R$ 5.95
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Limpador Multiuso Casa & Perfume 500ml', est_id, 5.95, 'salvo', 'unknown', 'Limpeza');

    -- Image 539e44e8: Leite de Coco Bom Coco 200ml - R$ 3.00
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Leite de Coco Bom Coco 200ml', est_id, 3.00, 'salvo', 'unknown', 'Mercearia');

    -- Image 729d9a0c: Cup Noodles Nissin Sabores - R$ 6.25
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Cup Noodles Nissin Bolonhesa 70g', est_id, 6.25, 'salvo', 'unknown', 'Mercearia');
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Cup Noodles Nissin Galinha Caipira Picante 70g', est_id, 6.25, 'salvo', 'unknown', 'Mercearia');
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Cup Noodles Nissin Costela 70g', est_id, 6.25, 'salvo', 'unknown', 'Mercearia');

    -- Image 851a9d8b: Seleta de Legumes Olé 200g - R$ 5.50
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Seleta de Legumes em Conserva Olé 200g', est_id, 5.50, 'salvo', 'unknown', 'Mercearia');

    -- Image 977af7f4: Feijão Bernardo 1kg - R$ 11.00
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Feijão Carioca Bernardo 1kg', est_id, 11.00, 'salvo', 'unknown', 'Mercearia');

END $$;
