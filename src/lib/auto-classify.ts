/**
 * Classificação automática de produtos a partir do texto lido nas fotos.
 *
 * Objetivo: reduzir digitação no cadastro por foto — a partir do nome extraído
 * pela IA (ou digitado), inferimos marca, unidade (g/ml/un/kg/L) e categoria.
 *
 * Todas as funções são puras e determinísticas (sem I/O), o que as torna
 * seguras para uso no cliente e fáceis de testar.
 */

export type AutoUnit = "g" | "kg" | "ml" | "L" | "un";

export interface AutoClassification {
  /** Categoria sugerida (slug usado no cadastro). */
  category: string | null;
  /** Marca sugerida, já com capitalização comercial. */
  brand: string | null;
  /** Unidade de medida detectada. */
  unit: AutoUnit | null;
  /** Quantidade detectada na embalagem (500 para "500g", 12 para "12 rolos"). */
  quantity: number | null;
}

/** Remove acentos e normaliza para comparação. */
function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Marcas conhecidas no catálogo local (ordem importa: mais específica primeiro). */
const BRANDS: readonly string[] = [
  "Girando Sol", "Tixan Ypê", "Puro Pomar", "Padre Nosso", "Bom Paladar",
  "Santa Cruz", "Dona Isabel", "Color Peps", "Bic Comfort", "Rayovac",
  "Brilhante", "Itamarati", "Todeschini", "Miragina", "Petybon", "Chamex",
  "Suzano", "Duetto", "Coimbra", "Kumbuca", "Urbano", "Galbani", "Nestlé",
  "Nesfit", "Nescau", "Toddynho", "Elegé", "Seara", "Tourinho", "Prat's",
  "Predilecta", "Triangulo", "Doce Dia", "Estrela", "Dallas", "Vitão",
  "Miha", "Soya", "Liza", "Urca", "The Queen", "Omo", "Ypê", "Coala",
  "Bom Ar", "Puro Ar", "Secar", "Glade", "Mili", "Dama", "Cotton", "Clara",
  "Fofinho", "Baly", "Maped", "Bazze", "Mentos", "Bic", "Impala", "Almasuper",
];

/** Palavras-chave por categoria (avaliadas em ordem). */
const CATEGORY_RULES: ReadonlyArray<{ category: string; keywords: readonly string[] }> = [
  // Farmácia primeiro: termos mais específicos evitam falsos positivos em "leite"/"oleo".
  { category: "medicamentos", keywords: ["dipirona", "paracetamol", "ibuprofeno", "analgesico", "antitermico", "xarope", "comprimido", "doralgina", "aberalgina", "resfenol", "neopiridin", "vitaxon", "vitergyl", "tossexpec", "apevitin", "gastrogel", "fisiofort", "pomada", "antigripal", "soro fisiologico", "creatina", "suplemento"] },
  { category: "infantil", keywords: ["fralda", "mucilon", "nan comfor", "nanlac", "nestogeno", "formula infantil", "ninho", "neston", "farinha lactea", "cremogema", "arrozina", "sustagen kids", "nutren kids", "lenco umedecido", "mamadeira", "kids"] },
  { category: "perfumaria", keywords: ["esmalte", "removedor", "batom", "tintura", "coloracao", "cor&ton", "perfume", "colonia", "hidratante", "protetor solar", "cicatricure", "cicaplast", "creme facial", "gel fixador", "gelatina", "cera modeladora", "pasta modeladora", "acetona"] },
  { category: "hortifruti", keywords: ["tomate", "maca", "banana", "batata", "cebola", "alface", "cenoura", "laranja", "uva", "melancia", "mamao", "abacaxi", "limao", "pimentao", "verdura", "legume"] },

  { category: "carnes", keywords: ["carne", "picanha", "alcatra", "coxao", "patinho", "acem", "costela", "frango", "peito", "coxa", "linguica", "bacon", "peixe", "file"] },
  { category: "laticinios", keywords: ["leite", "queijo", "requeijao", "manteiga", "iogurte", "creme de leite", "mussarela", "presunto", "margarina"] },
  { category: "limpeza", keywords: ["lava roupas", "sabao", "amaciante", "detergente", "desinfetante", "agua sanitaria", "alcool", "limpador", "odorizante", "odorizador", "saco de lixo", "vassoura", "esponja"] },
  { category: "higiene", keywords: ["papel higienico", "sabonete", "shampoo", "creme dental", "escova", "barbear", "absorvente", "fralda", "desodorante"] },
  { category: "bebidas", keywords: ["suco", "refrigerante", "energetico", "cerveja", "vinho", "agua mineral", "cha gelado"] },
  { category: "biscoitos", keywords: ["biscoito", "bolacha", "cream cracker", "recheado", "wafer"] },
  { category: "doces", keywords: ["chocolate", "bala", "goiabada", "doce de", "achocolatado em barra"] },
  { category: "congelados", keywords: ["congelado", "polpa", "sorvete", "hamburguer", "nuggets"] },
  { category: "padaria", keywords: ["pao", "bolo", "rosquinha", "torrada"] },
  { category: "papelaria", keywords: ["caneta", "lapis", "lapiseira", "caderno", "papel a4", "cola", "borracha", "regua", "mochila"] },
  { category: "mercearia", keywords: ["arroz", "feijao", "macarrao", "espaguete", "parafuso", "acucar", "cafe", "oleo", "sal", "farinha", "molho", "milho", "ervilha", "tempero", "canela", "pimenta", "lasanha"] },
];

