-- Retrying the import with service_role privileges via migration tool
DO $$
DECLARE
    est_id uuid := 'f02c23db-3934-41f4-9e61-dc16c6c28115';
BEGIN
    -- Cristal Bleach 2L
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Água Sanitária Cristal 2L', est_id, 9.50, 'salvo', 'unknown', 'Limpeza');

    -- Wafer Bauducco
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Biscoito Wafer Bauducco Sabores 70g', est_id, 2.75, 'salvo', 'unknown', 'Mercearia');

    -- Cookies Bauducco
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Biscoito Cookies Bauducco Chocolate 60g', est_id, 3.25, 'salvo', 'unknown', 'Mercearia');

    -- Carne Anglo
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Carne Bovina em Conserva Anglo 320g', est_id, 10.00, 'salvo', 'unknown', 'Mercearia');

    -- Carne Bertin
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Carne Bovina em Conserva Bertin 320g', est_id, 13.00, 'salvo', 'unknown', 'Mercearia');

    -- Sopão Maggi
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Sopão Maggi Galinha com Legumes 200g', est_id, 9.75, 'salvo', 'unknown', 'Mercearia');

    -- Molho Tarantella
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Molho de Tomate Tarantella Tradicional 300g', est_id, 3.25, 'salvo', 'unknown', 'Mercearia');

    -- Molho Pizza Olé
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Molho de Tomate para Pizza Olé 300g', est_id, 3.00, 'salvo', 'unknown', 'Mercearia');

    -- Azeite Dendê 100ml
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Azeite de Dendê Cepêra 100ml', est_id, 11.50, 'salvo', 'unknown', 'Mercearia');

    -- Azeite Dendê 200ml
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Azeite de Dendê Cepêra 200ml', est_id, 15.95, 'salvo', 'unknown', 'Mercearia');

    -- Arroz Bernardo
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Arroz Branco Bernardo 1kg', est_id, 4.75, 'salvo', 'unknown', 'Mercearia');

    -- Feijão Preto Bernardo
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Feijão Preto Bernardo 1kg', est_id, 8.75, 'salvo', 'unknown', 'Mercearia');

    -- Tixan Ypê 800g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Lava Roupas em Pó Tixan Ypê Maciez 800g', est_id, 14.75, 'salvo', 'unknown', 'Limpeza');

    -- Leite Moça Lata
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Leite Condensado Moça Integral Lata 395g', est_id, 12.00, 'salvo', 'unknown', 'Mercearia');

    -- Leite Moça Tetra
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Leite Condensado Moça Semidesnatado 340g', est_id, 7.95, 'salvo', 'unknown', 'Mercearia');

    -- Leite Piracanjuba
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Leite Condensado Piracanjuba Semidesnatado 395g', est_id, 8.95, 'salvo', 'unknown', 'Mercearia');

    -- Papel Higiênico
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Papel Higiênico Fofinho Folha Simples 4un', est_id, 5.00, 'salvo', 'unknown', 'Higiene');

END $$;
