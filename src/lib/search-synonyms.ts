/**
 * Registro de sinônimos e "termos de exclusão" para itens comuns.
 *
 * Motivação: ao buscar "sal" o usuário quer sal de cozinha, não
 * "margarina c/sal" ou "biscoito água e sal". Como o filtro base já usa
 * palavra inteira, este módulo agrega duas camadas extras:
 *
 * 1. `synonyms`: expressões alternativas que também devem satisfazer o
 *    match (ex.: "sal refinado", "sal grosso"). Um item passa se casar
 *    QUALQUER uma das expressões — o termo original ou um sinônimo.
 * 2. `excludeTokens`: palavras que, quando presentes, provavelmente
 *    indicam que o item principal é OUTRO (margarina, biscoito, temperos
 *    compostos, etc.). Só são aplicadas quando o usuário liga o modo
 *    "Item puro" na UI.
 *
 * O módulo é isomórfico (sem React, sem Supabase) para ser reutilizado
 * no backend e no frontend.
 */
import { normalize } from "@/lib/search-tokens";

export type SynonymGroup = {
  /** Token canônico (normalizado, sem acento, lowercase) — chave de match. */
  canonical: string;
  /** Frases equivalentes (serão normalizadas). Incluem a canônica. */
  synonyms: string[];
  /**
   * Tokens que, se presentes no nome do produto, indicam que NÃO é o
   * item puro (ex.: "margarina", "biscoito" contendo a palavra "sal").
   */
  excludeTokens: string[];
};

const GROUPS: SynonymGroup[] = [
  {
    canonical: "sal",
    synonyms: [
      "sal",
      "sal de cozinha",
      "sal refinado",
      "sal grosso",
      "sal moido",
      "sal marinho",
      "sal iodado",
    ],
    excludeTokens: [
      "margarina",
      "manteiga",
      "biscoito",
      "bolacha",
      "salgadinho",
      "salsicha",
      "aji",
      "tempero",
      "salgado",
      "amendoim",
      "batata",
      "pipoca",
      "requeijao",
      "queijo",
    ],
  },
  {
    canonical: "acucar",
    synonyms: [
      "acucar",
      "acucar refinado",
      "acucar cristal",
      "acucar demerara",
      "acucar mascavo",
    ],
    excludeTokens: ["adocante", "achocolatado", "biscoito", "bolacha", "doce"],
  },
  {
    canonical: "oleo",
    synonyms: ["oleo", "oleo de soja", "oleo de girassol", "oleo de milho", "oleo vegetal"],
    excludeTokens: ["azeite", "sardinha", "atum", "conserva"],
  },
  {
    canonical: "cafe",
    synonyms: ["cafe", "cafe em po", "cafe torrado", "cafe moido", "cafe soluvel"],
    excludeTokens: ["cafeteira", "filtro", "capsula", "bombom", "biscoito"],
  },
  {
    canonical: "leite",
    synonyms: ["leite", "leite integral", "leite desnatado", "leite semidesnatado", "leite uht"],
    excludeTokens: [
      "condensado",
      "creme de leite",
      "chocolate",
      "achocolatado",
      "biscoito",
      "doce de leite",
      "leite de coco",
      "leite em po", // é uma categoria à parte; se quiser, remova
      "sabonete",
      "shampoo",
      "condicionador",
      "hidratante",
      "proteina",
    ],
  },
  {
    canonical: "arroz",
    synonyms: ["arroz", "arroz branco", "arroz parboilizado", "arroz integral", "arroz agulhinha"],
    excludeTokens: ["arrozina", "biscoito", "bebida"],
  },
  {
    canonical: "feijao",
    synonyms: ["feijao", "feijao carioca", "feijao preto", "feijao fradinho"],
    excludeTokens: ["biscoito", "tempero"],
  },
];

const CANONICAL_INDEX = new Map<string, SynonymGroup>(
  GROUPS.map((g) => [normalize(g.canonical), g]),
);

/**
 * Constrói um índice de resolução unindo os grupos hardcoded (fallback)
 * com os grupos vindos do banco (painel admin). Os grupos do banco têm
 * prioridade e sobrescrevem o canônico correspondente.
 */
export function buildSynonymIndex(
  extra: SynonymGroup[] = [],
): Map<string, SynonymGroup> {
  const idx = new Map(CANONICAL_INDEX);
  for (const g of extra) {
    idx.set(normalize(g.canonical), g);
  }
  return idx;
}

/**
 * Dada a lista de tokens efetivos da busca, retorna o grupo canônico
 * correspondente — ou null se nenhum token bate com um canônico.
 * Aceita um índice customizado (ex.: mesclando grupos vindos do banco).
 */
export function resolveSynonymGroup(
  tokens: string[],
  index: Map<string, SynonymGroup> = CANONICAL_INDEX,
  rawQuery?: string,
): SynonymGroup | null {
  // Junta tokens tokenizados + a query bruta normalizada. A query bruta é
  // essencial para detectar frases de exclusão que contêm stopwords
  // (ex.: "leite em pó" — os tokens efetivos são só ["leite"], mas a
  // frase "leite em po" só aparece se olharmos a query original).
  const joined = [
    tokens.map((t) => normalize(t)).join(" "),
    normalize(rawQuery ?? ""),
  ]
    .filter(Boolean)
    .join(" ");
  for (const t of tokens) {
    const g = index.get(normalize(t));
    if (!g) continue;
    // Se o próprio query contém um termo de exclusão do grupo, o usuário
    // está buscando justamente o item "excluído" (ex.: "leite em pó" x
    // grupo "leite", "creme de leite" x grupo "leite"). Nesse caso
    // ignoramos o grupo para não filtrar os resultados desejados.
    const hasExcluded = g.excludeTokens.some((ex) => {
      const n = normalize(ex);
      if (!n) return false;
      return new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(joined);
    });
    if (hasExcluded) continue;
    return g;
  }
  return null;
}

/**
 * Testa se um nome (já normalizado ou não) casa com QUALQUER sinônimo
 * do grupo. Cada sinônimo é testado como sequência de tokens palavra-inteira.
 */
export function nameMatchesAnySynonym(
  name: string,
  group: SynonymGroup,
): boolean {
  const n = normalize(name);
  if (!n) return false;
  for (const phrase of group.synonyms) {
    const parts = normalize(phrase).split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    const ok = parts.every((p) =>
      new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(n),
    );
    if (ok) return true;
  }
  return false;
}

/**
 * Testa se o nome começa pelo item canônico ou por uma frase sinônima.
 *
 * Para buscas genéricas como "leite", isso separa o produto principal
 * ("Leite UHT Integral") de itens em que o termo aparece apenas como
 * ingrediente/atributo ("Doce de Leite", "Sabonete Proteína Leite").
 */
export function nameStartsWithPrimarySynonym(
  name: string,
  group: SynonymGroup,
): boolean {
  const words = normalize(name).split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return false;

  const phrases = [group.canonical, ...group.synonyms];
  return phrases.some((phrase) => {
    const parts = normalize(phrase).split(/[^a-z0-9]+/).filter(Boolean);
    if (parts.length === 0 || parts.length > words.length) return false;
    return parts.every((part, idx) => words[idx] === part);
  });
}

/**
 * Testa se um nome contém algum termo de exclusão do grupo.
 */
export function nameHasExcludedToken(
  name: string,
  group: SynonymGroup,
): boolean {
  const n = normalize(name);
  if (!n) return false;
  return group.excludeTokens.some((t) =>
    new RegExp(`\\b${normalize(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(n),
  );
}
