
CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public','extensions'
AS $function$
  WITH n AS (SELECT unaccent(lower(coalesce(name, ''))) AS s)
  SELECT CASE
    WHEN s ~ '\m(leite|queijo|manteiga|margarina|iogurte|requeij[a-z]*|nata|coalhad[a-z]*|danone|batavo|italac|itamb[a-z]*|qualy|vigor|claybom|mococa|ninho|piracanjuba|elege|batavinho)\M'
      OR s ~ '(creme de leite|doce de leite|composto lacteo|bebida lactea|leite em po|leite condensado|leite uht|leite integral|leite desnatado|nescau lata|queijo mussarela)'
      THEN 'laticinios'
    WHEN s ~ '\m(frango|carne|carnes|bovin[a-z]*|suin[a-z]*|porco|peixe|tilapia|salmao|linguica|calabresa|salsicha[s]?|presunto|mortadela|bacon|hamburguer|pernil|costela|coxao|acem|patinho|file|sabbor)\M'
      THEN 'carnes'
    WHEN s ~ '\m(pao|torrada|bolo|panetone|rosquinha|croissant)\M' THEN 'padaria'
    WHEN s ~ '(biscoit[a-z]*|bolach[a-z]*|wafer|cream cracker|cracker|oreo|club social|richester|itamaraty|minueto|marilan|belma|miragina|pit stop|vitarella)'
      THEN 'biscoitos'
    WHEN s ~ '\m(chocolat[a-z]*|bombom|bala|brigadeiro|geleia|pacoca)\M' AND s !~ '(cereal|nescau|toddy|achocolat)' THEN 'doces'
    WHEN s ~ '\m(refrigerante|coca|guarana|pepsi|fanta|suco|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|antarctica)\M'
      OR s ~ '(agua mineral|agua tonic|suco em po)' THEN 'bebidas'
    WHEN s ~ '\m(cafe|achocolatado|nescau|toddy|matte|mingau|sucrilhos|cereal|nutribom|brassuk|icebel|aveia|dugomes|pilao|serena|composto)\M'
      OR s ~ '(leite em po|cha de|cha preto|cha verde|cereal matinal)' THEN 'bebidas_em_po'
    WHEN s ~ '(sabao em po|sabao em barra|sabao liquido|sabao gliceri|detergente|alvejante|amaciante|desinfet[a-z]*|agua sanitaria|multiuso|lava roupa|inseticida|repelente|limpa aluminio|limpa vidro|limpa forno|tira limo|pinho sol|hygifform|derrete gordura|agua sanit|desengord|aromatizante|limpador)'
      OR s ~ '\m(omo|ariel|ype|tixan|urca|brisa|downy|minuano|casaflor|zupp|cif|poderoso|detefon|raid|baygon|mortein|vanish|politriz|barrilha|cloro|algicida|hidroazul|clarificante|genco|citronela|citrolux|incenso|assim)\M'
      OR s ~ '\m(mon bijou|buzz off|dengue|zika)\M'
      THEN 'limpeza'
    WHEN s ~ '(creme dental|enxaguante bucal|papel higienic[a-z]*|papel toalha|pasta de dente)'
      OR s ~ '\m(sabonete|shampoo|condicionador|desodorante|antitranspirante|absorvente[s]?|fralda[s]?|algodao|hastes|cotonete|colgate|sorriso|closeup|dove|monange|herbissimo|nivea|protex|phebo|lux|francis|farnese|albany|kerabrasil|labotrat|laborene|tacto|bianco|cepacol|dentrat|listerine|plax|bucha|kolynos|davene|skala|avon|tabu|klass|paloma|mili|sublime|mimmo|florax|notavel|tom|maxim)\M'
      OR s ~ '(social clean|bianco multiuso|sensitive care)'
      THEN 'higiene'
    WHEN s ~ '\m(arroz|feijao|acucar|farinha|macarrao|espaguete|penne|parafuso|oleo|azeite|vinagre|sal|fuba|amido|fermento|tempero|colorif|coloral|extrato|polpa|maionese|catchup|ketchup|mostarda|atum|sardinha|azeitona|milho|ervilha|selita|seleta|cuscuz|flocao|ole|hellmanns?|oderich|heinz|araguaia|nissin|lamen|sandella|urbano|kumbuca|barralcool|bernardo|dallas|specialita|sofrutas|predilecta|sofruta|concordia|maggi|sopao)\M'
      OR s ~ '(nota 10|molho de tomate|molho tomate)'
      THEN 'mercearia'
    WHEN s ~ '\m(sorvete|congelad[a-z]*|nugget)\M' OR s ~ '(pizza congelada)' THEN 'congelados'
    WHEN s ~ '\m(lampada|led|pilha|bateria|vela)\M' THEN 'outros'
    ELSE 'outros'
  END
  FROM n;
$function$;
