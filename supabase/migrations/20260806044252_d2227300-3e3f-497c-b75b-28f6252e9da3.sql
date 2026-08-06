-- Importação de produtos para Varejão Contamigos (ID: f02c23db-3934-41f4-9e61-dc16c6c28115)
-- Baseado nas imagens enviadas pelo usuário (Margarinas Delícia, Farinha Láctea Nestlé, Biscoitos Atrevidos/ShowGol, Arroz Urbano/Tio Alemão, Limpa Alumínio Alpes, Detergente Limpol/Ypê, Nissin Lámen, Feijão Kumbuco, Ovos)

DO $$ 
DECLARE 
    v_est_id uuid := 'f02c23db-3934-41f4-9e61-dc16c6c28115';
BEGIN
    -- Margarina Delícia 500g (Sabor Manteiga)
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Margarina Delícia Supreme Sabor Manteiga 500g', 13.50, 'supermercados');

    -- Margarina Delícia 500g (Cremosa c/ Creme de Leite)
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Margarina Delícia Cremosa c/ Creme de Leite 500g', 12.00, 'supermercados');

    -- Farinha Láctea Nestlé 160g
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Farinha Láctea Nestlé A Original 160g', 10.75, 'supermercados');

    -- Biscoito Atrevidos 90g
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Biscoito Atrevidos Sabores 90g', 2.95, 'supermercados');

    -- Biscoito Show Gol 75g
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Biscoito Recheado Show Gol 75g', 2.00, 'supermercados');

    -- Arroz Urbano Parboilizado 5kg
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Arroz Urbano Parboilizado 5kg', 30.00, 'supermercados');

    -- Arroz Tio Urbano Branco 5kg
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Arroz Tio Urbano Branco 5kg', 29.00, 'supermercados');

    -- Arroz Tio Alemão Parboilizado 1kg
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Arroz Tio Alemão Parboilizado 1kg', 6.00, 'supermercados');

    -- Limpa Alumínio Alpes 500ml
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Limpa Alumínio Alpes Maçã 500ml', 3.95, 'limpeza');

    -- Detergente Limpol 500ml
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Detergente Limpol 500ml (Vários Sabores)', 3.50, 'limpeza');

    -- Detergente Ypê 500ml
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Detergente Ypê 500ml (Vários Sabores)', 3.50, 'limpeza');

    -- Nissin Lámen 85g
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Macarrão Instantâneo Nissin Lámen 85g', 3.25, 'supermercados');

    -- Feijão Rajado Kumbuco 1kg
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Feijão Rajado Kumbuco 1kg', 12.75, 'supermercados');

    -- Feijão de Praia Kumbuco 1kg
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Feijão de Praia Kumbuco 1kg', 9.50, 'supermercados');

    -- Ovos Brancos Dúzia
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Ovos Brancos Dúzia', 10.00, 'supermercados');

    -- Ovos Vermelhos Dúzia
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Ovos Vermelhos Dúzia', 10.00, 'supermercados');

    -- Ovos Brancos Meia Dúzia
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Ovos Brancos Meia Dúzia', 5.00, 'supermercados');

    -- Ovos Vermelhos Meia Dúzia
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Ovos Vermelhos Meia Dúzia', 5.00, 'supermercados');

    -- Cartela de Ovos Brancos 2 Dúzia e Meia (30 ovos)
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Cartela de Ovos Brancos 30 un', 22.00, 'supermercados');

    -- Cartela de Ovos Vermelho 2 Dúzia e Meia (30 ovos)
    INSERT INTO public.scans (establishment_id, product_name, price_captured, category)
    VALUES (v_est_id, 'Cartela de Ovos Vermelho 30 un', 23.00, 'supermercados');
END $$;
