
-- Inserindo no catálogo de produtos usando as colunas corretas
INSERT INTO public.product_catalog (display_name, normalized_name, category, brand, default_unit)
VALUES 
('Molho de Tomate Manjericão Sofruta 300g', 'molho de tomate manjericao sofruta 300g', 'Mercearia', 'Sofruta', 'g'),
('Maionese Fugini Original 180g', 'maionese fugini original 180g', 'Mercearia', 'Fugini', 'g'),
('Maionese Fugini Verde 180g', 'maionese fugini verde 180g', 'Mercearia', 'Fugini', 'g'),
('Maionese Fugini Original Bico 300g', 'maionese fugini original bico 300g', 'Mercearia', 'Fugini', 'g'),
('Manteiga Cabeça de Touro 200g', 'manteiga cabeca de touro 200g', 'Laticínios', 'Cabeça de Touro', 'g'),
('Manteiga Italac 200g', 'manteiga italac 200g', 'Laticínios', 'Italac', 'g'),
('Absorvente Sempre Livre Adapt L8P7', 'absorvente sempre livre adapt l8p7', 'Higiene', 'Sempre Livre', 'un'),
('Amido de Milho Maizena 200g', 'amido de milho maizena 200g', 'Mercearia', 'Maizena', 'g'),
('Biscoito Cream Cracker Sol 350g', 'biscoito cream cracker sol 350g', 'Mercearia', 'Sol', 'g'),
('Biscoito Cream Cracker Belma 350g', 'biscoito cream cracker belma 350g', 'Mercearia', 'Belma', 'g'),
('Detergente Brisa Maçã 500ml', 'detergente brisa maca 500ml', 'Limpeza', 'Brisa', 'ml'),
('Detergente Brisa Limão 500ml', 'detergente brisa limao 500ml', 'Limpeza', 'Brisa', 'ml'),
('Detergente Brisa Coco 500ml', 'detergente brisa coco 500ml', 'Limpeza', 'Brisa', 'ml'),
('Papel Toalha Klass C/ 2 Rolos', 'papel toalha klass c 2 rolos', 'Higiene', 'Klass', 'un'),
('Lava Roupas Líquido Brinort 2L', 'lava roupas liquido brinort 2l', 'Limpeza', 'Brinort', 'L'),
('Papel Toalha Maxim C/ 2 Rolos', 'papel toalha maxim c 2 rolos', 'Higiene', 'Maxim', 'un')
ON CONFLICT (normalized_name) DO NOTHING;

-- Registrando os preços no estabelecimento Varejão Contamigos (ID: f02c23db-3934-41f4-9e61-dc16c6c28115)
-- Usando status 'salvo' que é aceito pelo constraint
INSERT INTO public.scans (establishment_id, product_name, price_captured, created_at, status)
VALUES 
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Molho de Tomate Manjericão Sofruta 300g', 3.00, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Maionese Fugini Original 180g', 4.50, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Maionese Fugini Verde 180g', 4.50, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Maionese Fugini Original Bico 300g', 4.75, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Manteiga Cabeça de Touro 200g', 18.75, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Manteiga Italac 200g', 14.00, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Absorvente Sempre Livre Adapt L8P7', 5.00, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Amido de Milho Maizena 200g', 5.90, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Biscoito Cream Cracker Sol 350g', 5.25, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Biscoito Cream Cracker Belma 350g', 5.25, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Detergente Brisa Maçã 500ml', 2.90, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Detergente Brisa Limão 500ml', 2.90, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Detergente Brisa Coco 500ml', 2.90, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Papel Toalha Klass C/ 2 Rolos', 5.75, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Lava Roupas Líquido Brinort 2L', 17.00, NOW(), 'salvo'),
('f02c23db-3934-41f4-9e61-dc16c6c28115', 'Papel Toalha Maxim C/ 2 Rolos', 5.75, NOW(), 'salvo');
