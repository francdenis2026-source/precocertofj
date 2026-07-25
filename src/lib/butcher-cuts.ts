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

const FRANGO_RE =
  /\b(frango|sobrecoxa|coxinha da asa|coxa|asa|sassami|filezinho|moela|peito em bifes|file de peito|filé de peito)\b/i;
const SUINO_RE = /\b(porco|suin|suín|pernil|lombo|toucinho|costela de porco)\b/i;
const BOVINO_RE =
  /\b(picanha|alcatra|patinho|maminha|contra ?fil[eé]|ac[eé]m|ch[aã] de (dentro|fora)|costela|coxao|coxão|m[uú]sculo|canela|pescoco|pescoço|peito|p[aá] e p[eé]|carne mo[ií]da|f[ií]gado|cora[cç][aã]o|l[ií]ngua|bucho|panelada|dobradinha|osso|paleta|fil[eé]|carne de sol|charque)\b/i;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Retorna a proteína quando o produto é corte de balcão; `null` caso contrário.
 */
export function classifyButcherCut(
  productName: string,
  unit?: string | null,
): ButcherProtein | null {
  const raw = productName?.trim() ?? "";
  if (!raw) return null;
  if (PACKAGED_RE.test(raw)) return null;

  const n = norm(raw);
  const byWeight = norm(unit ?? "") === "kg";

  if (FRANGO_RE.test(n)) return "frango";
  if (SUINO_RE.test(n)) return "suino";
  if (BOVINO_RE.test(n)) return byWeight || /\bcarne\b|\bbovin/.test(n) ? "bovino" : "bovino";
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
