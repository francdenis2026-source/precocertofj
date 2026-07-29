/**
 * Classificação dos cortes de balcão (açougue) dentro de um mercado.
 *
 * Regra: só é corte de açougue quando o nome descreve um corte vendido no
 * balcão e NÃO traz gramagem/volume no nome (produtos embalados como
 * "Charque 400g" ou "Linguiça Seara 200g" continuam no catálogo geral).
 *
 * Isso mantém o setor açougue como uma área do próprio estabelecimento —
 * nenhum registro é duplicado e nenhum novo estabelecimento é criado.
 */

export type ButcherProtein = "bovino" | "frango" | "suino";

export const BUTCHER_PROTEINS: {
  id: ButcherProtein;
  label: string;
  short: string;
}[] = [
  { id: "bovino", label: "Bovino", short: "Boi" },
  { id: "frango", label: "Frango", short: "Frango" },
  { id: "suino", label: "Suíno", short: "Porco" },
];

const PACKAGED_RE = /\d+\s*(kg|g|mg|l|ml|un|cx|pct)\b/i;

// Produtos industrializados/processados que NÃO são cortes de balcão,
// mesmo quando o nome traz tokens genéricos de carne.
const INDUSTRIAL_RE =
  /\b(fiambre|mortadela|presunto|apresuntado|salame|salsicha|salsi[cç]ao|nuggets|empanad|hamb[uú]rguer|kibe congelad|lasanha|pizza|sazon|saz[oó]n|caldo knorr|maggi|sop[aã]o|conserva|enlatad|patê|pate|atum|sardinha em lata|corned beef|charque|jerked|carne seca em conserva|tempero|condiment|molho)\b/i;

const FRANGO_RE =
  /\b(frango|sobrecoxa|coxinha da asa|coxa|asa|sassami|filezinho|moela|peito em bifes|file de peito|filé de peito)\b/i;
const SUINO_RE = /\b(porco|suin|suín|pernil|lombo|toucinho|costela de porco|bacon|pancetta|panceta|copa lombo)\b/i;
const BOVINO_RE =
  /\b(picanha|alcatra|patinho|maminha|contra ?fil[eé]|ac[eé]m|ch[aã] de (dentro|fora)|costela|coxao|coxão|m[uú]sculo|canela|pescoco|pescoço|peito|p[aá] e p[eé]|carne mo[ií]da|f[ií]gado|cora[cç][aã]o|l[ií]ngua|bucho|panelada|dobradinha|osso|paleta|fil[eé]|carne de sol|charque|cupim|fraldinha|matambre|vazio|t-bone|entrecote)\b/i;

// Tokens genéricos que indicam produto de açougue quando a loja é açougue —
// usados apenas no fallback com `assumeButcher=true` para nunca deixar item
// de balcão fora do módulo de cortes.
const MEAT_GENERIC_RE =
  /\b(carne|bovin|su[ií]n|frango|ave|aves|peixe|pescad|lingui[cç]a?|salsi[cç]a?|hamb[uú]rguer|almondeg|kafta|espetinho|churrasc|defumad|toucinho|bacon)\b/i;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Retorna a proteína quando o produto é corte de balcão; `null` caso contrário.
 *
 * Quando `assumeButcher` é `true` (estabelecimento com `kind='acougue'`),
 * aplicamos uma classificação mais permissiva: itens cuja categoria é
 * "Carnes & Frios" ou cujo nome traz tokens genéricos de açougue (carne,
 * frango, linguiça, hambúrguer, etc.) são forçados como corte — assim
 * nenhum produto do açougue fica de fora do módulo de cortes.
 */
export function classifyButcherCut(
  productName: string,
  unit?: string | null,
  opts?: { assumeButcher?: boolean; category?: string | null },
): ButcherProtein | null {
  const raw = productName?.trim() ?? "";
  if (!raw) return null;

  const n = norm(raw);
  const byWeight = norm(unit ?? "") === "kg";
  const assume = !!opts?.assumeButcher;
  const catNorm = norm(opts?.category ?? "");
  const isMeatCategory = catNorm.includes("carne");

  // Rejeita industrializados/temperos/enlatados antes de qualquer classificação.
  if (INDUSTRIAL_RE.test(n)) return null;

  // Produtos embalados normalmente não são corte — mas se a loja é açougue
  // e a categoria é carne (ex.: "Linguiça caseira 500g"), aceitamos.
  if (PACKAGED_RE.test(raw) && !(assume && (isMeatCategory || MEAT_GENERIC_RE.test(n)))) {
    return null;
  }

  if (FRANGO_RE.test(n)) return "frango";
  if (SUINO_RE.test(n)) return "suino";
  if (BOVINO_RE.test(n)) return "bovino";

  // Fallback exclusivo para açougues: garante que todo item de balcão
  // apareça no módulo de cortes mesmo sem match de regex específico.
  // Exige venda por peso (kg) para evitar falso-positivo em mercados.
  if (assume && byWeight && (isMeatCategory || MEAT_GENERIC_RE.test(n))) {
    if (/\b(frango|ave)\b/.test(n)) return "frango";
    if (/\b(porco|su[ií]n|bacon|toucinho)\b/.test(n)) return "suino";
    return "bovino";
  }

  return null;
}

export function proteinLabel(p: ButcherProtein): string {
  return BUTCHER_PROTEINS.find((x) => x.id === p)?.label ?? "Corte";
}

/** Preço por quilo do corte, quando possível. */
export function cutPricePerKg(p: {
  price: number;
  pricePerUnit: number | null;
  unitLabel: string | null;
  unit: string | null;
}): number | null {
  if (p.unitLabel === "R$/kg" && p.pricePerUnit) return p.pricePerUnit;
  if (norm(p.unit ?? "") === "kg") return p.price;
  return null;
}
