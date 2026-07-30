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
  "medicamentos",
  "infantil",
  "papelaria",
  "limpeza",
  "higiene",
  "perfumaria",
  "biscoitos",
  "carnes",
  "laticinios",
  "padaria",
  "doces",
  "bebidas",
  "bebidas_em_po",
  "congelados",
  "hortifruti",
  "mercearia",
  "prontos",
  "condimentos",
  "outros",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Rótulos exibidos na interface para cada slug canônico. */
export const CATEGORY_LABELS: Record<string, string> = {
  bebidas: "Bebidas",
  bebidas_em_po: "Bebidas em pó",
  biscoitos: "Biscoitos",
  carnes: "Carnes",
  condimentos: "Condimentos",
  congelados: "Congelados",
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
  papelaria: "Papelaria",
  perfumaria: "Perfumaria",
  prontos: "Prontos & Enlatados",
};

/** Rótulo amigável de um slug (aceita valores desconhecidos sem quebrar). */
export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return CATEGORY_LABELS.outros;
  return CATEGORY_LABELS[slug] ?? slug.replace(/_/g, " ");
}

type Rule = { category: ProductCategory; re: RegExp };

/**
 * Regras avaliadas em ordem. A primeira que casar vence.
 * `re` sempre roda sobre o texto normalizado (minúsculo, sem acento).
 */
