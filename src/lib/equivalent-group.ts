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
  minPrice?: number | string | null;
  samples?: number | string | null;
};

function candidatePrice(item: EquivalentCandidate): number {
  const n = Number(item.minPrice);
  return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
}

function candidateSamples(item: EquivalentCandidate): number {
  const n = Number(item.samples);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

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

/**
 * Seleciona o melhor grupo equivalente para uma busca genérica.
 *
 * Diferente de `selectEquivalentIndexes`, que parte de uma referência já
 * escolhida, este helper testa cada item como âncora possível e escolhe o
 * cluster mais representativo; dentro dele o menor preço real vence. Isso
 * remove o viés de marcas mais populares sem cair no erro oposto de escolher
 * uma embalagem minúscula só porque sua etiqueta absoluta é menor.
 */
export function selectCheapestEquivalentIndexes(
  items: EquivalentCandidate[],
  query: string,
): number[] {
  if (items.length === 0) return [];
  const tokens = tokenizeQuery(query).map((t) => normalize(t)).filter((t) => t.length >= 3);
  if (tokens.length === 0) return [0];
  const querySize = sizeSignature(query);

  let best:
    | {
        indexes: number[];
        minPrice: number;
        itemCount: number;
        samples: number;
        referenceIndex: number;
        size: string;
      }
    | null = null;

  for (let referenceIndex = 0; referenceIndex < items.length; referenceIndex += 1) {
    const reference = items[referenceIndex];
    const size = sizeSignature(reference.name, {
      sizeValue: reference.sizeValue,
      sizeUnit: reference.sizeUnit,
    });
    if (querySize && size !== querySize) continue;
    const indexes = selectEquivalentIndexes(items, query, referenceIndex);
    if (indexes.length === 0) return;
    const minPrice = Math.min(...indexes.map((i) => candidatePrice(items[i])));
    const samples = indexes.reduce((sum, i) => sum + candidateSamples(items[i]), 0);
    const itemCount = indexes.length;
    if (
      !best ||
      (querySize && minPrice < best.minPrice - 0.005) ||
      (!querySize && itemCount > best.itemCount) ||
      (!querySize && itemCount === best.itemCount && samples > best.samples) ||
      ((!querySize || (querySize && Math.abs(minPrice - best.minPrice) <= 0.005)) &&
        itemCount === best.itemCount &&
        samples === best.samples &&
        minPrice < best.minPrice - 0.005) ||
      (Math.abs(minPrice - best.minPrice) <= 0.005 &&
        itemCount === best.itemCount &&
        samples === best.samples &&
        referenceIndex < best.referenceIndex)
    ) {
      best = { indexes, minPrice, itemCount, samples, referenceIndex, size };
    }
  }

  if (!best) return [0];
  return best.indexes;
}

function labelForSignature(sig: string): string | null {
  const [rawValue, unit] = sig.split(":");
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0 || !unit) return null;
  if (unit === "ml" && value >= 1000 && value % 1000 === 0) return `${value / 1000}L`;
  if (unit === "g" && value >= 1000 && value % 1000 === 0) return `${value / 1000}kg`;
  return `${value.toLocaleString("pt-BR")}${unit}`;
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
  const baseLabel = common.join(" ").replace(/[-–,:]+$/, "").trim();
  const label = baseLabel.length >= 3 ? baseLabel : fallback;
  const signatures = names.map((n) => sizeSignature(n)).filter(Boolean);
  const commonSignature = signatures.length === names.length && signatures.every((s) => s === signatures[0])
    ? signatures[0]
    : "";
  const sizeLabel = commonSignature ? labelForSignature(commonSignature) : null;
  if (!sizeLabel) return label;
  return normalize(label).includes(normalize(sizeLabel)) ? label : `${label} ${sizeLabel}`;
}
