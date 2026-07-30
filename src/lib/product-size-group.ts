/**
 * Agrupamento de ofertas por gramagem/volume.
 *
 * Sem isso, a lista "Preço por estabelecimento" mistura embalagens diferentes
 * (1L, 2L e 5L do mesmo produto) e o usuário compara valores que não são
 * comparáveis. Reaproveitamos `parseProductSize` (mesmo parser do preço por
 * unidade) para derivar uma chave estável por tamanho.
 */
import { parseProductSize } from "@/lib/unit-price";

export type SizeGroup = {
  /** Chave estável do grupo ("1000ml", "5kg", "12un" ou "sem-tamanho"). */
  key: string;
  /** Rótulo curto para exibição ("1L", "5kg", "12 un", "Tamanho não informado"). */
  label: string;
  /** Ordem natural: menor embalagem primeiro; sem tamanho por último. */
  sort: number;
};

const UNKNOWN: SizeGroup = {
  key: "sem-tamanho",
  label: "Tamanho não informado",
  sort: Number.MAX_SAFE_INTEGER,
};

function formatSize(total: number, base: "kg" | "L" | "un"): string {
  if (base === "un") return `${trim(total)} un`;
  if (base === "kg") return total < 1 ? `${trim(total * 1000)}g` : `${trim(total)}kg`;
  return total < 1 ? `${trim(total * 1000)}ml` : `${trim(total)}L`;
}

function trim(n: number): string {
  return Number(n.toFixed(3))
    .toString()
    .replace(".", ",");
}

/**
 * Deriva o grupo de tamanho de uma oferta.
 * Nunca lança: entradas sem medida detectável caem em "Tamanho não informado".
 */
export function sizeGroupOf(
  name: string | null | undefined,
  fallback?: { sizeValue?: number | null; sizeUnit?: string | null },
): SizeGroup {
  const parsed = parseProductSize(name ?? "", {
    sizeValue: fallback?.sizeValue ?? null,
    sizeUnit: fallback?.sizeUnit ?? null,
  });
  if (!parsed) return UNKNOWN;

  const totalBase =
    parsed.unitSizeUnit === "g" || parsed.unitSizeUnit === "ml"
      ? parsed.totalSize / 1000
      : parsed.totalSize;
  if (!Number.isFinite(totalBase) || totalBase <= 0) return UNKNOWN;

  const base = parsed.baseUnit;
  return {
    key: `${base}:${Number(totalBase.toFixed(4))}`,
    label: formatSize(totalBase, base),
    sort: totalBase,
  };
}

/** Ordena grupos: menor embalagem primeiro, desconhecido sempre por último. */
export function compareSizeGroups(a: SizeGroup, b: SizeGroup): number {
  if (a.sort !== b.sort) return a.sort - b.sort;
  return a.key.localeCompare(b.key);
}
