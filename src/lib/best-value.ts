/**
 * "Melhor custo-benefício" — seleção do item com menor preço por unidade
 * (R$/kg ou R$/L) dentro de um conjunto de ofertas.
 *
 * Diferença conceitual (importante para o vocabulário do produto):
 *  - **Menor preço**: valor absoluto mais baixo na etiqueta. É o critério do
 *    selo da coroa. Sempre existe quando há ao menos uma oferta.
 *  - **Melhor custo-benefício**: menor preço por unidade normalizada. Só faz
 *    sentido quando as embalagens/tamanhos comparados são DIFERENTES — caso
 *    contrário ele coincide sempre com o menor preço e vira ruído visual.
 *
 * Por isso `pickBestValue` devolve `null` quando:
 *  - menos de 2 candidatos têm tamanho detectável;
 *  - os candidatos não compartilham a mesma base (kg vs L não se comparam);
 *  - todos os tamanhos totais são iguais (mesma embalagem);
 *  - a vantagem por unidade é irrelevante (< `minAdvantagePct`, padrão 1%).
 */
import { computeUnitPrice, type BaseUnit, type UnitPrice } from "@/lib/unit-price";
import { parseProductSize } from "@/lib/unit-price";

export type BestValueCandidate = {
  /** Identificador estável do item (nome do produto, id do grupo, etc.). */
  key: string;
  /** Preço da etiqueta, em reais. */
  price: number;
  /** Nome do produto — de onde o tamanho é extraído ("Arroz 5kg"). */
  name: string;
  /** Tamanho persistido, usado quando o nome não traz medida. */
  sizeValue?: number | null;
  sizeUnit?: string | null;
};

export type BestValueResult = {
  /** Chave do item vencedor em R$/unidade. */
  key: string;
  /** Preço por unidade normalizada do vencedor. */
  perBase: number;
  base: BaseUnit;
  /** Rótulo pronto: "R$ 5,49/kg". */
  label: string;
  /** Rótulo do tamanho do vencedor: "5kg", "6x350ml". */
  sourceLabel: string;
  /** Preço de etiqueta do vencedor. */
  price: number;
  /**
   * Economia percentual por unidade em relação ao candidato com MENOR PREÇO
   * absoluto. Zero quando o vencedor já é o mais barato da etiqueta.
   */
  advantagePct: number;
  /**
   * `true` quando o melhor custo-benefício NÃO é o de menor preço absoluto —
   * é exatamente o caso em que o selo agrega informação ao usuário.
   */
  differsFromCheapest: boolean;
  /** Chave do item de menor preço absoluto (referência da comparação). */
  cheapestKey: string;
};

/** Tamanho total normalizado (kg/L/un) usado para detectar embalagens iguais. */
function totalBaseOf(c: BestValueCandidate): number | null {
  const parsed = parseProductSize(c.name, {
    sizeValue: c.sizeValue,
    sizeUnit: c.sizeUnit,
  });
  if (!parsed) return null;
  if (parsed.unitSizeUnit === "g" || parsed.unitSizeUnit === "ml") {
    return parsed.totalSize / 1000;
  }
  return parsed.totalSize;
}

export function pickBestValue(
  candidates: BestValueCandidate[],
  options?: { minAdvantagePct?: number; requireDifferentSizes?: boolean },
): BestValueResult | null {
  const minAdvantagePct = options?.minAdvantagePct ?? 1;
  const requireDifferentSizes = options?.requireDifferentSizes ?? true;

  if (!Array.isArray(candidates) || candidates.length < 2) return null;

  type Scored = BestValueCandidate & { unit: UnitPrice; totalBase: number };
  const scored: Scored[] = [];
  for (const c of candidates) {
    if (!c || typeof c.price !== "number" || !Number.isFinite(c.price) || c.price <= 0) continue;
    const unit = computeUnitPrice(c.price, c.name, {
      sizeValue: c.sizeValue,
      sizeUnit: c.sizeUnit,
    });
    const totalBase = totalBaseOf(c);
    if (!unit || totalBase == null || totalBase <= 0) continue;
    scored.push({ ...c, unit, totalBase });
  }
  if (scored.length < 2) return null;

  // Só comparamos dentro da mesma base física. "R$/kg" vs "R$/L" não é
  // comparável, e misturar as duas produziria um vencedor sem sentido.
  const bases = new Set(scored.map((s) => s.unit.base));
  if (bases.size !== 1) return null;
  const base = scored[0].unit.base;

  // Embalagens idênticas → o custo-benefício coincide com o menor preço.
  if (requireDifferentSizes) {
    const sizes = new Set(scored.map((s) => s.totalBase.toFixed(4)));
    if (sizes.size < 2) return null;
  }

  const winner = scored.reduce((best, cur) =>
    cur.unit.perBase < best.unit.perBase ? cur : best,
  );
  const cheapest = scored.reduce((best, cur) => (cur.price < best.price ? cur : best));

  const advantagePct =
    cheapest.unit.perBase > 0
      ? ((cheapest.unit.perBase - winner.unit.perBase) / cheapest.unit.perBase) * 100
      : 0;

  const differsFromCheapest = winner.key !== cheapest.key;

  // Vantagem irrelevante quando o vencedor é outro item: não vale poluir a UI
  // com um segundo selo por 0,3% de diferença.
  if (differsFromCheapest && advantagePct < minAdvantagePct) return null;

  return {
    key: winner.key,
    perBase: winner.unit.perBase,
    base,
    label: winner.unit.label,
    sourceLabel: winner.unit.sourceLabel,
    price: winner.price,
    advantagePct: Math.max(0, advantagePct),
    differsFromCheapest,
    cheapestKey: cheapest.key,
  };
}

export default pickBestValue;
