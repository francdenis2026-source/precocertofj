-- Granting necessary permissions for the import
GRANT ALL ON public.product_catalog TO service_role;
GRANT ALL ON public.scans TO service_role;
GRANT ALL ON public.establishments TO service_role;

-- Establishment ID for Varejão Contamigos
DO $$
DECLARE
    est_id uuid := 'f02c23db-3934-41f4-9e61-dc16c6c28115';
BEGIN
    -- Cristal Bleach 1L
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Água Sanitária Cristal 1L', est_id, 4.75, 'salvo', 'unknown', 'Limpeza');

    -- Moça Flakes 120g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Cereal Matinal Moça Flakes 120g', est_id, 7.00, 'salvo', 'unknown', 'Mercearia');

    -- Nescau Cereal 120g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Cereal Matinal Nescau 120g', est_id, 7.00, 'salvo', 'unknown', 'Mercearia');

    -- Snow Flakes 120g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Cereal Matinal Snow Flakes 120g', est_id, 7.00, 'salvo', 'unknown', 'Mercearia');

    -- Leite Ninho Integral Instantâneo 380g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Leite em Pó Ninho Integral Instantâneo 380g', est_id, 23.95, 'salvo', 'unknown', 'Laticínios');

    -- Limpador Urca Multiuso 2L
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Limpador Urca Multiuso 2L', est_id, 11.00, 'salvo', 'unknown', 'Limpeza');

    -- Salsicha Bordon 300g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Salsicha ao Molho Bordon 300g', est_id, 8.95, 'salvo', 'unknown', 'Mercearia');

    -- Almôndegas Pampeano
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Almôndegas de Carne Bovina Pampeano 320g', est_id, 11.00, 'salvo', 'unknown', 'Mercearia');

    -- Carne Target 320g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Carne Bovina em Conserva Target 320g', est_id, 12.00, 'salvo', 'unknown', 'Mercearia');

    -- Milho Olé 200g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Milho Verde em Conserva Olé 200g', est_id, 5.50, 'salvo', 'unknown', 'Mercearia');

    -- Biscoito Vivale 300g
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Biscoito Cream Cracker Vivale 300g', est_id, 4.95, 'salvo', 'unknown', 'Mercearia');

    -- Batata
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Batata Inglesa', est_id, 11.95, 'salvo', 'unknown', 'Hortifruti');

    -- Raid
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Inseticida Raid Base Água 300ml', est_id, 19.00, 'salvo', 'unknown', 'Limpeza');

    -- Mat Inset
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Inseticida Mat Inset Multi 300ml', est_id, 16.00, 'salvo', 'unknown', 'Limpeza');

    -- Baygon
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Inseticida Baygon Ação Total 360ml', est_id, 20.00, 'salvo', 'unknown', 'Limpeza');

    -- Mirim
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Biscoito Salgado Mirim 300g', est_id, 5.50, 'salvo', 'unknown', 'Mercearia');

    -- Dallas
    INSERT INTO public.scans (product_name, establishment_id, price_captured, status, verdict, category)
    VALUES ('Biscoito Água e Sal Dallas 300g', est_id, 5.25, 'salvo', 'unknown', 'Mercearia');

END $$;
