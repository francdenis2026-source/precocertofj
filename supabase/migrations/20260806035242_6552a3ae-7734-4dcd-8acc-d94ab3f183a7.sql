
BEGIN;
INSERT INTO public.product_catalog (normalized_name, display_name, brand, category, barcode) VALUES
('ENERGY DRINK BALY MELANCIA 250ML', 'Energy Drink Baly Melancia 250ml', 'Baly', 'Bebidas', '32432'),
('BISC LOOK COOKIES 55 G', 'Biscoito Look Cookies 55g', 'Look', 'Biscoitos', '23497'),
('BISCOITO WAFER ITAMARATI FLORESTA NEGRA 80G', 'Biscoito Wafer Itamarati Floresta Negra 80g', 'Itamarati', 'Biscoitos', '21750')
ON CONFLICT (normalized_name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    brand = EXCLUDED.brand,
    category = EXCLUDED.category,
    barcode = EXCLUDED.barcode;

INSERT INTO public.scans (establishment_id, product_name, barcode, price_captured, status, verdict)
VALUES 
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Energy Drink Baly Melancia 250ml', '32432', 5.00, 'salvo', 'unknown'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Biscoito Look Cookies 55g', '23497', 4.25, 'salvo', 'unknown'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Biscoito Wafer Itamarati Floresta Negra 80g', '21750', 2.75, 'salvo', 'unknown')
ON CONFLICT (establishment_id, barcode) WHERE barcode IS NOT NULL AND status = 'salvo' AND user_id IS NULL
DO UPDATE SET price_captured = EXCLUDED.price_captured, product_name = EXCLUDED.product_name;

COMMIT;
