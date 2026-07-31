import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Price } from "@/components/ds/Price";
import { MiniTrend, TrendBadge, formatUpdatedAt } from "@/components/app/PriceTrend";
import { getPublicPriceHistory } from "@/lib/store-public-history.functions";
import type { SparkPoint } from "@/components/charts/Sparkline";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

/**
 * Histórico de preços de um produto dentro de um estabelecimento:
 * mini visualização de variação + data da última atualização + linha do tempo.
 */
export function ProductPriceHistory({
  establishmentId,
  productName,
  enabled = true,
  limit = 30,
  className,
}: {
  establishmentId: string;
  productName: string;
  enabled?: boolean;
  limit?: number;
  className?: string;
}) {
  const fetchHistory = useServerFn(getPublicPriceHistory);
  const q = useQuery({
    queryKey: ["price-history", establishmentId, productName, limit],
    queryFn: () => fetchHistory({ data: { establishmentId, productName, limit } }),
    enabled: enabled && !!establishmentId && !!productName,
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return (
      <div className={cn("space-y-1.5", className)} aria-busy>
        <div className="h-8 animate-pulse rounded-md bg-muted/60" />
        <div className="h-8 animate-pulse rounded-md bg-muted/40" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <p className={cn(tc.metaMuted, className)}>Não foi possível carregar o histórico agora.</p>
    );
  }

  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <p className={cn(tc.metaMuted, className)}>
        Ainda não há alterações de preço registradas neste estabelecimento.
      </p>
    );
  }

  // A API devolve do mais recente para o mais antigo.
  const chrono = [...rows].reverse();
  const points: SparkPoint[] = chrono.map((r) => ({ date: r.captured_at, price: r.price }));
  const first = chrono[0].price;
  const last = chrono[chrono.length - 1].price;
  const changePct = first > 0 ? Number((((last - first) / first) * 100).toFixed(1)) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <MiniTrend
        points={points}
        changePct={changePct}
        lastUpdate={rows[0].captured_at}
        width={130}
        height={34}
      />

      <ol className="space-y-1">
        {rows.slice(0, 8).map((r) => (
          <li
            key={r.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5"
          >
            <span className="min-w-0">
              <Price as="span" value={r.price} size="xs" />
              <span className={cn(tc.metaMuted, "block truncate")}>
                {formatUpdatedAt(r.captured_at)}
                {r.size_value && r.size_unit ? ` · ${r.size_value}${r.size_unit}` : ""}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {r.previous_price != null && (
                <Price as="span" value={r.previous_price} size="xs" tone="strike" />
              )}
              <TrendBadge changePct={r.change_pct} />
            </span>
          </li>
        ))}
      </ol>

      {rows.length > 8 && <p className={tc.metaMuted}>+{rows.length - 8} registros anteriores</p>}
    </div>
  );
}
