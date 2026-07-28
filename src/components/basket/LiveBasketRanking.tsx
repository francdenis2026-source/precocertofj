import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Radio, Trophy, Store, TrendingDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getBasketComparison,
  type BasketComparisonResult,
  type BasketStore,
} from "@/lib/basket.functions";
import { brl } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * LiveBasketRanking — ranking em tempo real de qual estabelecimento tem
 * a cesta básica mais barata. Reutiliza `getBasketComparison` e assina
 * o canal Realtime de `scans` para invalidar a query sempre que um novo
 * preço é registrado.
 */
export function LiveBasketRanking({
  title = "Cesta básica ao vivo",
  description = "Atualização em tempo real conforme novos preços chegam.",
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const fetchComparison = useServerFn(getBasketComparison);
  const [pulse, setPulse] = useState(false);

  const query = useQuery<BasketComparisonResult>({
    queryKey: ["basket-comparison", "live"],
    queryFn: () => fetchComparison({ data: {} }),
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });

  // Realtime: invalida quando `scans` recebe INSERT/UPDATE
  useEffect(() => {
    const channel = supabase
      .channel("scans-basket-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scans" },
        () => {
          setPulse(true);
          qc.invalidateQueries({ queryKey: ["basket-comparison", "live"] });
          window.setTimeout(() => setPulse(false), 1500);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const data = query.data;
  const winner = useMemo<BasketStore | null>(() => data?.stores?.[0] ?? null, [data]);
  const ranked = useMemo<BasketStore[]>(() => data?.stores ?? [], [data]);

  return (
    <Card className="pc-elite-frame overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="h-4 w-4 text-brand-gold" aria-hidden /> {title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
            pulse
              ? "border-brand-gold bg-brand-gold/15 text-brand-navy"
              : "border-border bg-background/60 text-muted-foreground",
          )}
          aria-live="polite"
        >
          <Radio className={cn("h-3 w-3", pulse && "animate-pulse text-brand-gold")} aria-hidden />
          {query.isFetching ? "Atualizando…" : "Ao vivo"}
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando a cesta mais barata…
          </div>
        ) : query.isError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Não foi possível carregar a comparação agora.
          </div>
        ) : ranked.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Ainda não há preços recentes suficientes para montar o ranking.
          </div>
        ) : (
          <>
            {winner && (
              <div
                className="rounded-xl border p-4"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--pc-home-gold) 14%, transparent), transparent 70%)",
                  borderColor: "color-mix(in oklab, var(--pc-home-gold) 55%, transparent)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                      Menor cesta agora
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {winner.establishmentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {winner.itemsFound}/{winner.totalItems} essenciais encontrados
                      {winner.city ? ` · ${winner.city}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total estimado
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-brand-navy">
                      {brl(winner.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <ol className="space-y-2">
              {ranked.slice(0, compact ? 5 : 10).map((s, idx) => {
                const isWinner = idx === 0;
                const diff = winner && !isWinner ? s.total - winner.total : 0;
                return (
                  <li
                    key={s.establishmentId}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      isWinner
                        ? "border-brand-gold/60 bg-brand-gold/5"
                        : "border-border bg-background hover:border-brand-gold/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums",
                        isWinner
                          ? "bg-brand-gold text-brand-navy"
                          : "bg-muted text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {s.establishmentName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.itemsFound}/{s.totalItems} itens
                        {s.city ? ` · ${s.city}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {brl(s.total)}
                      </p>
                      {diff > 0 && (
                        <p className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                          <TrendingDown className="h-3 w-3 rotate-180" aria-hidden />
                          +{brl(diff)}
                        </p>
                      )}
                      {isWinner && (
                        <Badge className="mt-0.5 bg-brand-gold text-brand-navy hover:bg-brand-gold">
                          <Store className="mr-1 h-3 w-3" aria-hidden /> Mais barato
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {data && (
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Cesta ideal (menor preço por item)
                  </p>
                  <p className="text-base font-bold tabular-nums text-brand-navy">
                    {brl(data.cheapestBasketTotal)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Cesta média
                  </p>
                  <p className="text-base font-bold tabular-nums text-foreground">
                    {brl(data.averageBasketTotal)}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
