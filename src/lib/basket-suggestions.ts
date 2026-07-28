/**
 * Sugestões de substituição para itens faltantes na cesta de um mercado.
 *
 * Regra: quando um mercado não tem preço registrado para um essencial X,
 * procuramos, dentro dos itens que ELE tem, o essencial mais barato da MESMA
 * categoria (`EssentialCategory`) — desde que não seja ele próprio outro
 * item já usado. Como o "custo base" perdido, usamos:
 *   1) o `averagePrices[X]` do resultado (média entre os mercados), quando
 *      existir; ou
 *   2) o preço da opção substituta como aproximação.
 *
 * A ideia é permitir ao usuário completar a cesta trocando itens dentro da
 * mesma categoria e ver como isso muda o total do mercado E o veredito
 * (quem seria o campeão se aplicássemos essa troca em todos os mercados
 * que sofrem do mesmo faltante).
 *
 * A função é pura: recebe um BasketComparisonResult imutável e devolve
 * sugestões — não persiste nada.
 */

import { ESSENTIALS, type BasketComparisonResult, type EssentialCategory, type EssentialKey } from "./basket.functions";

export type BasketSubstitution = {
  /** Item faltante no mercado. */
  missingKey: EssentialKey;
  missingLabel: string;
  category: EssentialCategory;
  /** Item da mesma categoria mais barato disponível no mercado. */
  substituteKey: EssentialKey;
  substituteLabel: string;
  substitutePrice: number;
  substituteQuantity: number;
  /** Preço de referência (média entre mercados) do item faltante. */
  referencePrice: number | null;
  /** Quanto o total do mercado subiria/desceria se aplicássemos a troca. */
  deltaVsAverage: number;
  /** Novo total estimado do mercado após aplicar a substituição. */
  hypotheticalStoreTotal: number;
};

export type BasketVerdictHypothesis = {
  storeId: string;
  storeName: string;
  originalTotal: number;
  hypotheticalTotal: number;
  substitutionsApplied: number;
};

const CATEGORY_BY_KEY = new Map<EssentialKey, EssentialCategory>(
  ESSENTIALS.map((e) => [e.key, e.category]),
);

/**
 * Sugere substituições para todos os itens faltantes de um mercado.
 * Retorna array vazio se o mercado não existir ou estiver 100% coberto.
 */
export function suggestSubstitutions(
  data: BasketComparisonResult,
  storeId: string,
): BasketSubstitution[] {
  const store = data.stores.find((s) => s.establishmentId === storeId);
  if (!store) return [];

  // Itens que o mercado JÁ tem, indexados por key com preço e quantidade.
  const owned = new Map<EssentialKey, { price: number; quantity: number; label: string }>();
  for (const it of store.items) {
    if (it) owned.set(it.key, { price: it.price, quantity: it.quantity, label: it.label });
  }

  const suggestions: BasketSubstitution[] = [];

  data.essentials.forEach((ess, idx) => {
    const item = store.items[idx];
    if (item) return; // não faltou
    const cat = CATEGORY_BY_KEY.get(ess.key);
    if (!cat) return;

    // Candidatos: mesma categoria, presentes neste mercado, exceto o próprio faltante
    // e ordenados pelo menor custo unitário.
    const candidates = data.essentials
      .filter((e) => e.key !== ess.key && CATEGORY_BY_KEY.get(e.key) === cat)
      .map((e) => {
        const owned_ = owned.get(e.key);
        if (!owned_) return null;
        return { key: e.key, label: e.label, price: owned_.price, quantity: owned_.quantity };
      })
      .filter((x): x is { key: EssentialKey; label: string; price: number; quantity: number } => x != null)
      .sort((a, b) => a.price * a.quantity - b.price * b.quantity);

    if (candidates.length === 0) return;
    const pick = candidates[0];

    const ref = data.averagePrices[ess.key];
    const referencePrice = typeof ref === "number" ? ref : null;
    // Custo adicional real = preço do substituto (na sua quantidade) menos o que
    // teríamos gasto com o item original (referência × quantidade do original).
    const originalCost = (referencePrice ?? pick.price) * ess.quantity;
    const substituteCost = pick.price * pick.quantity;
    const deltaVsAverage = Number((substituteCost - originalCost).toFixed(2));
    const hypotheticalStoreTotal = Number((store.total + substituteCost).toFixed(2));

    suggestions.push({
      missingKey: ess.key,
      missingLabel: ess.label,
      category: cat,
      substituteKey: pick.key,
      substituteLabel: pick.label,
      substitutePrice: pick.price,
      substituteQuantity: pick.quantity,
      referencePrice,
      deltaVsAverage,
      hypotheticalStoreTotal,
    });
  });

  return suggestions;
}

/**
 * Aplica hipoteticamente as substituições sugeridas em todos os mercados
 * (cada mercado usa suas próprias substituições) e devolve o ranking
 * atualizado para revelar se o campeão mudaria.
 */
export function projectVerdictWithSubstitutions(
  data: BasketComparisonResult,
): BasketVerdictHypothesis[] {
  const projections: BasketVerdictHypothesis[] = data.stores.map((s) => {
    const subs = suggestSubstitutions(data, s.establishmentId);
    let extra = 0;
    for (const sub of subs) extra += sub.substitutePrice * sub.substituteQuantity;
    const hypothetical = Number((s.total + extra).toFixed(2));
    return {
      storeId: s.establishmentId,
      storeName: s.establishmentName,
      originalTotal: s.total,
      hypotheticalTotal: hypothetical,
      substitutionsApplied: subs.length,
    };
  });
  projections.sort((a, b) => a.hypotheticalTotal - b.hypotheticalTotal);
  return projections;
}
