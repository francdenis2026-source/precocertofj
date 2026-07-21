
-- 1) Extension for trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Unique partial index on (establishment_id, barcode) for saved rows
CREATE UNIQUE INDEX IF NOT EXISTS scans_uniq_estab_barcode_saved
  ON public.scans (establishment_id, barcode)
  WHERE barcode IS NOT NULL AND status = 'salvo' AND user_id IS NULL;

-- 3) Trigram GIN index for fast similarity on normalized product keys
CREATE INDEX IF NOT EXISTS scans_product_name_trgm
  ON public.scans USING gin (public.normalize_product_key(product_name) gin_trgm_ops)
  WHERE status = 'salvo' AND user_id IS NULL;

-- 4) Improved classifier
CREATE OR REPLACE FUNCTION public.classify_product_category(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public','extensions'
AS $function$
  WITH n AS (SELECT unaccent(lower(coalesce(name, ''))) AS s)
  SELECT CASE
    WHEN s ~ '\y(leite|queijo|manteiga|margarina|iogurte|requeij|creme de leite|nata|coalhad|danone|batavo|italac|itamb|qualy|vigor|claybom|doce de leite|composto lacteo|bebida lactea|mococa|leite em po|leite condensado|leite uht|ninho|ita?mb|piracanjuba|elege|nescau lata)\y' THEN 'laticinios'
    WHEN s ~ '\y(frango|carne|boi|bovin|suin|porco|peixe|tilapia|salmao|linguica|calabresa|salsich|presunto|mortadel|bacon|hamburg|pernil|costela|coxao|acem|patinho|file|sabbor)\y' THEN 'carnes'
    WHEN s ~ '\y(pao|torrada|bolo|panetone|rosquinha|croissant)\y' THEN 'padaria'
    WHEN s ~ '\y(maca|banana|laranja|limao|mamao|melancia|abacaxi|uva|manga|pera|cebola|batata|tomate|alface|cenoura|abobora|abobrinha|pimentao|alho|beterraba|couve|repolho|mandioca)\y' AND s !~ '\y(detergent|desinfet|sabao|sabonete|limpa|molho|extrato|polpa|catchup|ketchup|maionese|inseticida|amaciante|creme dental|enxaguante)\y' THEN 'hortifruti'
    WHEN s ~ '\y(biscoit|bolach|wafer|cracker|cream cracker|oreo|club social|richester|itamaraty|minueto|marilan|belma|miragina|pit stop|vitarella)\y' THEN 'biscoitos'
    WHEN s ~ '\y(chocolat|bombom|bala|brigadeiro|geleia|pacoca)\y' AND s !~ '\y(cereal|nescau|toddy)\y' THEN 'doces'
    WHEN s ~ '\y(refrigerante|coca|guarana|pepsi|fanta|suco|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|agua mineral|agua tonic|antarctica)\y' THEN 'bebidas'
    WHEN s ~ '\y(cafe|achocolat|nescau|toddy|cha |matte|leite em po|mingau|sucrilhos|cereal|nutribom|brassuk|icebel|suco em po|aveia|dugomes|pilao|serena|composto)\y' THEN 'bebidas_em_po'
    WHEN s ~ '\y(sabao em po|sabao em barra|sabao liquido|detergent|alvejant|amaciant|desinfet|agua sanitaria|multiuso|lava roupa|omo|ariel|ype|tixan|urca|mon bijou|brisa|downy|minuano|casaflor|zupp|cif|pinho sol|poderoso|hygifform|derrete gordura|detefon|raid|baygon|mortein|buzz off|incenso|repelente|politriz|limpa aluminio|limpa vidro|limpa forno|barrilha|cloro|algicida|hidroazul|clarificante|genco|citronela|citrolux|tira limo|vanish|pinho|inseticida|lava roupas|lavagem|dengue|zika|assim)\y' THEN 'limpeza'
    WHEN s ~ '\y(creme dental|enxaguante bucal|sabonete|shampoo|condicionador|desodorante|antitranspirante|pasta de dente|papel higienic|papel toalha|absorvent|fralda|algodao|hastes|cotonete|colgate|sorriso|closeup|dove|monange|herbissimo|nivea|protex|phebo|lux|francis|farnese|albany|kerabrasil|labotrat|laborene|tacto|bianco|cepacol|dentrat|listerine|plax|bucha|kolynos|davene|skala|avon|tabu|bianco multiuso|klass|social clean|paloma|mili|sublime|mimmo|florax|notavel|tom|maxim)\y' THEN 'higiene'
    WHEN s ~ '\y(arroz|feijao|acucar|farinha|macarrao|espaguete|penne|parafuso|oleo|azeite|vinagre|sal|fuba|amido|fermento|tempero|colorif|coloral|extrato|polpa|molho|maionese|catchup|ketchup|mostarda|atum|sardinha|azeitona|milho|ervilha|selita|seleta|cuscuz|flocao|olé|ole|hellmann|oderich|heinz|araguaia|nissin|lamen|sandella|urbano|kumbuca|barralcool|bernardo|dallas|specialita|sofrutas|predilecta|sofruta|nota 10|concordia|sopao|maggi)\y' THEN 'mercearia'
    WHEN s ~ '\y(sorvete|congelad|pizza congelada|nugget)\y' THEN 'congelados'
    WHEN s ~ '\y(lampada|led|pilha|bateria|vela)\y' THEN 'outros'
    ELSE 'outros'
  END
  FROM n;
$function$;

-- 5) Enhanced dedup trigger (barcode-first, name-similarity fallback)
CREATE OR REPLACE FUNCTION public.dedupe_scan_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_size record;
BEGIN
  IF NEW.establishment_id IS NULL OR NEW.status <> 'salvo' OR NEW.user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Barcode-based dedup (exact match, same establishment)
  IF NEW.barcode IS NOT NULL AND length(trim(NEW.barcode)) > 0 THEN
    DELETE FROM public.scans
    WHERE id <> NEW.id
      AND establishment_id = NEW.establishment_id
      AND status = 'salvo'
      AND user_id IS NULL
      AND barcode = NEW.barcode
      AND created_at <= NEW.created_at;
  END IF;

  v_key := public.normalize_product_key(NEW.product_name);
  IF v_key = '' THEN
    RETURN NEW;
  END IF;

  SELECT size_value, size_unit INTO v_size FROM public.extract_product_size(NEW.product_name);

  -- Exact-key + same size + same price dedup (original behaviour)
  DELETE FROM public.scans
  WHERE id IN (
    SELECT s.id
    FROM public.scans s
    CROSS JOIN LATERAL public.extract_product_size(s.product_name) sz
    WHERE s.id <> NEW.id
      AND s.establishment_id = NEW.establishment_id
      AND s.status = 'salvo'
      AND s.user_id IS NULL
      AND public.normalize_product_key(s.product_name) = v_key
      AND COALESCE(sz.size_value, -1) = COALESCE(v_size.size_value, -1)
      AND sz.size_unit = v_size.size_unit
      AND ROUND(COALESCE(s.price_captured, 0)::numeric, 2) = ROUND(COALESCE(NEW.price_captured, 0)::numeric, 2)
      AND s.created_at <= NEW.created_at
  );

  -- Similarity-based dedup: same establishment, same size, similarity > 0.85, same price
  DELETE FROM public.scans
  WHERE id IN (
    SELECT s.id
    FROM public.scans s
    CROSS JOIN LATERAL public.extract_product_size(s.product_name) sz
    WHERE s.id <> NEW.id
      AND s.establishment_id = NEW.establishment_id
      AND s.status = 'salvo'
      AND s.user_id IS NULL
      AND public.normalize_product_key(s.product_name) <> v_key
      AND similarity(public.normalize_product_key(s.product_name), v_key) > 0.85
      AND COALESCE(sz.size_value, -1) = COALESCE(v_size.size_value, -1)
      AND sz.size_unit = v_size.size_unit
      AND ROUND(COALESCE(s.price_captured, 0)::numeric, 2) = ROUND(COALESCE(NEW.price_captured, 0)::numeric, 2)
      AND s.created_at <= NEW.created_at
  );

  RETURN NEW;
END;
$function$;
