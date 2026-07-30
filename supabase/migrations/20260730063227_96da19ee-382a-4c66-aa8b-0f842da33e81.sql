CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH n AS (SELECT unaccent(lower(coalesce(name, ''))) AS s)
  SELECT CASE
    -- 1) PET
    WHEN s ~ '\m(racao|carrapaticida|antipulgas|veterinario|veterinaria)\M'
      OR s ~ '(para caes|para gatos|petisco canino)' THEN 'pet'

    -- 2) BAZAR / UTILIDADES
    WHEN s ~ '\m(velas?|isqueiro|pilhas?|lampada|vassoura|rodo|balde|cabide|fosforo|graxa)\M'
      OR s ~ '(tinta nugget|incenso|prendedor de roupa|esponja de aco|bombril|assolan|corda de varal)' THEN 'bazar'

    -- 3) PAPELARIA / ESCOLAR
    WHEN s ~ '\m(caneta|lapis|lapiseira|caderno|regua|mochila|apontador|estojo)\M'
      OR s ~ '(papel a4|cola em bastao|cola escolar|cola para isopor|cola branca|cola maxi|cola palhacinho|lapis de cor|giz de cera|tesoura escolar)' THEN 'papelaria'

    -- 4) INFANTIL (antes de suplementos: "Sustagen Kids")
    WHEN s ~ '\m(fraldas?|mucilon|nanlac|nestogeno|neston|mamadeira|chupeta)\M'
      OR s ~ '(nan comfor|formula infantil|farinha lactea|lenco umedecido|sustagen kids|nutren kids|ninho fases)' THEN 'infantil'

    -- 5) SUPLEMENTOS
    WHEN s ~ '\m(creatina|whey|bcaa|glutamina|hipercalorico|termogenico|lavitan|vitaxon|vitergyl|sustagen)\M'
      OR s ~ '(max titanium|coqueteleira|polivitamin)' THEN 'suplementos'

    -- 6) MEDICAMENTOS
    WHEN s ~ '\m(dipirona|paracetamol|ibuprofeno|analgesico|antitermico|xarope|comprimidos?|capsulas?|antigripal|cimegripe|resfenol|doralgina|aberalgina|neopiridin|tossexpec|apevitin|gastrogel|fisiofort|nistatina|dorflex|buscopan|omeprazol|amoxicilina|loratadina)\M'
      OR s ~ '(soro fisiologico|agua oxigenada|pomada|curativo|band[- ]?aid|termometro|preservativo|seringa|gaze)' THEN 'medicamentos'

    -- 7) HIGIENE BUCAL
    WHEN s ~ '(creme dental|gel dental|pasta de dente|enxaguante bucal|antisseptico bucal|fio dental|escova dental|escova de dente|colgate|sorriso|close ?up|kolynos|listerine|cepacol|dentrat|dentalclean|powerdent|jadepro|plax|periocare|tandy)' THEN 'bucal'

    -- 8) CABELO
    WHEN s ~ '(shampoo|xampu|condicionador|creme de pentear|banho de creme|gela ?cola|gel fixador|ativador de cachos|to de cacho|finalizador|leave-?in|umectacao|progressiva|alisante|relaxante capilar|oleo de banana|pasta modeladora|cera modeladora|cera finalizadora|tintura|coloracao|descolorante|7 tons|salon line|salon opus|bio extratus|carmesim|elseve|dabelle|kerabrasil|darling|yamafix|ny looks|vita cap|coreton|niely|cor ?& ?ton|clear men|clear anticaspa|ultra fixacao|aqua fix|gelatina salon|creme seda)' THEN 'cabelo'

    -- 9) LIMPEZA (antes de perfumaria: "amaciante 10x mais perfume")
    WHEN s ~ '(sabao em po|sabao em barra|sabao liquido|sabao gliceri|lava roupas?|lava loucas?|detergente|alvejante|amaciante|desinfet|agua sanitaria|multiuso|inseticida|repelente|limpa aluminio|limpa vidro|limpa forno|tira limo|pinho sol|derrete gordura|desengord|aromatizante|odorizador|odorizante|limpador|soda caustica|passe bem|tira manchas)'
      OR s ~ '\m(omo|ariel|ype|tixan|urca|downy|minuano|comfort|brilhante|surf|vanish|detefon|raid|baygon|mortein|sbp|limpol|politriz|citronela|xmax|uzzilim|cloro)\M'
      OR s ~ '(mon bijou|buzz off|baby soft)' THEN 'limpeza'

    -- 10) PAPEL & DESCARTAVEIS
    WHEN s ~ '(papel higienic|papel toalha|guardanapo|saco de lixo|copo descartavel|prato descartavel|talher descartavel|papel aluminio|filme pvc|papel manteiga)' THEN 'papel_descartaveis'

    -- 11) HIGIENE PESSOAL (antes de perfumaria/pele: "desodorante talco", "sabonete esfoliante")
    WHEN s ~ '\m(sabonete|desodorante|antitranspirante|absorventes?|cotonete|algodao|hastes|barbear|gilette|gillette)\M'
      OR s ~ '(protetor diario|haste flexivel|hastes flexiveis|lenco de papel|absorvente interno|bucha banho|rexona|monange|herbissimo|protex|phebo|lux botanicals|francis|farnese|albany|labotrat|laborene|granado|johnson|old spice|tabu|carefree|intimus|always|sempre livre|cottonbaby|cotton line|ladysoft)' THEN 'higiene'

    -- 12) CUIDADOS COM A PELE
    WHEN s ~ '(hidratante|creme corporal|creme facial|gel facial|protetor solar|fps ?[0-9]+|cicatricure|cicaplast|la roche|antiestrias|esfoliante|leite de colonia|pos-?sol|sundown|neutrogena|nivea sun|ccskin|creme para as maos)' THEN 'cuidados_pele'

    -- 13) PERFUMARIA / MAQUIAGEM
    WHEN s ~ '\m(esmalte|acetona|batom|rimel|perfume|colonia|talco|maquiagem|impala|colorama)\M'
      OR s ~ '(removedor de esmalte|body splash|deo colonia|base liquida|top beauty)' THEN 'perfumaria'

    -- 14) SALGADINHOS
    WHEN s ~ '\m(salgadinho|cheetos|fandangos|doritos|ruffles|pringles|torcida|baconzitos)\M'
      OR s ~ '(amendoim japones|batata frita)' THEN 'snacks'

    -- 15) BISCOITOS (antes de carnes/laticinios)
    WHEN s ~ '(biscoit|bolach|wafer|cream cracker|cracker|oreo|club social|richester|marilan|minueto|vitarella|miragina|casaredo|chocosol|escureto|tortinhas|pit stop|delicita)' THEN 'biscoitos'

    -- 16) PADARIA
    WHEN s ~ '\m(pao|paes|torrada|bolo|panetone|rosquinha|croissant|bauducco)\M'
      OR s ~ '(mistura para bolo)' THEN 'padaria'

    -- 17) PRONTOS & ENLATADOS
    WHEN s ~ '(em conserva|sardinha|atum|feijoada|fiambre|milho verde lata|ervilha lata|seleta de legumes|macarrao instantaneo|miojo|lamen|cup noodles|sopao|creme de cebola)' THEN 'prontos'

    -- 18) CARNES
    WHEN s ~ '\m(frango|carnes?|bovin[a-z]*|suin[a-z]*|porco|peixe|tilapia|pirarucu|salmao|linguica|calabresa|salsichas?|presunto|mortadela|bacon|hamburguer|pernil|costela|coxao|acem|patinho|picanha|alcatra|charque|maminha|fraldinha|cupim|buchada|dobradinha)\M' THEN 'carnes'

    -- 19) LATICINIOS
    WHEN s ~ '\m(leite|queijo|manteiga|margarina|iogurte|requeijao|nata|coalhada|danone|batavo|italac|itambe|qualy|vigor|claybom|mococa|ninho|molico|piracanjuba|elege|mussarela)\M'
      OR s ~ '(creme de leite|doce de leite|composto lacteo|bebida lactea|leite condensado|soro de leite)' THEN 'laticinios'

    -- 20) DOCES
    WHEN s ~ '\m(chocolates?|bombom|balas?|brigadeiro|geleia|pacoca|goiabada|nutella|gelatina|marshmallow|pirulito|chiclete|halls|trident)\M'
      AND s !~ '(cereal|nescau|toddy|achocolat|cappuccino)' THEN 'doces'

    -- 21) BEBIDAS PRONTAS
    WHEN s ~ '\m(refrigerante|coca|guarana|pepsi|fanta|sucos?|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|antarctica|baly|refresco|dafruta)\M'
      OR s ~ '(red bull|agua mineral|agua de coco|suco em po|refresco em po)' THEN 'bebidas'

    -- 22) BEBIDAS EM PO / MATINAIS
    WHEN s ~ '\m(cafe|cappuccino|chocolatto|achocolatado|nescau|toddy|matte|mingau|sucrilhos|aveia|cremogema|arrozina|nescafe|pilao|brassuk)\M'
      OR s ~ '(cereal matinal|corn flakes|cha preto|cha verde|cha leao|leite em po|cereal nestle)' THEN 'bebidas_em_po'

    -- 23) CONGELADOS
    WHEN s ~ '\m(sorvete|picole|congelados?|nuggets?|empanado)\M'
      OR s ~ '(polpa de fruta|pizza congelada)' THEN 'congelados'

    -- 24) CONDIMENTOS / MOLHOS
    WHEN s ~ '(molho de tomate|molho ingles|molho de pimenta|extrato de tomate|ketchup|catchup|mostarda|maionese|vinagre|azeitona|tempero|colorau|colorif|pimenta do reino|shoyu|caldo de galinha|alho e sal|sazon)'
      OR s ~ '\m(sal|oregano|cominho|acafrao|louro)\M' THEN 'condimentos'

    -- 25) HORTIFRUTI
    WHEN s ~ '\m(tomate|batata|cebola|alface|cenoura|laranja|uva|melancia|mamao|abacaxi|limao|pimentao|verdura|legume|banana|maca|cheiro verde|coentro|couve|repolho|abobora|macaxeira|inhame|beterraba|chuchu|maracuja|manga|ovos?)\M'
      OR s ~ '(ovo de galinha|bandeja de ovos|batata lavada)' THEN 'hortifruti'

    -- 26) MERCEARIA (secos)
    WHEN s ~ '\m(arroz|feijao|acucar|adocante|farinha|mandioca|macarrao|espaguete|penne|parafuso|oleo|azeite|fuba|amido|fermento|milho|ervilha|cuscuz|canjica|flocao|granola|rapadura|trigo|polvilho)\M'
      OR s ~ '(leite de coco|coco ralado|proteina de soja)' THEN 'mercearia'

    ELSE 'outros'
  END
  FROM n;
$function$;