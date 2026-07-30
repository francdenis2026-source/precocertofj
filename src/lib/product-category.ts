/**
 * Classificação canônica de categorias de produto (fonte única no cliente/servidor).
 *
 * Espelha `public.classify_product_category` no banco: mesmos slugs, mesma ordem
 * de avaliação e as mesmas proteções contra "armadilhas de sabor" — nomes que
 * contêm frutas/laticínios apenas como aroma ("Lava-Louças Minuano Maçã",
 * "Bolacha Cream Cracker Manteiga", "Kit Hidra Maracujá Shampoo"). Por isso as
 * regras de TIPO DE PRODUTO (limpeza, higiene, biscoitos) são avaliadas antes
 * das regras de INGREDIENTE (hortifruti, laticínios, doces).
 *
 * O texto é sempre normalizado por `normalizeSearchText`, então acentos nunca
 * quebram os limites de palavra (`\b`) das expressões regulares.
 */
import { normalizeSearchText } from "@/lib/text-normalize";

/** Slugs válidos em `product_catalog.category`. */
export const PRODUCT_CATEGORIES = [
  "pet",
  "bazar",
  "papelaria",
  "infantil",
  "suplementos",
  "medicamentos",
  "bucal",
  "cabelo",
  "limpeza",
  "papel_descartaveis",
  "higiene",
  "cuidados_pele",
  "perfumaria",
  "snacks",
  "biscoitos",
  "padaria",
  "prontos",
  "carnes",
  "laticinios",
  "doces",
  "bebidas",
  "bebidas_em_po",
  "congelados",
  "condimentos",
  "hortifruti",
  "mercearia",
  "outros",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Rótulos exibidos na interface para cada slug canônico. */
export const CATEGORY_LABELS: Record<string, string> = {
  bazar: "Bazar & utilidades",
  bebidas: "Bebidas",
  bebidas_em_po: "Bebidas em pó",
  biscoitos: "Biscoitos",
  bucal: "Higiene bucal",
  cabelo: "Cabelo",
  carnes: "Carnes",
  condimentos: "Condimentos",
  congelados: "Congelados",
  cuidados_pele: "Cuidados com a pele",
  doces: "Doces",
  higiene: "Higiene",
  hortifruti: "Hortifruti",
  infantil: "Infantil",
  laticinios: "Laticínios",
  limpeza: "Limpeza",
  medicamentos: "Medicamentos",
  mercearia: "Mercearia",
  outros: "Outros",
  padaria: "Padaria",
  papel_descartaveis: "Papel & descartáveis",
  papelaria: "Papelaria",
  perfumaria: "Perfumaria",
  pet: "Pet",
  prontos: "Prontos & Enlatados",
  snacks: "Salgadinhos",
  suplementos: "Suplementos",
};


/** Rótulo amigável de um slug (aceita valores desconhecidos sem quebrar). */
export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return CATEGORY_LABELS.outros;
  return CATEGORY_LABELS[slug] ?? slug.replace(/_/g, " ");
}

/**
 * Índice reverso rótulo → slug canônico. Necessário porque partes do sistema
 * (ex.: catálogo público da loja) trafegam o rótulo já traduzido; sem isso
 * seria impossível remapear para o hub correspondente.
 */
const CATEGORY_KEY_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([key, label]) => [label.toLowerCase(), key]),
);

/** Converte rótulo OU slug de volta ao slug canônico (`outros` quando desconhecido). */
export function categoryKeyOf(value: string | null | undefined): ProductCategory {
  const raw = (value ?? "").trim();
  if (!raw) return "outros";
  if ((PRODUCT_CATEGORIES as readonly string[]).includes(raw)) return raw as ProductCategory;
  const byLabel = CATEGORY_KEY_BY_LABEL[raw.toLowerCase()];
  return (byLabel as ProductCategory) ?? "outros";
}


type Rule = { category: ProductCategory; re: RegExp };

/**
 * Regras avaliadas em ordem. A primeira que casar vence.
 * `re` sempre roda sobre o texto normalizado (minúsculo, sem acento).
 */
/* ------------------------------------------------------------------ *
 * Hortifrúti — definição fechada
 * ------------------------------------------------------------------ */

