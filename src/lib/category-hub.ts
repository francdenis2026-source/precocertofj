/**
 * Configuração dos nichos ("Pesquise por categoria").
 *
 * Cada categoria define:
 *  • quais estabelecimentos pertencem ao nicho (por `kind` ou pelo nome);
 *  • quais produtos pertencem ao nicho (por palavras-chave ou por serem
 *    de uma loja do nicho).
 *
 * O objetivo é nunca exibir num nicho um produto que não seja dele —
 * ex.: nada de detergente na área de Farmácia, nada de refrigerante
 * na área de Açougue.
 */
import { classifyButcherCut } from "@/lib/butcher-cuts";
import {
  categoryKeyOf,
  categoryLabel,
  classifyCategory,
  type ProductCategory,
} from "@/lib/product-category";

export type CategorySlug =
  | "supermercados"
  | "farmacias"
  | "acougues"
  | "padarias"
  | "hortifruti"
  | "bebidas"
  | "limpeza"
  | "higiene"
  | "pet"
  | "construcao"
  | "postos"
  | "papelaria";

export type CategoryDef = {
  slug: CategorySlug;
  label: string;
  short: string;
  desc: string;
  /** kinds de establishments que pertencem ao nicho */
  kinds: string[];
  /** nomes de estabelecimentos que também pertencem ao nicho */
  storeRe?: RegExp;
  /** regex de produtos do nicho (aplicada ao nome normalizado) */
  productRe?: RegExp;
  /**
   * Categorias canônicas (`classifyCategory`) aceitas no nicho.
   * Quando definido, é a autoridade: um produto só entra se sua categoria
   * canônica estiver na lista, ou se for `outros` e casar com `productRe`.
   * Evita que "Lava-Louças Maçã" caia em Hortifrúti ou "Macarrão Parafuso"
   * em Construção.
   */
  canonical?: ProductCategory[];
  /**
   * Quando `true`, apenas a categoria canônica vale — nem produtos "outros"
   * entram por palavra-chave. Usado em Hortifrúti, onde termos como "uva",
   * "banana" ou "batata" aparecem em refrigerantes, granolas e salgadinhos.
   */
  canonicalOnly?: boolean;
  /** produtos a excluir mesmo quando a loja é do nicho */
  excludeRe?: RegExp;
  /** true → todo produto de uma loja do nicho entra */
  allFromNicheStores: boolean;
  /** classificação especial (cortes de balcão) */
  butcherCuts?: boolean;
};

