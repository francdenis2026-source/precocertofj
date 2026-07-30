CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $fn$
DECLARE
  n text;
  hf_terms text := '(banana|maca|macas|laranja|limao|mamao|manga|abacaxi|melancia|melao|uva|goiaba|abacate|morango|acerola|maracuja|caju|pera|kiwi|tangerina|mexerica|ameixa|pessego|figo|jaca|graviola|cupuacu|acai|cajarana|tamarindo|pinha|fruta do conde|carambola|roma|alface|couve|couve flor|brocolis|espinafre|rucula|agriao|repolho|acelga|chicoria|almeirao|cenoura|beterraba|chuchu|abobrinha|abobora|jerimum|pepino|tomate|cebola|alho|pimentao|berinjela|quiabo|maxixe|jilo|vagem|ervilha fresca|batata|batata doce|batata inglesa|mandioca|macaxeira|aipim|inhame|cara|mandioquinha|gengibre|curcuma|acafrao da terra|cheiro verde|salsa|salsinha|cebolinha|coentro|hortela|manjericao|alecrim|tomilho|louro fresco|oregano fresco|cogumelo|cogumelos|champignon fresco|milho verde|coco verde|coco seco|broto de alfafa|broto de feijao|pimenta de cheiro|pimenta dedo de moca)';
  hf_block text := '(em calda|em conserva|conserva|sabor|aroma|chips|palha|salgadinho|saponaceo|refrigerante|refresco|nectar|\ysuco\y|polpa|geleia|doce de|\yem po\y|\ylata\y|\yenlatad|\yml\y|\ylitro|congelad|desidratad|\yseca\y|farofa|tempero pronto|desodorante|shampoo|xampu|condicionador|sabonete|sabao|detergente|amaciante|biscoito|bolacha|sequilho|rosquinha|wafer|torrada|\ybolo\y|iogurte|leite|cereal|barra|bombom|bala|pirulito|chiclete|gelatina|achocolatado|picole|sorvete|racao|\ycreme\y|pentear|\yhair\y|\ygel\y|hidratante|colonia|perfume|esmalte|creme dental|\ycha\y|infusao|\ycopo\y|garrafa|\ypet\y|energetico|isotonico|\y[0-9]+ ?(g|gr|grs|mg|ml)\y)';
