/**
 * Helpers cliente para aplicar a regra de açougue nas listagens de preços.
 *
 * Regra: quando um estabelecimento tem `kind='acougue'`, ele só deve aparecer
 * em rankings/comparações vendendo cortes de balcão reconhecidos por
 * `classifyButcherCut`. Produtos "diversos" cadastrados no açougue são
 * removidos para não poluírem os resultados.
 */
import { classifyButcherCut, type ButcherProtein } from "./butcher-cuts";

type StoreLike = { establishment_id?: string | null; store_name?: string | null };
type RowLike<S extends StoreLike> = {
  display_name?: string | null;
  size_unit?: string | null;
  stores?: S[] | null;
};

/**
 * Filtra as `stores` de uma linha removendo entradas de açougue quando o
 * produto não é corte. Retorna `null` quando restar menos de 2 lojas
 * (comparação exige pelo menos duas). Passa a linha adiante inalterada
 * quando nenhum açougue está envolvido.
 */
export function filterButcherStores<S extends StoreLike, R extends RowLike<S>>(
  row: R,
  butcherIds: ReadonlySet<string>,
  opts: { requireMinStores?: number } = {},
): R | null {
  const minStores = opts.requireMinStores ?? 2;
  const stores = Array.isArray(row.stores) ? row.stores : [];
  if (stores.length === 0) return row;

  // Se nenhuma loja da linha é açougue, mantém original (sem custo extra).
  const touchesButcher = stores.some(
    (s) => s?.establishment_id && butcherIds.has(s.establishment_id),
  );
  if (!touchesButcher) return row;

  const cut = classifyButcherCut(row.display_name ?? "", row.size_unit ?? null);
  const filteredStores = stores.filter((s) => {
    if (!s?.establishment_id) return true;
    if (!butcherIds.has(s.establishment_id)) return true;
    // açougue só permanece se o produto for corte
    return !!cut;
  });

  if (filteredStores.length < minStores) return null;
  return { ...row, stores: filteredStores };
}

/**
 * Filtra uma coleção inteira aplicando `filterButcherStores` linha a linha e
 * descartando as que ficarem sem comparação possível.
 */
export function applyButcherFilter<S extends StoreLike, R extends RowLike<S>>(
  rows: R[],
  butcherIds: ReadonlySet<string>,
  opts?: { requireMinStores?: number },
): R[] {
  if (butcherIds.size === 0) return rows;
  const out: R[] = [];
  for (const r of rows) {
    const next = filterButcherStores(r, butcherIds, opts);
    if (next) out.push(next);
  }
  return out;
}

/** Retorna a classificação de corte para exibição de badge (ou null). */
export function proteinOf(name: string, unit?: string | null): ButcherProtein | null {
  return classifyButcherCut(name ?? "", unit ?? null);
}