/** Frutas in natura. */
const HF_FRUTAS = [
  "banana", "maca", "macas", "laranja", "limao", "mamao", "manga", "abacaxi",
  "melancia", "melao", "uva", "goiaba", "abacate", "morango", "acerola",
  "maracuja", "caju", "pera", "kiwi", "tangerina", "mexerica", "ameixa",
  "pessego", "figo", "jaca", "graviola", "cupuacu", "acai", "cajarana",
  "tamarindo", "pinha", "fruta do conde", "carambola", "romã", "roma",
];

/** Verduras (folhas). */
const HF_VERDURAS = [
  "alface", "couve", "couve flor", "brocolis", "espinafre", "rucula",
  "agriao", "repolho", "acelga", "chicoria", "almeirao",
];

/** Legumes e frutos rasteiros. */
const HF_LEGUMES = [
  "cenoura", "beterraba", "chuchu", "abobrinha", "abobora", "jerimum",
  "pepino", "tomate", "cebola", "alho", "pimentao", "berinjela", "quiabo",
  "maxixe", "jilo", "vagem", "ervilha fresca",
];

/** Tubérculos e raízes. */
const HF_TUBERCULOS = [
  "batata", "batata doce", "batata inglesa", "mandioca", "macaxeira", "aipim",
  "inhame", "cara", "mandioquinha", "gengibre", "curcuma", "acafrao da terra",
];

/** Temperos e ervas frescas. */
const HF_TEMPEROS = [
  "cheiro verde", "salsa", "salsinha", "cebolinha", "coentro", "hortela",
  "manjericao", "alecrim", "tomilho", "louro fresco", "oregano fresco",
];

/** Cogumelos e demais itens da seção. */
const HF_OUTROS = [
  "cogumelo", "cogumelos", "champignon fresco", "milho verde", "coco verde",
  "coco seco", "broto de alfafa", "broto de feijao", "pimenta de cheiro",
  "pimenta dedo de moca",
];

/** Todos os termos aceitos como hortifrúti (lista fechada). */
export const HORTIFRUTI_TERMS = [
  ...HF_FRUTAS,
  ...HF_VERDURAS,
  ...HF_LEGUMES,
  ...HF_TUBERCULOS,
  ...HF_TEMPEROS,
  ...HF_OUTROS,
] as const;

/**
 * Marcadores que descaracterizam o item como in natura. Um único match
 * derruba a classificação, mesmo que o nome cite uma fruta/legume.
 */
const HORTIFRUTI_BLOCKERS =
  "(em calda|em conserva|conserva|sabor|aroma|chips|palha|salgadinho|saponaceo|refrigerante|refresco|nectar|\\bsuco\\b|polpa|geleia|doce de|\\bem po\\b|\\blata\\b|\\benlatad|\\bml\\b|\\blitro|congelad|desidratad|\\bseca\\b|farofa|tempero pronto|desodorante|shampoo|sabonete|sabao|detergente|amaciante|biscoito|bolacha|iogurte|leite|cereal|barra|bombom|picole|sorvete|racao)";

const HORTIFRUTI_RE = new RegExp(
  `^(?!.*${HORTIFRUTI_BLOCKERS}).*\\b(${HORTIFRUTI_TERMS.map((t) =>
    t.replace(/ /g, "\\s+"),
  ).join("|")})\\b`,
);


