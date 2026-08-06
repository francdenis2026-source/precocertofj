DO $$
DECLARE
    store_id uuid := 'f02c23db-3934-41f4-9e61-dc16c6c28115';
BEGIN
    -- Only inserts for scans using existing product names
    
    -- 1. Lava Roupas em Pó Tixan Ypê Primavera 4kg - R$ 55.00
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Lava Roupas em Pó Tixan Ypê Primavera 4kg', 55.00, 'salvo', 'Limpeza')
    ON CONFLICT DO NOTHING;

    -- 2. Neston 3 Cereais Nestlé 360g - R$ 21.75
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Neston 3 Cereais Nestlé 360g', 21.75, 'salvo', 'Mercearia')
    ON CONFLICT DO NOTHING;

    -- 3. Biscoito Spantoo 80g - R$ 2.25
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Biscoito Spantoo 80g', 2.25, 'salvo', 'Biscoitos')
    ON CONFLICT DO NOTHING;

    -- 4. Biscoito Spantoo Chocolate 30g - R$ 1.25
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Biscoito Spantoo Chocolate 30g', 1.25, 'salvo', 'Biscoitos')
    ON CONFLICT DO NOTHING;

    -- 5. Água Sanitária Ypê 2L - R$ 11.75
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Água Sanitária Ypê 2L', 11.75, 'salvo', 'Limpeza')
    ON CONFLICT DO NOTHING;

    -- 6. Água Sanitária Ypê 1L - R$ 5.75
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Água Sanitária Ypê 1L', 5.75, 'salvo', 'Limpeza')
    ON CONFLICT DO NOTHING;

    -- 7. Cenoura - R$ 10.95
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Cenoura', 10.95, 'salvo', 'Hortifruti')
    ON CONFLICT DO NOTHING;

    -- 8. Leite UHT Integral Piracanjuba 1L - R$ 10.95
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Leite UHT Integral Piracanjuba 1L', 10.95, 'salvo', 'Laticínios')
    ON CONFLICT DO NOTHING;

    -- 9. Molho de Tomate Tarantella Tradicional 300g - R$ 3.25
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Molho de Tomate Tarantella Tradicional 300g', 3.25, 'salvo', 'Mercearia')
    ON CONFLICT DO NOTHING;

    -- 10. Papel Higiênico Cotton Deluxe Folha Dupla 4 unidades - R$ 7.50
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Papel Higiênico Cotton Deluxe Folha Dupla 4 unidades', 7.50, 'salvo', 'Higiene')
    ON CONFLICT DO NOTHING;

    -- 11. Papel Higiênico Deluxe Cotton Folha Dupla Leve 12 Pague 11 - R$ 18.50
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Papel Higiênico Deluxe Cotton Folha Dupla Leve 12 Pague 11', 18.50, 'salvo', 'Higiene')
    ON CONFLICT DO NOTHING;

    -- 12. Vinagre de Maçã Toscano 750ml - R$ 11.95
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Vinagre de Maçã Toscano 750ml', 11.95, 'salvo', 'Mercearia')
    ON CONFLICT DO NOTHING;

    -- 13. Vinagre de Álcool Toscano Aromas 750ml - R$ 9.50
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Vinagre de Álcool Toscano Aromas 750ml', 9.50, 'salvo', 'Mercearia')
    ON CONFLICT DO NOTHING;

    -- 14. Vinagre de Álcool Castelo 750ml - R$ 4.50
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Vinagre de Álcool Castelo 750ml', 4.50, 'salvo', 'Mercearia')
    ON CONFLICT DO NOTHING;

    -- 15. Sabão em Pó Tixan Ypê Maciez 400g - R$ 7.25
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Sabão em Pó Tixan Ypê Maciez 400g', 7.25, 'salvo', 'Limpeza')
    ON CONFLICT DO NOTHING;

    -- 16. Sabão em Pó Tixan Ypê Primavera 400g - R$ 7.25
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status, category)
    VALUES (store_id, 'Sabão em Pó Tixan Ypê Primavera 400g', 7.25, 'salvo', 'Limpeza')
    ON CONFLICT DO NOTHING;

END $$;