const RULES: readonly Rule[] = [
  // 0) Cosmético capilar / dermocosmético — prioridade máxima.
  // Esses nomes carregam sabores ("melancia", "acai", "uva") e palavras como
  // "gelatina"/"chiclete" que puxavam o item para doces ou hortifruti.
  {
    category: "perfumaria",
    re: /(salon line|bio extratus|salon opus|carmesim|gela cola|banho de creme|creme de pentear|pasta modeladora|cera modeladora|gel fixador|ativador de cachos|to de cacho|finalizador|leave-?in|umectacao|progressiva|alisante|relaxante capilar|oleo de banana|cicatricure|cicaplast|la roche|antiestrias|gel facial|creme facial|creme corporal|protetor solar|fps ?\d+|neutrogena|nivea sun)/,
  },

  // 0.1) Suplementos e acessórios esportivos (farmácia/saúde).
  {
    category: "medicamentos",
    re: /(creatina|whey|bcaa|max titanium|coqueteleira|hipercalorico|termogenico)/,
  },

  // 1) Farmácia/saúde — específico primeiro para não cair em "leite"/"oleo".
  {
    category: "medicamentos",
    re: /\b(dipirona|paracetamol|ibuprofeno|analgesico|antitermico|xarope|comprimidos?|capsulas?|antigripal|cimegripe|resfenol|doralgina|aberalgina|neopiridin|vitaxon|vitergyl|tossexpec|apevitin|gastrogel|fisiofort|lavitan|nistatina|dorflex|buscopan|omeprazol|amoxicilina|loratadina|soro fisiologico|agua oxigenada|pomada|antisseptico|vitamina c|veterinario)\b/,
  },


  // 2) Infantil
  {
    category: "infantil",
    re: /\b(fraldas?|mucilon|nanlac|nestogeno|neston|mamadeira|chupeta|nan comfor|formula infantil|farinha lactea|lenco umedecido|sustagen kids|nutren kids)\b/,
  },

  // 3) Papelaria/escolar
  {
    category: "papelaria",
    re: /\b(caneta|lapis|lapiseira|caderno|regua|mochila|apontador|tesoura escolar|estojo|papel a4|cola em bastao|cola escolar|cola branca|lapis de cor|giz de cera)\b/,
  },

  // 4) Limpeza — TIPO de produto antes de qualquer aroma de fruta/ingrediente.
  {
    category: "limpeza",
    re: /\b(sabao|detergente|alvejante|amaciante|desinfetante|desinfetantes|agua sanitaria|multiuso|lava roupas?|lava loucas?|lava tudo|inseticida|repelente|limpa aluminio|limpa vidro|limpa forno|tira limo|pinho sol|derrete gordura|desengordurante|aromatizante|odorizador|odorizante|limpador|esponja|saco de lixo|vassoura|rodo|prendedor de roupa|cloro|agua sanit|bombril|assolan|veja|cif|omo|ariel|tixan|downy|comfort|minuano|brilhante amaciante|mon bijou|vanish)\b/,
  },

  // 5) Higiene pessoal — também antes de aromas ("Shampoo Maracujá").
  {
    category: "higiene",
    re: /\b(shampoo|xampu|condicionador|creme dental|gel dental|pasta de dente|enxaguante bucal|fio dental|papel higienico|papel toalha|absorventes?|sabonete|desodorante|antitranspirante|cotonete|hastes flexiveis|algodao|escova de dente|aparelho de barbear|barbear|protetor diario|lenco de papel|colgate|sorriso|close ?up|listerine|cepacol|dentalclean|kolynos|powerdent|protex|lux|dove|monange|nivea|francis|phebo|palmolive|rexona|old spice|above|paloma|neve|personal|mili|intimus|always|sempre livre)\b/,
  },

  // 6) Perfumaria/beleza
  {
    category: "perfumaria",
    re: /\b(esmalte|acetona|removedor de esmalte|batom|rimel|perfume|colonia|deo colonia|tintura|coloracao|descolorante|talco|hidratante corporal|creme de pentear|creme facial|gel fixador|cera modeladora|maquiagem|base liquida|niely|impala|elseve|salon line|dabelle|body splash)\b/,
  },

  // 7) Biscoitos — antes de laticínios ("Cream Cracker Manteiga") e doces.
  {
    category: "biscoitos",
    re: /\b(biscoitos?|bolachas?|wafer|cream cracker|cracker|oreo|club social|richester|marilan|minueto|vitarella|miragina|salgadinho|cheetos|fandangos|doritos|ruffles|pringles|torcida|baconzitos)\b/,
  },

  // 8) Carnes e frios
  {
    category: "carnes",
    re: /\b(frango|carnes?|bovina|bovino|suina|suino|porco|peixe|tilapia|salmao|linguica|calabresa|salsichas?|presunto|mortadela|bacon|hamburguer|pernil|costela|coxao|acem|patinho|picanha|alcatra|charque|fiambre|feijoada|sardinha|atum)\b/,
  },

  // 9) Laticínios
  {
    category: "laticinios",
    re: /\b(leite|queijo|manteiga|margarina|iogurte|requeijao|nata|coalhada|danone|batavo|italac|itambe|qualy|vigor|claybom|mococa|piracanjuba|elege|creme de leite|leite condensado|composto lacteo|bebida lactea|mussarela)\b/,
  },

  // 10) Padaria
  { category: "padaria", re: /\b(pao|paes|torrada|bolo|panetone|rosquinha|croissant)\b/ },

  // 11) Doces
  {
    category: "doces",
    re: /\b(chocolates?|bombom|balas?|brigadeiro|geleia|pacoca|goiabada|nutella|gelatina|marshmallow|pirulito|chiclete|doce de leite)\b/,
  },

  // 12) Bebidas prontas
  {
    category: "bebidas",
    re: /\b(refrigerante|coca cola|guarana|pepsi|fanta|sucos?|nectar|energetico|cerveja|vinho|whisky|vodka|cachaca|red bull|baly|refresco|agua mineral|agua de coco)\b/,
  },

  // 13) Bebidas em pó / matinais
  {
    category: "bebidas_em_po",
    re: /\b(cafe|cappuccino|achocolatado|nescau|toddy|matte|mingau|sucrilhos|cereal matinal|aveia|pilao|brassuk|cremogema|arrozina|chas?|leite em po|corn flakes)\b/,
  },

  // 14) Congelados
  { category: "congelados", re: /\b(congelados?|sorvete|nuggets?|polpa de fruta|pizza congelada)\b/ },

  // 15) Hortifrúti — por último entre os ingredientes, evitando aromas.
  {
    category: "hortifruti",
    re: /\b(tomate|batata|cebola|alface|cenoura|laranja|uva|melancia|mamao|abacaxi|limao|pimentao|verdura|legume|banana|maca|cheiro verde|coentro|couve|repolho|abobora|macaxeira|inhame|beterraba|chuchu|maracuja|manga|ovos?)\b/,
  },

  // 16) Mercearia (catch-all de secos)
  {
    category: "mercearia",
    re: /\b(arroz|feijao|acucar|farinha|mandioca|macarrao|espaguete|penne|parafuso|oleo|azeite|vinagre|sal|fuba|amido|fermento|tempero|colorau|colorifico|extrato|maionese|catchup|ketchup|mostarda|azeitona|milho|ervilha|seleta|cuscuz|canjica|flocao|lamen|noodles|sopao|molho de tomate|granola|nissin|quaker)\b/,
  },
];

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