const RULES: readonly Rule[] = [
  // 1) Pet
  {
    category: "pet",
    re: /\b(racao|carrapaticida|antipulgas|veterinario|veterinaria)\b|(para caes|para gatos|petisco canino)/,
  },

  // 1.5) Sabões de limpeza — antes de bazar, senão marcas de esponja
  // (assolan/bombril) puxam "Sabão em Pasta Assolan" para bazar.
  {
    category: "limpeza",
    re: /\bsabao\b\s*(em\s*)?(pasta|barra|po|liquido|de coco|neutro|glicerinado)?/,
  },

  // 2) Bazar & utilidades (graxa "tinta nugget", incenso, velas, esponja de aço)
  {
    category: "bazar",
    re: /\b(velas?|isqueiro|pilhas?|lampada|vassoura|rodo|balde|cabide|fosforo|graxa)\b|(tinta nugget|incenso|prendedor de roupa|esponja de aco|bombril|assolan|corda de varal)/,
  },

  // 3) Papelaria / escolar
  {
    category: "papelaria",
    re: /\b(caneta|lapis|lapiseira|caderno|regua|mochila|apontador|estojo)\b|(papel a4|cola em bastao|cola escolar|cola para isopor|cola branca|cola maxi|cola palhacinho|lapis de cor|giz de cera|tesoura escolar)/,
  },

  // 4) Infantil — antes de suplementos ("Sustagen Kids")
  {
    category: "infantil",
    re: /\b(fraldas?|mucilon|nanlac|nestogeno|neston|mamadeira|chupeta)\b|(nan comfor|formula infantil|farinha lactea|lenco umedecido|sustagen kids|nutren kids|ninho fases)/,
  },

  // 5) Suplementos
  {
    category: "suplementos",
    re: /\b(creatina|whey|bcaa|glutamina|hipercalorico|termogenico|lavitan|vitaxon|vitergyl|sustagen)\b|(max titanium|coqueteleira|polivitamin)/,
  },

  // 6) Medicamentos
  {
    category: "medicamentos",
    re: /\b(dipirona|paracetamol|ibuprofeno|analgesico|antitermico|xarope|comprimidos?|capsulas?|antigripal|cimegripe|resfenol|doralgina|aberalgina|neopiridin|tossexpec|apevitin|gastrogel|fisiofort|nistatina|dorflex|buscopan|omeprazol|amoxicilina|loratadina)\b|(soro fisiologico|agua oxigenada|pomada|curativo|band-?aid|termometro|preservativo|seringa|gaze)/,
  },

  // 7) Higiene bucal
  {
    category: "bucal",
    re: /(creme dental|gel dental|pasta de dente|enxaguante bucal|antisseptico bucal|fio dental|escova dental|escova de dente|colgate|sorriso|close ?up|kolynos|listerine|cepacol|dentrat|dentalclean|powerdent|jadepro|plax|periocare|tandy)/,
  },

  // 8) Cabelo — antes dos ingredientes: "Shampoo Melancia" não é hortifruti.
  {
    category: "cabelo",
    re: /(shampoo|xampu|condicionador|creme de pentear|banho de creme|gela ?cola|gel fixador|ativador de cachos|to de cacho|finalizador|leave-?in|umectacao|progressiva|alisante|relaxante capilar|oleo de banana|pasta modeladora|cera modeladora|cera finalizadora|tintura|coloracao|descolorante|7 tons|salon line|salon opus|bio extratus|carmesim|elseve|dabelle|kerabrasil|darling|yamafix|ny looks|vita cap|coreton|niely|cor ?& ?ton|clear men|clear anticaspa|ultra fixacao|aqua fix|gelatina salon|creme seda)/,
  },

  // 9) Limpeza — antes de perfumaria ("amaciante 10x mais perfume")
  {
    category: "limpeza",
    re: /(sabao em po|sabao em barra|sabao liquido|sabao gliceri|lava roupas?|lava loucas?|detergente|alvejante|amaciante|desinfet|agua sanitaria|multiuso|inseticida|repelente|limpa aluminio|limpa vidro|limpa forno|tira limo|pinho sol|derrete gordura|desengord|aromatizante|odorizador|odorizante|limpador|soda caustica|passe bem|tira manchas|saponaceo|sapolio)|\b(omo|ariel|ype|tixan|urca|downy|minuano|comfort|brilhante|surf|vanish|detefon|raid|baygon|mortein|sbp|limpol|politriz|citronela|xmax|uzzilim|cloro|cif|veja)\b|(mon bijou|buzz off|baby soft)/,
  },

  // 10) Papel & descartáveis
  {
    category: "papel_descartaveis",
    re: /(papel higienic|papel toalha|guardanapo|saco de lixo|copo descartavel|prato descartavel|talher descartavel|papel aluminio|filme pvc|papel manteiga)/,
  },

  // 11) Higiene pessoal — antes de perfumaria/pele ("desodorante talco")
  {
    category: "higiene",
    re: /\b(sabonete|desodorante|antitranspirante|absorventes?|cotonete|algodao|hastes|barbear|gilette|gillette)\b|(protetor diario|haste flexivel|hastes flexiveis|lenco de papel|absorvente interno|bucha banho|rexona|monange|herbissimo|protex|phebo|lux botanicals|francis|farnese|albany|labotrat|laborene|granado|johnson|old spice|tabu|carefree|intimus|always|sempre livre|cottonbaby|cotton line|ladysoft)/,
  },

  // 12) Cuidados com a pele
  {
    category: "cuidados_pele",
    re: /(hidratante|creme corporal|creme facial|gel facial|protetor solar|fps ?\d+|cicatricure|cicaplast|la roche|antiestrias|esfoliante|leite de colonia|pos-?sol|sundown|neutrogena|nivea sun|ccskin|creme para as maos)/,
  },

  // 13) Perfumaria / maquiagem
  {
    category: "perfumaria",
    re: /\b(esmalte|acetona|batom|rimel|perfume|colonia|talco|maquiagem|impala|colorama)\b|(removedor de esmalte|body splash|deo colonia|base liquida|top beauty)/,
  },

  // 14) Salgadinhos — "chips" cobre PointChips/Ruffles Chips e evita que
  // "Batata PointChips" caia em hortifrúti.
  {
    category: "snacks",
    re: /\b(salgadinho|cheetos|fandangos|doritos|ruffles|pringles|torcida|baconzitos|chips)\b|(point ?chips|amendoim japones|batata frita|batata palha|batata chips)/,
  },


  // 15) Biscoitos — antes de carnes/laticínios ("Club Social Presunto").
  // Marcas de biscoito só valem quando o nome não traz um item de mercearia
  // explícito (existe "Arroz Miragina", que não é bolacha).
  {
    category: "biscoitos",
    re: /(biscoit|bolach|wafer|cream cracker|cracker|oreo|club social|tortinhas|pit stop|delicita)/,
  },
  {
    category: "biscoitos",
    re: /^(?!.*\b(arroz|feijao|acucar|farinha|cafe|macarrao|oleo|leite)\b).*(richester|marilan|minueto|vitarella|miragina|casaredo|chocosol|escureto)/,
  },


  // 16) Padaria
  {
    category: "padaria",
    re: /\b(pao|paes|torrada|bolo|panetone|rosquinha|croissant|bauducco)\b|(mistura para bolo)/,
  },

  // 17) Prontos & enlatados — "em calda" evita "Abacaxi em Calda" em hortifrúti.
  {
    category: "prontos",
    re: /(em conserva|em calda|sardinha|atum|feijoada|fiambre|milho verde lata|ervilha lata|seleta de legumes|macarrao instantaneo|miojo|lamen|cup noodles|sopao|creme de cebola)/,
  },

  // 18) Carnes
  {
    category: "carnes",
    re: /\b(frango|carnes?|bovin[a-z]*|suin[a-z]*|porco|peixe|tilapia|pirarucu|salmao|linguica|calabresa|salsichas?|presunto|mortadela|bacon|hamburguer|pernil|costela|coxao|acem|patinho|picanha|alcatra|charque|maminha|fraldinha|cupim|buchada|dobradinha)\b/,
  },

  // 19) Laticínios
  {
    category: "laticinios",
    re: /\b(leite|queijo|manteiga|margarina|iogurte|requeijao|nata|coalhada|danone|batavo|italac|itambe|qualy|vigor|claybom|mococa|ninho|molico|piracanjuba|elege|mussarela)\b|(creme de leite|doce de leite|composto lacteo|bebida lactea|leite condensado|soro de leite)/,
  },

  // 20) Doces
  {
    category: "doces",
    re: /^(?!.*(cereal|nescau|toddy|achocolat|cappuccino)).*(\b(chocolates?|bombom|balas?|brigadeiro|geleia|pacoca|goiabada|nutella|gelatina|marshmallow|pirulito|chiclete|halls|trident|cappellaro|fini|dori|chicle|chiclete|drops|freegells|caramelo|pastilha|toffee)\b|jujuba|goma de mascar)/,
  },

  // 21) Bebidas prontas — marcas regionais de refrigerante (sukita, tubaína…)
  // vêm antes de hortifrúti para "Sukita Uva/Laranja" não virar fruta.
  {
    category: "bebidas",
    re: /\b(refrigerante|coca|guarana|pepsi|fanta|sprite|sukita|tubaina|itubaina|dolly|kuat|schin|soda|sucos?|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|antarctica|baly|refresco|dafruta)\b|(red bull|del valle|agua mineral|agua de coco|suco em po|refresco em po)/,
  },

  // 22) Bebidas em pó / matinais
  {
    category: "bebidas_em_po",
    re: /\b(cafe|cappuccino|chocolatto|achocolatado|nescau|toddy|matte|mingau|sucrilhos|aveia|cremogema|arrozina|nescafe|pilao|brassuk)\b|(cereal matinal|corn flakes|cha preto|cha verde|cha leao|leite em po|cereal nestle)/,
  },

  // 23) Congelados
  {
    category: "congelados",
    re: /\b(sorvete|picole|congelados?|nuggets?|empanado)\b|(polpa de |pizza congelada)/,
  },

  // 24) Condimentos / molhos
  {
    category: "condimentos",
    re: /(molho de tomate|molho ingles|molho de pimenta|extrato de tomate|ketchup|catchup|mostarda|maionese|vinagre|azeitona|tempero|colorau|colorif|pimenta do reino|shoyu|caldo de galinha|alho e sal|alho picado|alho triturado|sazon)|\b(sal|oregano|cominho|acafrao|louro)\b/,
  },

  // 25) Mercearia (secos) — antes de hortifrúti: "Macarrão com Ovos" e
  // "Granola com Banana" são secos, não frutas/legumes in natura.
  {
    category: "mercearia",
    re: /\b(arroz|feijao|acucar|adocante|farinha|mandioca|macarrao|massa|lasanha|talharim|espaguete|penne|parafuso|petybon|oleo|azeite|fuba|amido|fermento|cuscuz|canjica|flocao|granola|rapadura|trigo|polvilho)\b|(milho de pipoca|milho para pipoca|leite de coco|coco ralado|proteina de soja)/,
  },

  // 26) Ovos — NÃO são hortifrúti (definição oficial adotada no sistema).
  // Ficam em laticínios, como na seção "ovos e laticínios" dos mercados.
  {
    category: "laticinios",
    re: /\b(ovos?|duzia de ovos)\b|cartela de ovos|bandeja de ovos|ovo de galinha|ovo de codorna/,
  },

  // 27) Hortifrúti — por último e por LISTA FECHADA (hortaliças + frutas
  // in natura). Só entra quando o nome NÃO traz marcadores de produto
  // processado/industrializado (lata, sabor, calda, chips, pó…).
  {
    category: "hortifruti",
    re: HORTIFRUTI_RE,
  },

];