export const norm = (s: string): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const CATEGORY_DEFS: CategoryDef[] = [
  {
    slug: "supermercados",
    label: "Supermercados",
    short: "Mercado",
    desc: "Compra do mês: mercearia, laticínios, limpeza e higiene",
    kinds: ["mercado", "supermercado"],
    allFromNicheStores: true,
  },
  {
    slug: "farmacias",
    label: "Farmácias",
    short: "Farmácia",
    desc: "Medicamentos, higiene pessoal e plantão da cidade",
    kinds: ["farmacia", "drogaria"],
    storeRe: /(farmac|drogaria|drogar)/i,
    allFromNicheStores: true,
    canonical: ["medicamentos", "bucal", "cuidados_pele", "suplementos", "infantil"],
    productRe:
      /\b(dipirona|paracetamol|ibuprofeno|amoxicilina|antibiotic|pomada|xarope|comprimid|capsula|remedio|medicament|vitamina|lavitan|gripe|analgesic|soro fisiolog|curativo|band[- ]?aid|termometro|preservativo|fralda|absorvente|algodao|alcool 70|antisseptic|nistatina|omeprazol|loratadina|nimesulida)\b/,
  },
  {
    slug: "acougues",
    label: "Açougues",
    short: "Açougue",
    desc: "Cortes de balcão: bovino, frango e suíno",
    kinds: ["acougue", "açougue"],
    storeRe: /(a[cç]ougue|carne|frigor[ií]fico|recanto da carne)/i,
    allFromNicheStores: true,
    butcherCuts: true,
  },
  {
    slug: "padarias",
    label: "Padarias",
    short: "Padaria",
    desc: "Pães, bolos, biscoitos e confeitaria",
    kinds: ["padaria"],
    storeRe: /(padaria|panific)/i,
    allFromNicheStores: true,
    canonical: ["padaria", "biscoitos"],
    productRe:
      /\b(pao|paes|panetone|torrada|bolo|biscoit|bolach|rosca|croissant|sonho|cuca|massa folhada|fermento|mistura para bolo)\b/,
  },
  {
    slug: "hortifruti",
    label: "Hortifrúti",
    short: "Hortifrúti",
    desc: "Frutas, verduras, legumes, tubérculos, temperos e cogumelos",
    kinds: ["hortifruti", "sacolao"],
    storeRe: /(hortifr|sacol[aã]o|feira livre)/i,
    allFromNicheStores: true,
    // Só entra o que a classificação canônica considerar hortifruti — assim
    // "Lava-Louças Maçã", "Tempero Alho e Sal", "Molho de Tomate" e ovos
    // (que pertencem a laticínios) ficam fora.
    canonical: ["hortifruti"],
    canonicalOnly: true,
    productRe:
      /\b(banana|maca|ma[cç][aã]|laranja|limao|abacaxi|mamao|melancia|melao|uva|manga|abacate|goiaba|maracuja|tomate|cebola|batata|cenoura|alho|pimentao|repolho|alface|couve|rucula|agriao|espinafre|cheiro verde|coentro|salsa|cebolinha|hortela|macaxeira|mandioca|inhame|abobora|jerimum|chuchu|beterraba|pepino|quiabo|maxixe|jilo|vagem|berinjela|abobrinha|gengibre|cogumelo)\b/,

  },
  {
    slug: "bebidas",
    label: "Bebidas",
    short: "Bebidas",
    desc: "Refrigerantes, sucos, águas e adega",
    kinds: ["distribuidora", "adega"],
    storeRe: /(adega|distribuidora|bebidas)/i,
    allFromNicheStores: true,
    canonical: ["bebidas"],
    productRe:
      /\b(refrigerante|coca|guarana|pepsi|fanta|sprite|suco|nectar|agua mineral|agua com gas|cerveja|skol|brahma|antarctica|itaipava|heineken|amstel|budweiser|vinho|energetic|energetico|red bull|isotonic|gatorade|cachaca|whisky|vodka|refresco|tang|cha gelado|ice tea)\b/,
  },
  {
    slug: "limpeza",
    label: "Limpeza & Casa",
    short: "Limpeza",
    desc: "Produtos de limpeza, bazar e utilidades",
    kinds: [],
    allFromNicheStores: false,
    canonical: ["limpeza", "bazar", "papel_descartaveis"],
    productRe:
      /\b(sabao|detergente|amaciante|desinfetante|agua sanit|multiuso|limpa|lustra|desengordur|esponja|vassoura|rodo|saco de lixo|alvejante|cloro|veja|omo|ype|brilhante|pinho sol|candida)\b/,
  },
  {
    slug: "higiene",
    label: "Higiene & Beleza",
    short: "Higiene",
    desc: "Cuidados pessoais, cabelo e higiene bucal",
    kinds: [],
    allFromNicheStores: false,
    canonical: ["higiene", "cabelo", "bucal", "cuidados_pele", "perfumaria", "papel_descartaveis"],
    productRe:
      /\b(shampoo|condicionador|sabonete|creme dental|gel dental|pasta de dente|escova dental|enxaguante|desodorante|hidratante|papel higien|absorvente|fralda|lamina|barbear|talco|colonia|perfume|coloracao|tintura|creme de pentear)\b/,
  },
  {
    slug: "pet",
    label: "Pet",
    short: "Pet",
    desc: "Ração, higiene e acessórios para animais",
    kinds: ["petshop", "pet"],
    storeRe: /(pet ?shop)/i,
    allFromNicheStores: true,
    canonical: ["pet"],
    productRe: /\b(racao|ra[cç][aã]o|pedigree|whiskas|golden|petisco|antipulga|vermifugo|areia higienica|osso para cachorro)\b/,
  },
  {
    slug: "construcao",
    label: "Construção",
    short: "Construção",
    desc: "Materiais básicos, ferramentas e elétrica",
    kinds: ["construcao", "material_construcao"],
    // "material"/"deposito" sozinhos casavam com mercados comuns.
    storeRe: /(material de constru|constru[cç][aã]o|ferragem|dep[oó]sito de material)/i,
    allFromNicheStores: true,
    // Nenhuma categoria canônica é de construção: só entram itens sem
    // categoria ("outros") que casem com o vocabulário de obra. Isso evita
    // "Macarrão Parafuso", "Tinta Nugget" e "Lâmpada" (bazar) no nicho.
    canonical: [],
    productRe:
      /\b(cimento|areia lavada|brita|tijolo|telha|argamassa|rejunte|tinta (acrilica|latex|esmalte|pva)|pincel|rolo de la|tubo pvc|joelho pvc|prego|parafuso (de |para |philips|sextavado)|arame|trelica|vergalhao|fio flexivel|disjuntor|interruptor|luminaria|serra|martelo|furadeira|cal hidratada)\b/,
  },
  {
    slug: "postos",
    label: "Postos",
    short: "Postos",
    desc: "Combustíveis, lubrificantes e conveniência",
    kinds: ["posto", "posto_combustivel"],
    storeRe: /(posto|combust)/i,
    allFromNicheStores: true,
    canonical: [],
    productRe: /\b(gasolina|etanol|alcool comum|diesel|s10|gnv|oleo lubrificante|lubrificante|arla)\b/,
  },
  {
    slug: "papelaria",
    label: "Papelaria",
    short: "Papelaria",
    desc: "Material escolar e de escritório",
    kinds: ["papelaria"],
    storeRe: /(papelaria|livraria)/i,
    allFromNicheStores: true,
    canonical: ["papelaria"],
    // Atenção: "pasta" sozinho é ambíguo em supermercado ("sabão em pasta",
    // "doce de leite em pasta"), por isso exigimos qualificadores de papelaria.
    productRe:
      /\b(caderno|caneta|lapis|borracha escolar|apontador|cola branca|tesoura escolar|mochila|estojo|papel a4|fichario|regua|giz de cera|marca texto)\b|\bpasta (escolar|polionda|catalogo|plastica|de arquivo|sanfonada|com elastico|az)\b/,
  },
];

