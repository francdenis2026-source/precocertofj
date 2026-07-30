CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH n AS (SELECT unaccent(lower(coalesce(name, ''))) AS s)
  SELECT CASE
    -- 1) PET
    WHEN s ~ '(racao|carrapaticida|antipulgas|veterinari|para caes|para gatos|petisco canino|barrage)' THEN 'pet'

    -- 2) BAZAR / UTILIDADES (inclui graxa "tinta nugget", incenso, velas)
    WHEN s ~ '(tinta nugget|graxa|engraxate|incenso|vela |velas |isqueiro|pilha |pilhas|lampada|vassoura|rodo |balde|cabide|prendedor de roupa|esponja de aco|bombril|assolan|bucha de|pregador|fosforo|corda de varal)' THEN 'bazar'

    -- 3) PAPELARIA / ESCOLAR
    WHEN s ~ '\m(caneta|lapis|lapiseira|caderno|regua|mochila|apontador|estojo)\M'
      OR s ~ '(papel a4|cola em bastao|cola escolar|cola para isopor|cola branca|cola maxi|cola palhacinho|lapis de cor|giz de cera|tesoura escolar)' THEN 'papelaria'

    -- 4) SUPLEMENTOS
    WHEN s ~ '(creatina|whey|bcaa|max titanium|coqueteleira|hipercalorico|termogenico|glutamina|lavitan|polivitaminic|sustagen(?! kids)|complexo b|vitamina c|vitaxon|vitergyl)' THEN 'suplementos'

    -- 5) MEDICAMENTOS
    WHEN s ~ '\m(dipirona|paracetamol|ibuprofeno|analgesico|antitermico|xarope|comprimidos?|capsulas?|antigripal|cimegripe|resfenol|doralgina|aberalgina|neopiridin|tossexpec|apevitin|gastrogel|fisiofort|nistatina|dorflex|buscopan|omeprazol|amoxicilina|loratadina)\M'
      OR s ~ '(soro fisiologico|agua oxigenada|pomada|curativo|band[- ]?aid|termometro|preservativo|seringa|gaze)' THEN 'medicamentos'

    -- 6) INFANTIL
    WHEN s ~ '\m(fraldas?|mucilon|nanlac|nestogeno|neston|mamadeira|chupeta)\M'
      OR s ~ '(nan comfor|formula infantil|farinha lactea|lenco umedecido|sustagen kids|nutren kids|ninho fases)' THEN 'infantil'

    -- 7) HIGIENE BUCAL
    WHEN s ~ '(creme dental|gel dental|pasta de dente|enxaguante bucal|antisseptico bucal|fio dental|escova dental|escova de dente|colgate|sorriso|close ?up|kolynos|listerine|cepacol|dentrat|dentalclean|powerdent|jadepro|plax|periocare|tandy)' THEN 'bucal'

    -- 8) CABELO
    WHEN s ~ '(shampoo|xampu|condicionador|creme de pentear|banho de creme|gela ?cola|gel fixador|ativador de cachos|to de cacho|finalizador|leave-?in|umectacao|progressiva|alisante|relaxante capilar|oleo de banana|pasta modeladora|cera modeladora|cera finalizadora|tintura|coloracao|descolorante|7 tons|hene|salon line|salon opus|bio extratus|carmesim|elseve|dabelle|kerabrasil|darling|yamafix|ny looks|vita cap|coreton|niely|cor ?& ?ton|clear men|clear anticaspa|ultra fixacao|aqua fix|gelatina salon)' THEN 'cabelo'

    -- 9) CUIDADOS COM A PELE
    WHEN s ~ '(hidratante|creme corporal|creme facial|gel facial|protetor solar|fps ?[0-9]+|cicatricure|cicaplast|la roche|antiestrias|esfoliante|leite de colonia|pos-?sol|sundown|neutrogena|nivea sun|ccskin|creme para as maos)' THEN 'cuidados_pele'

    -- 10) PERFUMARIA / MAQUIAGEM
    WHEN s ~ '\m(esmalte|acetona|batom|rimel|perfume|colonia|talco|maquiagem|base liquida|impala|colorama)\M'
      OR s ~ '(removedor de esmalte|body splash|deo colonia|top beauty)' THEN 'perfumaria'

    -- 11) PAPEL & DESCARTAVEIS
    WHEN s ~ '(papel higienic|papel toalha|guardanapo|saco de lixo|copo descartavel|prato descartavel|talher descartavel|papel aluminio|filme pvc|papel manteiga)' THEN 'papel_descartaveis'

    -- 12) HIGIENE PESSOAL
    WHEN s ~ '\m(sabonete|desodorante|antitranspirante|absorventes?|cotonete|algodao|hastes|barbear|gilette|gillette)\M'
      OR s ~ '(protetor diario|haste flexivel|hastes flexiveis|lenco de papel|absorvente interno|bucha banho|sabonete liquido|rexona|dove|monange|herbissimo|protex|phebo|lux botanicals|francis|farnese|albany|labotrat|laborene|granado|johnson|above|old spice|avon|tabu|carefree|intimus|always|sempre livre|cottonbaby|cotton line|ladysoft)' THEN 'higiene'

    -- 13) LIMPEZA
    WHEN s ~ '(sabao em po|sabao em barra|sabao liquido|sabao gliceri|lava roupas?|lava loucas?|detergente|alvejante|amaciante|desinfet|agua sanitaria|multiuso|inseticida|repelente|limpa aluminio|limpa vidro|limpa forno|tira limo|pinho sol|derrete gordura|desengord|aromatizante|odorizador|odorizante|limpador|soda caustica|passe bem|cloro|tira manchas)'
      OR s ~ '\m(omo|ariel|ype|tixan|urca|downy|minuano|comfort|brilhante|surf|vanish|mon bijou|detefon|raid|baygon|mortein|sbp|limpol|politriz|citronela|buzz off|xmax|uzzilim|baby soft)\M' THEN 'limpeza'

    -- 14) SALGADINHOS
    WHEN s ~ '\m(salgadinho|cheetos|fandangos|doritos|ruffles|pringles|torcida|baconzitos|amendoim japones|batata frita)\M' THEN 'snacks'

    -- 15) BISCOITOS (antes de carnes/laticinios: "biscoito presunto", "cream cracker manteiga")
    WHEN s ~ '(biscoit|bolach|wafer|cream cracker|cracker|oreo|club social|richester|marilan|minueto|vitarella|miragina|casaredo|chocosol|escureto|tortinhas|pit stop|delicita)' THEN 'biscoitos'

    -- 16) PADARIA
    WHEN s ~ '\m(pao|paes|torrada|bolo|panetone|rosquinha|croissant|bauducco)\M'
      OR s ~ '(mistura para bolo)' THEN 'padaria'

    -- 17) PRONTOS & ENLATADOS
    WHEN s ~ '(em conserva|sardinha|atum|feijoada|fiambre|carne bovina em conserva|milho verde lata|ervilha lata|seleta de legumes|patela|macarrao instantaneo|miojo|lamen|cup noodles|sopao|creme de cebola)' THEN 'prontos'

    -- 18) CARNES
    WHEN s ~ '\m(frango|carnes?|bovin[a-z]*|suin[a-z]*|porco|peixe|tilapia|pirarucu|salmao|linguica|calabresa|salsichas?|presunto|mortadela|bacon|hamburguer|pernil|costela|coxao|acem|patinho|picanha|alcatra|charque|file|maminha|fraldinha|cupim|buchada|dobradinha)\M' THEN 'carnes'

    -- 19) LATICINIOS
    WHEN s ~ '\m(leite|queijo|manteiga|margarina|iogurte|requeijao|nata|coalhada|danone|batavo|italac|itambe|qualy|vigor|claybom|mococa|ninho|molico|piracanjuba|elege|mussarela)\M'
      OR s ~ '(creme de leite|doce de leite|composto lacteo|bebida lactea|leite condensado|soro de leite)' THEN 'laticinios'

    -- 20) DOCES
    WHEN s ~ '\m(chocolates?|bombom|balas?|brigadeiro|geleia|pacoca|goiabada|nutella|gelatina|marshmallow|pirulito|chiclete|halls|trident)\M'
      AND s !~ '(cereal|nescau|toddy|achocolat|cappuccino)' THEN 'doces'

    -- 21) BEBIDAS PRONTAS
    WHEN s ~ '\m(refrigerante|coca|guarana|pepsi|fanta|sucos?|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|antarctica|red bull|baly|refresco|dafruta)\M'
      OR s ~ '(agua mineral|agua de coco|suco em po|refresco em po)' THEN 'bebidas'

    -- 22) BEBIDAS EM PO / MATINAIS
    WHEN s ~ '\m(cafe|cappuccino|chocolatto|achocolatado|nescau|toddy|matte|mingau|sucrilhos|aveia|cremogema|arrozina|nescafe|pilao|brassuk)\M'
      OR s ~ '(cereal matinal|corn flakes|cha preto|cha verde|cha leao|leite em po|cereal nestle)' THEN 'bebidas_em_po'

    -- 23) CONGELADOS
    WHEN s ~ '\m(sorvete|picole|congelados?|nuggets?|acai polpa|polpa de fruta|pizza congelada|empanado)\M' THEN 'congelados'

    -- 24) CONDIMENTOS / MOLHOS
    WHEN s ~ '(molho de tomate|molho ingles|molho de pimenta|extrato de tomate|ketchup|catchup|mostarda|maionese|vinagre|azeitona|tempero|colorau|colorif|pimenta do reino|shoyu|caldo de galinha|alho e sal|sazon)'
      OR s ~ '\m(sal|oregano|cominho|acafrao|louro)\M' THEN 'condimentos'

    -- 25) HORTIFRUTI (por ultimo entre ingredientes: aromas ja foram capturados)
    WHEN s ~ '\m(tomate|batata|cebola|alface|cenoura|laranja|uva|melancia|mamao|abacaxi|limao|pimentao|verdura|legume|banana|maca|cheiro verde|coentro|couve|repolho|abobora|macaxeira|inhame|beterraba|chuchu|maracuja|manga|ovos?)\M'
      OR s ~ '(ovo de galinha|bandeja de ovos|batata lavada)' THEN 'hortifruti'

    -- 26) MERCEARIA (secos)
    WHEN s ~ '\m(arroz|feijao|acucar|adocante|farinha|mandioca|macarrao|espaguete|penne|parafuso|oleo|azeite|fuba|amido|fermento|milho|ervilha|cuscuz|canjica|flocao|granola|rapadura|leite de coco|coco ralado|proteina de soja|trigo|polvilho)\M' THEN 'mercearia'

    ELSE 'outros'
  END
  FROM n;
$function$;