/** Subgrupos de hortifrúti (facilita cadastro, filtros e relatórios). */
export type HortifrutiSubgroup =
  | "frutas"
  | "verduras"
  | "legumes"
  | "tuberculos"
  | "temperos"
  | "cogumelos";

export const HORTIFRUTI_SUBGROUP_LABELS: Record<HortifrutiSubgroup, string> = {
  frutas: "Frutas",
  verduras: "Verduras",
  legumes: "Legumes",
  tuberculos: "Tubérculos e raízes",
  temperos: "Temperos e ervas",
  cogumelos: "Cogumelos",
};

/**
 * Subgrupo de hortifrúti do produto, ou `null` quando ele não pertence
 * à categoria. Nunca lança — entradas inválidas devolvem `null`.
 */
export function hortifrutiSubgroup(
  rawName: string | null | undefined,
): HortifrutiSubgroup | null {
  const text = normalizeSearchText(rawName);
  if (!text || classifyCategory(rawName) !== "hortifruti") return null;

  const has = (list: readonly string[]) =>
    list.some((t) => new RegExp(`\\b${t.replace(/ /g, "\\s+")}\\b`).test(text));

  // Ordem importa: "batata doce" é tubérculo antes de cair em legumes.
  if (has(HF_TUBERCULOS)) return "tuberculos";
  if (has(HF_TEMPEROS)) return "temperos";
  if (/cogumelo|champignon/.test(text)) return "cogumelos";
  if (has(HF_OUTROS)) return "legumes";
  if (has(HF_VERDURAS)) return "verduras";
  if (has(HF_LEGUMES)) return "legumes";
  if (has(HF_FRUTAS)) return "frutas";
  return null;
}



/**
 * Categoria canônica inferida do nome do produto.
 * Devolve `"outros"` quando nenhuma regra casa (nunca lança).
 */
export function classifyCategory(rawName: string | null | undefined): ProductCategory {
  const text = normalizeSearchText(rawName);
  if (!text) return "outros";
  for (const rule of RULES) {
    if (rule.re.test(text)) return rule.category;
  }
  return "outros";
}

/** Igual a `classifyCategory`, mas devolve `null` quando não há certeza. */
export function classifyCategoryOrNull(rawName: string | null | undefined): ProductCategory | null {
  const c = classifyCategory(rawName);
  return c === "outros" ? null : c;
}

/** Conveniência: slug + rótulo de exibição em uma chamada. */
export function classifyWithLabel(rawName: string | null | undefined): {
  key: ProductCategory;
  label: string;
} {
  const key = classifyCategory(rawName);
  return { key, label: categoryLabel(key) };
}
