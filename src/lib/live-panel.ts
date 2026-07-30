/**
 * Painel ao vivo (homepage) — lógica pura de apresentação das métricas.
 *
 * Separada da rota para permitir testes de integração determinísticos:
 * garante que mercados, preços e economia sempre renderizam um valor válido
 * e que falhas de consulta viram placeholder + mensagem de erro (nunca
 * números inventados).
 */

export type LivePanelKind = "markets" | "products" | "savings";

export type LivePanelMetric = {
  kind: LivePanelKind;
  /** Valor já formatado em pt-BR, ou "—" quando indisponível. */
  value: string;
  label: string;
  short: string;
};

export type LivePanelStats = {
  establishments?: number | null;
  products?: number | null;
  totalItems?: number | null;
  priceRecords?: number | null;
  ok?: boolean;
  error?: string | null;
} | null | undefined;

export type LivePanelEconomy = { avgSavingsPct?: number | null } | null | undefined;

export type LivePanelState = {
  metrics: LivePanelMetric[];
  /** true enquanto qualquer consulta essencial carrega. */
  loading: boolean;
  /** true quando os números não são confiáveis (erro de rede/RPC). */
  failed: boolean;
  /** Mensagem curta para o usuário quando `failed`. */
  errorMessage: string | null;
};

export const LIVE_PANEL_PLACEHOLDER = "—";
export const LIVE_PANEL_ERROR_MESSAGE =
  "Não foi possível carregar os números agora. Tente novamente em instantes.";

const nf = (n: number) => n.toLocaleString("pt-BR");

function positive(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function buildLivePanel(input: {
  stats: LivePanelStats;
  economy: LivePanelEconomy;
  statsLoading?: boolean;
  economyLoading?: boolean;
  statsError?: boolean;
  economyError?: boolean;
}): LivePanelState {
  const { stats, economy } = input;
  const loading = Boolean(input.statsLoading || input.economyLoading);
  const failed =
    !loading &&
    (Boolean(input.statsError) || (stats != null && stats.ok === false) || stats == null);

  const markets = failed ? null : positive(stats?.establishments);
  // "Produtos comparados" = SKUs únicos no catálogo (canônico).
  // Prefere `products` (contagem única) para bater com /estabelecimentos e
  // com a faixa de confiança da home. `totalItems`/`priceRecords` (leituras
  // por mercado) servem apenas como último fallback.
  const priceCount = failed
    ? null
    : (positive(stats?.products) ?? positive(stats?.totalItems) ?? positive(stats?.priceRecords));

  const savings = failed || input.economyError ? null : positive(economy?.avgSavingsPct);

  const metrics: LivePanelMetric[] = [
    {
      kind: "markets",
      value: markets != null ? nf(markets) : LIVE_PANEL_PLACEHOLDER,
      label: "Mercados parceiros",
      short: "Mercados",
    },
    {
      kind: "products",
      value: priceCount != null ? nf(priceCount) : LIVE_PANEL_PLACEHOLDER,
      label: "Produtos comparados",
      short: "Produtos",
    },
    {
      kind: "savings",
      // Uma casa decimal em pt-BR ("13,4%"): número medido, não estimativa.
      value:
        savings != null
          ? `${savings.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
          : LIVE_PANEL_PLACEHOLDER,
      label: "Economia média por produto",
      short: "Economia",
    },

  ];

  return {
    metrics,
    loading,
    failed,
    // Mensagem sempre amigável — nunca vazar texto cru do banco na UI.
    errorMessage: failed ? LIVE_PANEL_ERROR_MESSAGE : null,
  };
}
