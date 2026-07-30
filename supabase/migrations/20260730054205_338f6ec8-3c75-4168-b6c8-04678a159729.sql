CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  WITH n AS (SELECT unaccent(lower(coalesce(name, ''))) AS s)
  SELECT CASE
    -- 1) Farmácia / saúde (mais específico primeiro para não cair em "leite"/"oleo")
    WHEN s ~ '\m(dipirona|paracetamol|ibuprofeno|analgesico|antitermico|xarope|comprimidos?|capsulas?|antigripal|cimegripe|resfenol|doralgina|aberalgina|neopiridin|vitaxon|vitergyl|tossexpec|apevitin|gastrogel|fisiofort|lavitan|nistatina|dorflex|buscopan|omeprazol|amoxicilina|loratadina)\M'
      OR s ~ '(soro fisiologico|agua oxigenada|pomada|antisseptico|anti-septico|vitamina c|fps ?[0-9]+|protetor solar|carrapaticida|veterinario)'
      THEN 'medicamentos'

    -- 2) Infantil
    WHEN s ~ '\m(fralda[s]?|mucilon|nanlac|nestogeno|neston|mamadeira|chupeta)\M'
      OR s ~ '(nan comfor|formula infantil|farinha lactea|lenco umedecido|sustagen kids|nutren kids|leite em po infantil)'
      THEN 'infantil'

    -- 3) Perfumaria / beleza
    WHEN s ~ '\m(esmalte|acetona|batom|rimel|perfume|colonia|tintura|coloracao|coreton|descolorante|talco|hidratante|gel fixador|cera modeladora|maquiagem|niely|impala|elseve)\M'
      OR s ~ '(body splash|creme de pentear|creme facial|creme hidratante|ultra fixacao|7 tons|cor & ?ton)'
      THEN 'perfumaria'

    -- 4) Papelaria / escolar
    WHEN s ~ '\m(caneta|lapis|lapiseira|caderno|borracha escolar|regua|mochila|apontador|giz|tesoura escolar|estojo)\M'
      OR s ~ '(papel a4|cola em bastao|cola escolar|cola para isopor|cola branca|lapis de cor|giz de cera|cola palhacinho|cola maxi)'
      THEN 'papelaria'

    -- 5) Hortifrúti / ovos
    WHEN s ~ '\m(tomate|batata|cebola|alface|cenoura|laranja|uva|melancia|mamao|abacaxi|limao|pimentao|verdura|legume|banana|maca|cheiro verde|coentro|couve|repolho|abobora|macaxeira|mandioca|inhame|beterraba|chuchu|maracuja|manga)\M'
      OR s ~ '(ovo de galinha|ovos brancos|bandeja de ovos|ovo caipira)'
      THEN 'hortifruti'

    -- 6) Laticínios
    WHEN s ~ '\m(leite|queijo|manteiga|margarina|iogurte|requeij[a-z]*|nata|coalhad[a-z]*|danone|batavo|italac|itamb[a-z]*|qualy|vigor|claybom|mococa|ninho|piracanjuba|elege|batavinho)\M'
      OR s ~ '(creme de leite|doce de leite|composto lacteo|bebida lactea|leite em po|leite condensado|leite uht|leite integral|leite desnatado|queijo mussarela)'
      THEN 'laticinios'

    -- 7) Carnes e frios (inclui enlatados de carne)
    WHEN s ~ '\m(frango|carne|carnes|bovin[a-z]*|suin[a-z]*|porco|peixe|tilapia|salmao|linguica|calabresa|salsicha[s]?|presunto|mortadela|bacon|hamburguer|pernil|costela|coxao|acem|patinho|picanha|alcatra|charque|fiambre|feijoada|sardinha|atum|sabbor)\M'
      THEN 'carnes'

    WHEN s ~ '\m(pao|torrada|bolo|panetone|rosquinha|croissant)\M' THEN 'padaria'

    WHEN s ~ '(biscoit[a-z]*|bolach[a-z]*|wafer|cream cracker|cracker|oreo|club social|richester|itamaraty|minueto|marilan|belma|miragina|pit stop|vitarella)'
      THEN 'biscoitos'

    -- 8) Snacks salgados → biscoitos (mesma prateleira no app)
    WHEN s ~ '\m(salgadinho|cheetos|fandangos|doritos|ruffles|pringles|torcida|baconzitos)\M' THEN 'biscoitos'

    WHEN s ~ '\m(chocolat[a-z]*|bombom|bala|brigadeiro|geleia|pacoca|goiabada|nutella|gelatina|marshmallow|pirulito|chiclete)\M'
      AND s !~ '(cereal|nescau|toddy|achocolat)' THEN 'doces'

    WHEN s ~ '\m(refrigerante|coca|guarana|pepsi|fanta|suco|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|antarctica|red bull|baly|refresco)\M'
      OR s ~ '(agua mineral|agua tonic|suco em po)' THEN 'bebidas'

    WHEN s ~ '\m(cafe|cappuccino|achocolatado|nescau|toddy|matte|mingau|sucrilhos|cereal|nutribom|brassuk|icebel|aveia|dugomes|pilao|serena|composto|cremogema|arrozina)\M'
      OR s ~ '(leite em po|cha de|cha preto|cha verde|cha leao|cereal matinal|corn flakes)' THEN 'bebidas_em_po'

    WHEN s ~ '(sabao em po|sabao em barra|sabao liquido|sabao gliceri|detergente|alvejante|amaciante|desinfet[a-z]*|agua sanitaria|multiuso|lava roupa|inseticida|repelente|limpa aluminio|limpa vidro|limpa forno|tira limo|pinho sol|hygifform|derrete gordura|agua sanit|desengord|aromatizante|limpador|esponja de aco|saco de lixo|passe bem|prendedor de roupa)'
      OR s ~ '\m(omo|ariel|ype|tixan|urca|brisa|downy|minuano|casaflor|zupp|cif|poderoso|detefon|raid|baygon|mortein|vanish|politriz|barrilha|cloro|algicida|hidroazul|clarificante|genco|citronela|citrolux|incenso|assim|bombril|assolan|vassoura|rodo)\M'
      OR s ~ '\m(mon bijou|buzz off|dengue|zika)\M'
      THEN 'limpeza'

    WHEN s ~ '(creme dental|gel dental|enxaguante bucal|antisseptico bucal|papel higienic[a-z]*|papel toalha|pasta de dente|fio dental)'
      OR s ~ '\m(sabonete|shampoo|condicionador|desodorante|antitranspirante|absorvente[s]?|algodao|hastes|cotonete|colgate|sorriso|closeup|dove|monange|herbissimo|nivea|protex|phebo|lux|francis|farnese|albany|kerabrasil|labotrat|laborene|tacto|bianco|cepacol|dentrat|listerine|plax|bucha|kolynos|davene|skala|avon|tabu|klass|paloma|mili|sublime|mimmo|florax|notavel|powerdent|carmed)\M'
      OR s ~ '(social clean|bianco multiuso|sensitive care)'
      THEN 'higiene'

    WHEN s ~ '\m(arroz|feijao|acucar|farinha|macarrao|espaguete|penne|parafuso|oleo|azeite|vinagre|sal|fuba|amido|fermento|tempero|colorif|coloral|colorau|extrato|polpa|maionese|catchup|ketchup|mostarda|azeitona|milho|ervilha|selita|seleta|cuscuz|canjica|flocao|ole|hellmanns?|oderich|heinz|araguaia|nissin|lamen|sandella|urbano|kumbuca|barralcool|bernardo|dallas|specialita|sofrutas|predilecta|sofruta|concordia|maggi|sopao)\M'
      OR s ~ '(nota 10|molho de tomate|molho tomate)'
      THEN 'mercearia'

    WHEN s ~ '\m(sorvete|congelad[a-z]*|nugget)\M' OR s ~ '(pizza congelada)' THEN 'congelados'
    ELSE 'outros'
  END
  FROM n;
$$;

-- Backfill: só preenche o que está sem categoria (não sobrescreve curadoria manual)
UPDATE public.product_catalog
SET category = public.classify_product_category(display_name),
    updated_at = now()
WHERE category IS NULL;

-- Corrige registros que ficaram genéricos ('outros') mas agora têm regra clara
UPDATE public.product_catalog
SET category = public.classify_product_category(display_name),
    updated_at = now()
WHERE category = 'outros'
  AND public.classify_product_category(display_name) <> 'outros';