BEGIN
  n := lower(unaccent(coalesce(name, '')));
  n := regexp_replace(n, '[^a-z0-9]+', ' ', 'g');
  n := btrim(n);
  IF n = '' THEN RETURN 'outros'; END IF;

  IF n ~ '\y(racao|carrapaticida|antipulgas|veterinario|veterinaria)\y' OR n ~ '(para caes|para gatos|petisco canino)' THEN RETURN 'pet'; END IF;
  IF n ~ '\ysabao\y' THEN RETURN 'limpeza'; END IF;
  IF n ~ '\y(vela|velas|isqueiro|pilha|pilhas|lampada|vassoura|rodo|balde|cabide|fosforo|graxa)\y' OR n ~ '(tinta nugget|incenso|prendedor de roupa|esponja de aco|bombril|assolan|corda de varal)' THEN RETURN 'bazar'; END IF;
  IF n ~ '\y(caneta|lapis|lapiseira|caderno|regua|mochila|apontador|estojo)\y' OR n ~ '(papel a4|cola em bastao|cola escolar|cola para isopor|cola branca|cola maxi|cola palhacinho|lapis de cor|giz de cera|tesoura escolar)' THEN RETURN 'papelaria'; END IF;
  IF n ~ '\y(fralda|fraldas|mucilon|nanlac|nestogeno|neston|mamadeira|chupeta)\y' OR n ~ '(nan comfor|formula infantil|farinha lactea|lenco umedecido|sustagen kids|nutren kids|ninho fases)' THEN RETURN 'infantil'; END IF;
  IF n ~ '\y(creatina|whey|bcaa|glutamina|hipercalorico|termogenico|lavitan|vitaxon|vitergyl|sustagen)\y' OR n ~ '(max titanium|coqueteleira|polivitamin)' THEN RETURN 'suplementos'; END IF;
  IF n ~ '\y(dipirona|paracetamol|ibuprofeno|analgesico|antitermico|xarope|comprimido|comprimidos|capsula|capsulas|antigripal|cimegripe|resfenol|doralgina|aberalgina|neopiridin|tossexpec|apevitin|gastrogel|fisiofort|nistatina|dorflex|buscopan|omeprazol|amoxicilina|loratadina)\y' OR n ~ '(soro fisiologico|agua oxigenada|pomada|curativo|band aid|bandaid|termometro|preservativo|seringa|gaze)' THEN RETURN 'medicamentos'; END IF;
  IF n ~ '(creme dental|gel dental|pasta de dente|enxaguante bucal|antisseptico bucal|fio dental|escova dental|escova de dente|colgate|sorriso|close up|kolynos|listerine|cepacol|dentrat|dentalclean|powerdent|jadepro|plax|periocare|tandy)' THEN RETURN 'bucal'; END IF;
  IF n ~ '(shampoo|xampu|condicionador|creme de pentear|creme para pentear|natu hair|\yhair\y|banho de creme|gela cola|gel fixador|ativador de cachos|to de cacho|finalizador|leave in|umectacao|progressiva|alisante|relaxante capilar|oleo de banana|pasta modeladora|cera modeladora|cera finalizadora|tintura|coloracao|descolorante|7 tons|salon line|salon opus|bio extratus|carmesim|elseve|dabelle|kerabrasil|darling|yamafix|ny looks|vita cap|coreton|niely|cor ton|clear men|clear anticaspa|ultra fixacao|aqua fix|gelatina salon|creme seda)' THEN RETURN 'cabelo'; END IF;
  IF n ~ '(lava roupa|lava roupas|lava louca|lava loucas|detergente|alvejante|amaciante|desinfet|agua sanitaria|multiuso|inseticida|repelente|limpa aluminio|limpa vidro|limpa forno|tira limo|pinho sol|derrete gordura|desengord|aromatizante|odorizador|odorizante|limpador|soda caustica|passe bem|tira manchas|saponaceo|sapolio)'
     OR n ~ '\y(omo|ariel|ype|tixan|urca|downy|minuano|comfort|brilhante|surf|vanish|detefon|raid|baygon|mortein|sbp|limpol|politriz|citronela|xmax|uzzilim|cloro|cif|veja)\y'
     OR n ~ '(mon bijou|buzz off|baby soft)' THEN RETURN 'limpeza'; END IF;
  IF n ~ '(papel higienic|papel toalha|guardanapo|saco de lixo|copo descartavel|prato descartavel|talher descartavel|papel aluminio|filme pvc|papel manteiga)' THEN RETURN 'papel_descartaveis'; END IF;
  IF n ~ '\y(sabonete|desodorante|antitranspirante|absorvente|absorventes|cotonete|algodao|hastes|barbear|gilette|gillette)\y'
     OR n ~ '(protetor diario|haste flexivel|hastes flexiveis|lenco de papel|absorvente interno|bucha banho|rexona|monange|herbissimo|protex|phebo|lux botanicals|francis|farnese|albany|labotrat|laborene|granado|johnson|old spice|tabu|carefree|intimus|always|sempre livre|cottonbaby|cotton line|ladysoft)' THEN RETURN 'higiene'; END IF;
  IF n ~ '(hidratante|creme corporal|creme facial|gel facial|protetor solar|fps ?[0-9]+|cicatricure|cicaplast|la roche|antiestrias|esfoliante|leite de colonia|pos sol|sundown|neutrogena|nivea sun|ccskin|creme para as maos)' THEN RETURN 'cuidados_pele'; END IF;
  IF n ~ '\y(esmalte|acetona|batom|rimel|perfume|colonia|talco|maquiagem|impala|colorama)\y' OR n ~ '(removedor de esmalte|body splash|deo colonia|base liquida|top beauty)' THEN RETURN 'perfumaria'; END IF;
  IF n ~ '\y(salgadinho|cheetos|fandangos|doritos|ruffles|pringles|torcida|baconzitos|chips)\y' OR n ~ '(point chips|amendoim japones|batata frita|batata palha|batata chips)' THEN RETURN 'snacks'; END IF;
  IF n ~ '(biscoit|bolach|sequilho|wafer|cream cracker|cracker|oreo|club social|tortinhas|pit stop|delicita)' THEN RETURN 'biscoitos'; END IF;
  IF n ~ '(richester|marilan|minueto|vitarella|miragina|casaredo|chocosol|escureto)'
     AND n !~ '\y(arroz|feijao|acucar|farinha|cafe|macarrao|oleo|leite)\y' THEN RETURN 'biscoitos'; END IF;
  IF n ~ '\y(pao|paes|torrada|bolo|panetone|rosquinha|croissant|bauducco)\y' OR n ~ '(mistura para bolo)' THEN RETURN 'padaria'; END IF;
  IF n ~ '(em conserva|em calda|milho verde (lata|copo|conserva)|milho verde ole|sardinha|atum|feijoada|fiambre|milho verde lata|ervilha lata|seleta de legumes|macarrao instantaneo|miojo|lamen|cup noodles|sopao|creme de cebola)' THEN RETURN 'prontos'; END IF;
  IF n ~ '\y(frango|carne|carnes|bovin[a-z]*|suin[a-z]*|porco|peixe|tilapia|pirarucu|salmao|linguica|calabresa|salsicha|salsichas|presunto|mortadela|bacon|hamburguer|pernil|costela|coxao|acem|patinho|picanha|alcatra|charque|maminha|fraldinha|cupim|buchada|dobradinha)\y' THEN RETURN 'carnes'; END IF;
  IF n ~ '\y(leite|queijo|manteiga|margarina|iogurte|requeijao|nata|coalhada|danone|batavo|italac|itambe|qualy|vigor|claybom|mococa|ninho|molico|piracanjuba|elege|mussarela)\y'
     OR n ~ '(creme de leite|doce de leite|composto lacteo|bebida lactea|leite condensado|soro de leite)' THEN RETURN 'laticinios'; END IF;
  IF n ~ '(\y(chocolate|chocolates|bombom|bala|balas|brigadeiro|geleia|pacoca|goiabada|nutella|gelatina|marshmallow|pirulito|chiclete|halls|trident|cappellaro|fini|dori|chicle|drops|freegells|caramelo|pastilha|toffee)\y|jujuba|goma de mascar)'
     AND n !~ '(cereal|nescau|toddy|achocolat|cappuccino)' THEN RETURN 'doces'; END IF;
  IF n ~ '\y(refrigerante|coca|guarana|pepsi|fanta|sprite|sukita|tubaina|itubaina|dolly|kuat|schin|soda|suco|sucos|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|antarctica|baly|refresco|dafruta)\y'
     OR n ~ '(red bull|del valle|agua mineral|agua de coco|suco em po|refresco em po)' THEN RETURN 'bebidas'; END IF;
  IF n ~ '\y(cafe|cappuccino|chocolatto|achocolatado|nescau|toddy|matte|mingau|sucrilhos|aveia|cremogema|arrozina|nescafe|pilao|brassuk|cha|chas)\y'
     OR n ~ '(cereal matinal|corn flakes|cha preto|cha verde|cha leao|cha real|cha mate|leite em po|cereal nestle)' THEN RETURN 'bebidas_em_po'; END IF;
  IF n ~ '\y(sorvete|picole|congelado|congelados|nugget|nuggets|empanado)\y' OR n ~ '(polpa de |pizza congelada)' THEN RETURN 'congelados'; END IF;
  IF n ~ '(molho de tomate|molho ingles|molho de pimenta|extrato de tomate|ketchup|catchup|mostarda|maionese|vinagre|azeitona|tempero|colorau|colorif|pimenta do reino|shoyu|caldo de galinha|alho e sal|alho picado|alho triturado|sazon)'
     OR n ~ '\y(sal|oregano|cominho|acafrao|louro)\y' THEN RETURN 'condimentos'; END IF;
  IF n ~ '\y(arroz|feijao|acucar|adocante|farinha|mandioca|macarrao|massa|lasanha|talharim|espaguete|penne|parafuso|petybon|oleo|azeite|fuba|amido|fermento|cuscuz|canjica|flocao|granola|rapadura|trigo|polvilho)\y'
     OR n ~ '(milho de pipoca|milho para pipoca|leite de coco|coco ralado|proteina de soja)' THEN RETURN 'mercearia'; END IF;
  IF n ~ '\y(ovo|ovos)\y' OR n ~ '(duzia de ovos|cartela de ovos|bandeja de ovos|ovo de galinha|ovo de codorna)' THEN RETURN 'laticinios'; END IF;
  IF n !~ hf_block AND n ~ ('\y' || hf_terms || '\y') THEN RETURN 'hortifruti'; END IF;

  RETURN 'outros';
END;
$fn$;

UPDATE public.product_catalog
SET category = public.classify_product_category(display_name)
WHERE category IS DISTINCT FROM public.classify_product_category(display_name);