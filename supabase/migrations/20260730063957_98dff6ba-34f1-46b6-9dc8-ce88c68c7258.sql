CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  n text;
BEGIN
  n := lower(unaccent(coalesce(name, '')));
  IF n = '' THEN RETURN 'outros'; END IF;

  -- Pet
  IF n ~ '(racao|whiskas|pedigree|golden|carrapaticida|antipulga|vermifugo|pet\M|caes|gatos|felino|canino)' THEN RETURN 'pet'; END IF;
  -- Bazar / utilidades
  IF n ~ '(vassoura|rodo|balde|panela|frigideira|pilha|lampada|incenso|graxa|nugget liquido|tinta nugget|engraxate|isqueiro|cabide|copo plastico|prendedor|fosforo|tomada|extensao|pano de chao|esponja de aco)' THEN RETURN 'bazar'; END IF;
  -- Papelaria
  IF n ~ '(caderno|caneta|lapis|borracha escolar|cola branca|tesoura escolar|apontador|papel sulfite|mochila|estojo|regua)' THEN RETURN 'papelaria'; END IF;
  -- Infantil
  IF n ~ '(fralda|mamadeira|chupeta|lenco umedecido|toalhinha umedecida|pomada assadura|papinha|formula infantil)' THEN RETURN 'infantil'; END IF;
  -- Suplementos
  IF n ~ '(creatina|whey|bcaa|hipercalorico|albumina|glutamina|pre treino|termogenico|colageno|multivitaminico|omega 3)' THEN RETURN 'suplementos'; END IF;
  -- Medicamentos
  IF n ~ '(dipirona|paracetamol|ibuprofeno|amoxicilina|dorflex|buscopan|neosaldina|omeprazol|loratadina|xarope|pomada|antibiotico|analgesico|antitermico|soro fisiologico|comprimido|capsula|dexametasona|nimesulida)' THEN RETURN 'medicamentos'; END IF;
  -- Higiene bucal
  IF n ~ '(creme dental|pasta de dente|escova dental|escova de dente|enxaguante bucal|antisseptico bucal|fio dental|colgate|sorriso|listerine|close ?up|oral ?b)' THEN RETURN 'bucal'; END IF;
  -- Cabelo
  IF n ~ '(shampoo|xampu|condicionador|creme de pentear|mascara capilar|ampola capilar|tintura|coloracao|tonalizante|progressiva|alisante|gel fixador|leave ?in|salon line|niely|keune|hidratacao capilar|gelatina capilar|oleo capilar|antiqueda|antirresiduo|anti ?caspa|umidificador de cachos|ativador de cachos)' THEN RETURN 'cabelo'; END IF;
  -- Limpeza
  IF n ~ '(detergente|sabao|amaciante|agua sanitaria|desinfetante|multiuso|lava ?loucas|lava ?roupas|limpa ?aluminio|limpa ?vidros|desengordurante|alvejante|cloro|tira ?manchas|cera liquida|lustra ?moveis|pinho sol|veja\M|omo\M|ariel\M|brilhante\M|comfort\M|minuano\M|vanish\M)' THEN RETURN 'limpeza'; END IF;
  -- Papel & descartáveis
  IF n ~ '(papel higienico|papel toalha|guardanapo|copo descartavel|prato descartavel|saco de lixo|papel aluminio|filme pvc|papel manteiga|touca descartavel|luva descartavel)' THEN RETURN 'papel_descartaveis'; END IF;
  -- Cuidados com a pele
  IF n ~ '(protetor solar|hidratante corporal|creme facial|serum|anti ?idade|esfoliante|agua micelar|pos ?sol|repelente|nivea|neutrogena|cicatricure|bepantol)' THEN RETURN 'cuidados_pele'; END IF;
  -- Higiene pessoal
  IF n ~ '(sabonete|desodorante|antitranspirante|absorvente|protetor diario|aparelho de barbear|lamina de barbear|gel de barbear|cotonete|algodao|shave|higiene intima|talco)' THEN RETURN 'higiene'; END IF;
  -- Perfumaria
  IF n ~ '(perfume|deo colonia|colonia|body splash|esmalte|acetona|removedor de esmalte|batom|rimel|base facial|maquiagem|delineador|po compacto)' THEN RETURN 'perfumaria'; END IF;
  -- Salgadinhos
  IF n ~ '(salgadinho|cheetos|doritos|fandangos|ruffles|batata chips|torcida|pipoca|amendoim japones|salgadinho de milho)' THEN RETURN 'snacks'; END IF;
  -- Biscoitos (termos genéricos)
  IF n ~ '(biscoit|bolach|wafer|cream cracker|cracker|oreo|club social|tortinhas|pit stop|delicita)' THEN RETURN 'biscoitos'; END IF;
  -- Biscoitos (marcas) — não podem sobrepor itens de mercearia explícitos
  IF n ~ '(richester|marilan|minueto|vitarella|miragina|casaredo|chocosol|escureto)'
     AND n !~ '\m(arroz|feijao|acucar|farinha|cafe|macarrao|oleo|leite)\M' THEN RETURN 'biscoitos'; END IF;
  -- Padaria
  IF n ~ '\m(pao|paes|panetone|torrada|bolo|croissant|rosca|baguete|broa|sonho)\M' THEN RETURN 'padaria'; END IF;
  -- Prontos & enlatados
  IF n ~ '(sardinha|atum|milho em conserva|ervilha em conserva|seleta de legumes|salsicha em conserva|miojo|macarrao instantaneo|lamen|sopa instantanea|azeitona|palmito)' THEN RETURN 'prontos'; END IF;
  -- Carnes
  IF n ~ '\m(carne|frango|peito|coxa|sobrecoxa|linguica|salsicha|bacon|hamburguer|patinho|coxao|contra ?file|picanha|acem|alcatra|costela|file mignon|pernil|charque|carne de sol|peixe|tilapia|camarao|maminha|fraldinha|cupim|paleta|toucinho|mocoto)\M' THEN RETURN 'carnes'; END IF;
  -- Laticínios
  IF n ~ '\m(leite|queijo|manteiga|margarina|iogurte|requeijao|nata|coalhada|creme de leite|leite condensado|danone|batavo|italac|itambe|qualy|vigor|piracanjuba)\M' THEN RETURN 'laticinios'; END IF;
  -- Doces
  IF n ~ '\m(chocolate|chocolates|bombom|bala|balas|brigadeiro|geleia|pacoca|goiabada|nutella|gelatina|marshmallow|pirulito|chiclete|halls|trident)\M'
     AND n !~ '(cereal|nescau|toddy|achocolat|cappuccino)' THEN RETURN 'doces'; END IF;
  -- Bebidas em pó
  IF n ~ '(nescau|toddy|achocolatado|leite em po|cappuccino|nescafe|suco em po|tang|refresco em po|cafe soluvel)' THEN RETURN 'bebidas_em_po'; END IF;
  -- Bebidas
  IF n ~ '(refrigerante|suco|agua mineral|cerveja|energetico|isotonico|coca ?cola|guarana|pepsi|amstel|skol|brahma|heineken|vinho|whisky|vodka|cachaca|agua de coco|cha gelado)' THEN RETURN 'bebidas'; END IF;
  -- Congelados
  IF n ~ '(congelad|sorvete|nuggets|batata frita congelada|pizza congelada|acai|polpa de fruta|picole)' THEN RETURN 'congelados'; END IF;
  -- Condimentos
  IF n ~ '(molho de tomate|extrato de tomate|ketchup|mostarda|maionese|shoyu|molho ingles|pimenta|colorau|acafrao|oregano|cominho|tempero|caldo de galinha|vinagre|azeite)' THEN RETURN 'condimentos'; END IF;
  -- Hortifruti
  IF n ~ '\m(banana|maca|laranja|tomate|cebola|batata|alho|cenoura|abacaxi|melancia|mamao|manga|uva|limao|alface|repolho|pimentao|abobora|chuchu|beterraba|couve|cheiro verde|coentro|verdura|legume|fruta)\M' THEN RETURN 'hortifruti'; END IF;
  -- Mercearia
  IF n ~ '\m(arroz|feijao|acucar|farinha|macarrao|espaguete|oleo|sal|fuba|amido|fermento|cuscuz|aveia|granola|cereal|goma|tapioca|leite de coco|rapadura|cafe)\M' THEN RETURN 'mercearia'; END IF;

  RETURN 'outros';
END;
$fn$;

UPDATE public.product_catalog
SET category = public.classify_product_category(display_name),
    updated_at = now()
WHERE category IS DISTINCT FROM public.classify_product_category(display_name);