/**
 * Detecta unidade e quantidade a partir do texto do produto.
 * Aceita formatos como "500g", "1,5 L", "900 ML", "12 rolos", "kg".
 */
export function detectUnit(rawName: string): { unit: AutoUnit | null; quantity: number | null } {
  const text = norm(rawName);

  const weight = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/);
  if (weight) {
    const amount = Number(weight[1].replace(",", "."));
    const rawUnit = weight[2];
    if (!Number.isFinite(amount)) return { unit: null, quantity: null };
    const unit: AutoUnit = rawUnit === "kg" ? "kg" : rawUnit === "g" ? "g" : rawUnit === "ml" ? "ml" : "L";
    return { unit, quantity: amount };
  }

  const packs = text.match(/(\d+)\s*(rolos?|unidades?|un|folhas?|pcs?|cores)\b/);
  if (packs) {
    const amount = Number(packs[1]);
    return { unit: "un", quantity: Number.isFinite(amount) ? amount : null };
  }

  // Produtos vendidos a granel: "Tomate kg", "Batata Doce Rosa kg".
  if (/\bkg\b/.test(text)) return { unit: "kg", quantity: 1 };
  if (/\blitro?s?\b/.test(text)) return { unit: "L", quantity: 1 };

  return { unit: null, quantity: null };
}

/** Detecta a marca comparando o nome com a lista de marcas conhecidas. */
export function detectBrand(rawName: string): string | null {
  const text = norm(rawName);
  for (const brand of BRANDS) {
    if (text.includes(norm(brand))) return brand;
  }
  return null;
}

/** Detecta a categoria a partir de palavras-chave do nome. */
export function detectCategory(rawName: string): string | null {
  const text = norm(rawName);
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.category;
  }
  return null;
}

/**
 * Classificação completa. Nunca lança — entradas inválidas devolvem campos nulos.
 */
export function autoClassify(rawName: string | null | undefined): AutoClassification {
  if (typeof rawName !== "string" || rawName.trim() === "") {
    return { category: null, brand: null, unit: null, quantity: null };
  }
  const name = rawName.trim();
  const { unit, quantity } = detectUnit(name);
  return { category: detectCategory(name), brand: detectBrand(name), unit, quantity };
}

/**
 * Completa apenas os campos vazios de um rascunho, preservando edições manuais.
 */
export function fillMissingFromName<
  T extends { productName?: string | null; brand?: string | null; unit?: string | null; category?: string | null },
>(draft: T): T {
  const guess = autoClassify(draft.productName);
  const isEmpty = (value: unknown) => value == null || value === "";
  return {
    ...draft,
    brand: isEmpty(draft.brand) && guess.brand ? guess.brand : draft.brand,
    unit: isEmpty(draft.unit) && guess.unit ? guess.unit : draft.unit,
    category: isEmpty(draft.category) && guess.category ? guess.category : draft.category,
  };
}
