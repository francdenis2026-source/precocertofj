DO $$
DECLARE
    e_id uuid := 'eb1e6277-db89-4e94-950e-d14540ce71c6';
BEGIN
    -- Nocicilin
    INSERT INTO public.product_catalog (display_name, normalized_name, brand, category, default_unit, image_url)
    VALUES ('Nocicilin 0,15mg + 0,03mg 21 Comprimidos', 'nocicilin 0 15mg 0 03mg 21 comprimidos', 'EMS', 'higiene', '21 comprimidos', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400')
    ON CONFLICT (normalized_name) DO NOTHING;
    
    INSERT INTO public.scans (establishment_id, product_name, price_captured, status)
    VALUES (e_id, 'Nocicilin 0,15mg + 0,03mg 21 Comprimidos', 18.50, 'salvo');

    -- signs
    INSERT INTO public.product_catalog (display_name, normalized_name, brand, category, default_unit)
    VALUES ('Gastrogel 5 em 1', 'gastrogel 5 em 1', 'Neo Química', 'higiene', 'unidade'),
           ('Fisiofort Gel Massageador 150g', 'fisiofort gel massageador 150g', 'Bio Instinto', 'higiene', '150g'),
           ('Gel Massageador Arnica e Copaíba', 'gel massageador arnica e copaiba', 'Bio Instinto', 'higiene', 'unidade'),
           ('Neopiridin Pastilhas', 'neopiridin pastilhas', 'Neo Química', 'higiene', 'unidade'),
           ('Resfenol 20 Cápsulas', 'resfenol 20 capsulas', 'Kley Hertz', 'higiene', '20 cápsulas')
    ON CONFLICT (normalized_name) DO NOTHING;

    INSERT INTO public.scans (establishment_id, product_name, price_captured, status)
    VALUES (e_id, 'Gastrogel 5 em 1', 15.99, 'salvo'),
           (e_id, 'Fisiofort Gel Massageador 150g', 10.99, 'salvo'),
           (e_id, 'Gel Massageador Arnica e Copaíba', 9.99, 'salvo'),
           (e_id, 'Neopiridin Pastilhas', 9.99, 'salvo'),
           (e_id, 'Resfenol 20 Cápsulas', 5.99, 'salvo');

    -- products
    INSERT INTO public.product_catalog (display_name, normalized_name, brand, category, default_unit)
    VALUES ('Doralgina 20 Drágeas', 'doralgina 20 drageas', 'Neo Química', 'higiene', '20 drágeas'),
           ('Aberalgina (Dipirona) 500mg', 'aberalgina dipirona 500mg', 'Airela', 'higiene', 'unidade'),
           ('Kit OX Shampoo + Condicionador', 'kit ox shampoo condicionador', 'OX', 'higiene', 'kit')
    ON CONFLICT (normalized_name) DO NOTHING;

    INSERT INTO public.scans (establishment_id, product_name, price_captured, status)
    VALUES (e_id, 'Doralgina 20 Drágeas', 9.99, 'salvo'),
           (e_id, 'Aberalgina (Dipirona) 500mg', 5.50, 'salvo'),
           (e_id, 'Kit OX Shampoo + Condicionador', 44.99, 'salvo');
END $$;