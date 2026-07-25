import { parseProductSize } from "@/lib/unit-price";
import { normalize, tokenizeQuery } from "@/lib/search-tokens";

/**
 * Grupo equivalente ("mesma prateleira").
 *
 * Problema resolvido: o cache de comparação separa produtos por marca
 * (ex.: "Óleo de Soja Coamo 900ml", "Óleo de Soja Soya 900ml",
 * "Óleo de Soja Concórdia 900ml"). Ao buscar "óleo de soja", o resumo
 * escolhia UM desses itens como referência — normalmente o presente em mais
 * mercados — e escondia o preço realmente mais baixo do município.
 *
 * Regra: dado um resultado de referência (o mais relevante), consideramos
 * equivalentes os itens que têm o MESMO tamanho, a MESMA categoria (quando
 * informada) e que contêm todos os termos buscados. Assim a comparação
 * continua "maçã com maçã" (nunca mistura 900ml com 150ml, nem óleo de soja
 * com óleo capilar), mas passa a atravessar marcas — que é o que o usuário
 * espera ao procurar por um item genérico.
 */

/** Assinatura de tamanho normalizada (ex.: "900:ml"). Vazio = sem tamanho. */
export function sizeSignature(
  name: string | null | undefined,
  fallback?: { sizeValue?: number | null; sizeUnit?: string | null },
): string {
  const parsed = parseProductSize(name, fallback);
  if (parsed && parsed.totalSize > 0) {
    return `${Number(parsed.totalSize.toFixed(3))}:${parsed.unitSizeUnit}`;
  }
  const v = fallback?.sizeValue;
  const u = (fallback?.sizeUnit ?? "").toLowerCase();
  if (v != null && Number.isFinite(Number(v)) && Number(v) > 0 && u) {
    return `${Number(Number(v).toFixed(3))}:${u}`;
  }
  return "";
}

export type EquivalentCandidate = {
  name: string;
  category?: string | null;
  sizeValue?: number | null;
  sizeUnit?: string | null;
};

/**
 * Retorna os índices dos itens equivalentes ao item de referência (índice 0
 * da lista já ordenada por relevância). Sempre inclui a própria referência.
 */
export function selectEquivalentIndexes(
  items: EquivalentCandidate[],
  query: string,
  referenceIndex = 0,
): number[] {
  if (items.length === 0) return [];
  const ref = items[referenceIndex];
  if (!ref) return [];

  const tokens = tokenizeQuery(query).map((t) => normalize(t)).filter((t) => t.length >= 3);
  const refSize = sizeSignature(ref.name, { sizeValue: ref.sizeValue, sizeUnit: ref.sizeUnit });
  const refCat = (ref.category ?? "").trim().toLowerCase();

  const out: number[] = [];
  items.forEach((item, idx) => {
    if (idx === referenceIndex) {
      out.push(idx);
      return;
    }
    const size = sizeSignature(item.name, {
      sizeValue: item.sizeValue,
      sizeUnit: item.sizeUnit,
    });
    if (size !== refSize) return;
    const cat = (item.category ?? "").trim().toLowerCase();
    if (refCat && cat && cat !== refCat) return;
    if (tokens.length > 0) {
      const haystack = normalize(item.name);
      if (!tokens.every((t) => haystack.includes(t))) return;
    }
    out.push(idx);
  });

  // Sem termos de busca não faz sentido agrupar marcas diferentes.
  if (tokens.length === 0) return [referenceIndex];
  return out;
}

/** Rótulo do grupo: parte comum dos nomes (ex.: "Óleo de Soja 900ml"). */
export function equivalentGroupLabel(names: string[], fallback: string): string {
  if (names.length <= 1) return names[0] ?? fallback;
  const wordLists = names.map((n) => n.trim().split(/\s+/));
  const common: string[] = [];
  const first = wordLists[0];
  for (let i = 0; i < first.length; i += 1) {
    const w = first[i];
    if (wordLists.every((list) => normalize(list[i] ?? "") === normalize(w))) common.push(w);
    else break;
  }
  const label = common.join(" ").replace(/[-–,:]+$/, "").trim();
  return label.length >= 3 ? label : fallback;
}