/**
 * Mapeamento único entre a taxonomia canônica de produto
 * (`product_catalog.category`, usada nas páginas do comércio) e os hubs
 * exibidos na homepage / em `/categoria/:slug`.
 *
 * É a fonte de verdade da unificação: toda categoria canônica pertence a
 * exatamente um hub "principal". Categorias que aparecem em mais de um nicho
 * (ex.: papel & descartáveis, que também é aceito em Higiene) ficam no hub
 * onde o usuário mais espera encontrá-las; a pertinência ampla continua
 * definida por `canonical` em `CATEGORY_DEFS`.
 */
export const HUB_BY_CANONICAL: Record<ProductCategory, CategorySlug | null> = {
  // Compra do mês
  mercearia: "supermercados",
  laticinios: "supermercados",
  congelados: "supermercados",
  prontos: "supermercados",
  condimentos: "supermercados",
  doces: "supermercados",
  snacks: "supermercados",
  // Nichos com hub próprio
  carnes: "acougues",
  hortifruti: "hortifruti",
  padaria: "padarias",
  biscoitos: "padarias",
  bebidas: "bebidas",
  bebidas_em_po: "bebidas",
  limpeza: "limpeza",
  bazar: "limpeza",
  papel_descartaveis: "limpeza",
  higiene: "higiene",
  bucal: "higiene",
  cabelo: "higiene",
  cuidados_pele: "higiene",
  perfumaria: "higiene",
  medicamentos: "farmacias",
  suplementos: "farmacias",
  infantil: "farmacias",
  pet: "pet",
  papelaria: "papelaria",
  // Sem hub: nada além de combustível/obra entra nesses nichos, e "outros"
  // por definição não tem taxonomia resolvida.
  outros: null,
};

/** Hub principal de uma categoria canônica (aceita rótulo ou slug). */
export function hubForCanonical(category: string | null | undefined): CategoryDef | null {
  const slug = HUB_BY_CANONICAL[categoryKeyOf(category)];
  return slug ? categoryBySlug(slug) : null;
}

/** Categorias canônicas que compõem um hub, na ordem da taxonomia. */
export function canonicalOfHub(slug: CategorySlug): ProductCategory[] {
  return (Object.keys(HUB_BY_CANONICAL) as ProductCategory[]).filter(
    (c) => HUB_BY_CANONICAL[c] === slug,
  );
}

/** Resumo legível das categorias de produto cobertas pelo hub. */
export function hubCoverageLabel(slug: CategorySlug): string {
  const list = canonicalOfHub(slug).map((c) => categoryLabel(c));
  return list.join(" · ");
}

export function categoryBySlug(slug: string): CategoryDef | null {
  return CATEGORY_DEFS.find((c) => c.slug === slug) ?? null;
}


/** Uma loja pertence ao nicho? */
export function storeInCategory(
  def: CategoryDef,
  store: { name: string; kind: string | null },
): boolean {
  const kind = norm(store.kind ?? "");
  if (def.kinds.some((k) => norm(k) === kind)) return true;
  if (def.storeRe && def.storeRe.test(store.name ?? "")) return true;
  return false;
}

/** Um produto pertence ao nicho? */
export function productInCategory(
  def: CategoryDef,
  product: { name: string; unit: string | null },
  fromNicheStore: boolean,
): boolean {
  const n = norm(product.name);
  if (!n) return false;
  if (def.excludeRe && def.excludeRe.test(n)) return false;

  if (def.butcherCuts) {
    // Cortes de balcão em qualquer mercado + tudo que vem de um açougue.
    if (classifyButcherCut(product.name, product.unit) !== null) return true;
    return fromNicheStore;
  }

  if (fromNicheStore && def.allFromNicheStores) return true;

  // Portão canônico: a categoria oficial do produto manda.
  if (def.canonical) {
    const canonical = classifyCategory(product.name);
    if (def.canonical.includes(canonical)) return true;
    if (def.canonicalOnly) return false;
    // Só produtos sem categoria conhecida podem entrar via palavra-chave.
    return canonical === "outros" && !!def.productRe && def.productRe.test(n);
  }

  if (def.productRe) return def.productRe.test(n);
  return false;
}

/** Chave de agrupamento de produtos equivalentes entre lojas. */
export function productKey(name: string): string {
  return norm(name).replace(/[^a-z0-9]+/g, " ").trim();
}
