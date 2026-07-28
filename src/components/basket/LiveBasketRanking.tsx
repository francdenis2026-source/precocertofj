import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Radio,
  Trophy,
  Store,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Filter,
  Eye,
  Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getBasketComparison,
  ESSENTIALS,
  CATEGORY_LABELS,
  type BasketComparisonResult,
  type BasketStore,
  type EssentialCategory,
  type EssentialKey,
} from "@/lib/basket.functions";
import { brl } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CategoryFilter = "all" | EssentialCategory;

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "Cesta completa" },
  { key: "graos", label: CATEGORY_LABELS.graos },
  { key: "mercearia", label: CATEGORY_LABELS.mercearia },
  { key: "laticinios", label: CATEGORY_LABELS.laticinios },
  { key: "higiene", label: CATEGORY_LABELS.higiene },
  { key: "limpeza", label: CATEGORY_LABELS.limpeza },
];

/** Map key → category derivado da fonte única (basket.functions ESSENTIALS). */
const KEY_CATEGORY: Record<EssentialKey, EssentialCategory> = Object.fromEntries(
  ESSENTIALS.map((e) => [e.key, e.category]),
) as Record<EssentialKey, EssentialCategory>;

type ScopedStore = BasketStore & {
  scopedTotal: number;
  scopedFound: number;
  scopedTotalItems: number;
  scopedItems: BasketStore["items"];
};

function scopeStore(store: BasketStore, category: CategoryFilter): ScopedStore {
  if (category === "all") {
    return {
      ...store,
      scopedTotal: store.total,
      scopedFound: store.itemsFound,
      scopedTotalItems: store.totalItems,
      scopedItems: store.items,
    };
  }
  const scopedItems: BasketStore["items"] = [];
  let scopedTotal = 0;
  let scopedFound = 0;
  let scopedTotalItems = 0;
  for (const it of store.items) {
    if (!it) continue;
    if (KEY_CATEGORY[it.key] !== category) continue;
    scopedItems.push(it);
    scopedTotal += it.price;
    scopedFound += 1;
  }
  for (const ess of ESSENTIALS) {
    if (ess.category === category) scopedTotalItems += 1;
  }
  return {
    ...store,
    scopedTotal: Number(scopedTotal.toFixed(2)),
    scopedFound,
    scopedTotalItems,
    scopedItems,
  };
}

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
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [city, setCity] = useState<string>("all");
  const [neighborhood, setNeighborhood] = useState<string>("all");
  const [detailStoreId, setDetailStoreId] = useState<string | null>(null);

  // Snapshot dos últimos preços por (estabelecimento, item) para calcular delta.
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Map<string, number>>(new Map());

  const query = useQuery<BasketComparisonResult>({
    queryKey: ["basket-comparison", "live", city],
    queryFn: () => fetchComparison({ data: { city: city === "all" ? null : city } }),
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

  // Após cada fetch, calcula variação item a item comparando com o snapshot anterior.
  useEffect(() => {
    if (!query.data) return;
    const nextMap = new Map<string, number>();
    const nextDeltas = new Map<string, number>();
    for (const s of query.data.stores) {
      for (const it of s.items) {
        if (!it) continue;
        const k = `${s.establishmentId}::${it.key}`;
        nextMap.set(k, it.price);
        const prev = prevPricesRef.current.get(k);
        if (prev != null && Math.abs(prev - it.price) > 0.001) {
          nextDeltas.set(k, Number((it.price - prev).toFixed(2)));
        }
      }
    }
    // Só atualiza deltas se houver algo (evita re-render inútil)
    if (nextDeltas.size > 0 || deltas.size > 0) setDeltas(nextDeltas);
    prevPricesRef.current = nextMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const data = query.data;

  // Cidades e bairros derivados do resultado atual.
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of data?.stores ?? []) if (s.city) set.add(s.city);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data]);
  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    for (const s of data?.stores ?? []) {
      if (s.neighborhood && (city === "all" || s.city === city)) set.add(s.neighborhood);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data, city]);

  // Ranking com filtros aplicados + escopo por categoria.
  const ranked = useMemo<ScopedStore[]>(() => {
    if (!data) return [];
    const filtered = data.stores.filter((s) => {
      if (neighborhood !== "all" && s.neighborhood !== neighborhood) return false;
      return true;
    });
    const scoped = filtered.map((s) => scopeStore(s, category));
    // Ordena: primeiro por cobertura no escopo, depois por menor total.
    scoped.sort((a, b) => {
      const covA = a.scopedTotalItems > 0 ? a.scopedFound / a.scopedTotalItems : 0;
      const covB = b.scopedTotalItems > 0 ? b.scopedFound / b.scopedTotalItems : 0;
      if (covB !== covA) return covB - covA;
      return a.scopedTotal - b.scopedTotal;
    });
    // Remove estabelecimentos sem nenhum item na categoria escolhida.
    return scoped.filter((s) => s.scopedFound > 0 || category === "all");
  }, [data, category, neighborhood]);

  const winner = ranked[0] ?? null;
  const scopeLabel =
    category === "all" ? "cesta completa" : CATEGORY_LABELS[category].toLowerCase();

  const detailStore = useMemo(() => {
    if (!detailStoreId) return null;
    return ranked.find((s) => s.establishmentId === detailStoreId) ?? null;
  }, [detailStoreId, ranked]);

  return (
    <>
      <Card className="pc-elite-frame overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
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
          {/* Filtros: categoria + cidade + bairro */}
          <div className="space-y-3">
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Filtrar por categoria"
            >
              {CATEGORY_TABS.map((t) => {
                const active = category === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(t.key)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                      active
                        ? "border-brand-gold bg-brand-gold text-brand-navy"
                        : "border-border bg-background text-muted-foreground hover:border-brand-gold/50 hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Cidade</span>
                <Select
                  value={city}
                  onValueChange={(v) => {
                    setCity(v);
                    setNeighborhood("all");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Bairro</span>
                <Select
                  value={neighborhood}
                  onValueChange={setNeighborhood}
                  disabled={neighborhoods.length === 0}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue
                      placeholder={neighborhoods.length ? "Bairro" : "Sem bairros"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os bairros</SelectItem>
                    {neighborhoods.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>

          {query.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando o ranking mais barato…
            </div>
          ) : query.isError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Não foi possível carregar a comparação agora.
            </div>
          ) : ranked.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Nenhum mercado com preços recentes para {scopeLabel} nessa região.
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
                        Mais barato agora — {scopeLabel}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {winner.establishmentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {winner.scopedFound}/{winner.scopedTotalItems} itens encontrados
                        {winner.neighborhood ? ` · ${winner.neighborhood}` : ""}
                        {winner.city ? ` · ${winner.city}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Total estimado
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-brand-navy">
                        {brl(winner.scopedTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ol className="space-y-2">
                {ranked.slice(0, compact ? 5 : 10).map((s, idx) => {
                  const isWinner = idx === 0;
                  const diff = winner && !isWinner ? s.scopedTotal - winner.scopedTotal : 0;
                  // Existe alguma variação para esta loja?
                  const hasDelta = s.items.some(
                    (it) => it && deltas.has(`${s.establishmentId}::${it.key}`),
                  );
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
                          {hasDelta && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-brand-gold/20 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-brand-navy">
                              <Radio className="h-2.5 w-2.5 animate-pulse" aria-hidden /> mudou
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.scopedFound}/{s.scopedTotalItems} itens
                          {s.neighborhood ? ` · ${s.neighborhood}` : ""}
                          {s.city ? ` · ${s.city}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {brl(s.scopedTotal)}
                        </p>
                        {diff > 0 && (
                          <p className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                            <TrendingUp className="h-3 w-3" aria-hidden />
                            +{brl(diff)}
                          </p>
                        )}
                        {isWinner && (
                          <Badge className="mt-0.5 bg-brand-gold text-brand-navy hover:bg-brand-gold">
                            <Store className="mr-1 h-3 w-3" aria-hidden /> Mais barato
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-1 h-8 gap-1 px-2 text-xs"
                        onClick={() => setDetailStoreId(s.establishmentId)}
                        aria-label={`Ver itens de ${s.establishmentName}`}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        <span className="hidden sm:inline">Detalhes</span>
                      </Button>
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

      {/* Modal de detalhes por estabelecimento */}
      <Dialog
        open={!!detailStore}
        onOpenChange={(o) => {
          if (!o) setDetailStoreId(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {detailStore && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Store className="h-4 w-4 text-brand-gold" aria-hidden />
                  {detailStore.establishmentName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {detailStore.scopedFound}/{detailStore.scopedTotalItems} itens ·
                  {detailStore.neighborhood ? ` ${detailStore.neighborhood} ·` : ""}
                  {detailStore.city ? ` ${detailStore.city}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Total {category === "all" ? "da cesta" : `em ${scopeLabel}`}
                </p>
                <p className="text-xl font-bold tabular-nums text-brand-navy">
                  {brl(detailStore.scopedTotal)}
                </p>
              </div>

              <ul className="mt-3 divide-y divide-border">
                {ESSENTIALS.filter(
                  (e) => category === "all" || e.category === category,
                ).map((ess) => {
                  const it = detailStore.items.find((x) => x?.key === ess.key) ?? null;
                  const dKey = `${detailStore.establishmentId}::${ess.key}`;
                  const delta = deltas.get(dKey) ?? 0;
                  return (
                    <li key={ess.key} className="flex items-start gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{ess.label}</p>
                        {it ? (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {it.productName}
                            {it.when && (
                              <>
                                {" · "}
                                <time dateTime={it.when}>
                                  {new Date(it.when).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </time>
                              </>
                            )}
                          </p>
                        ) : (
                          <p className="text-[11px] italic text-muted-foreground">
                            sem registro recente
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {it ? (
                          <>
                            <p className="text-sm font-semibold tabular-nums text-foreground">
                              {brl(it.price)}
                            </p>
                            {delta !== 0 && (
                              <p
                                className={cn(
                                  "inline-flex items-center gap-0.5 text-[11px] font-medium",
                                  delta > 0 ? "text-destructive" : "text-emerald-600",
                                )}
                              >
                                {delta > 0 ? (
                                  <TrendingUp className="h-3 w-3" aria-hidden />
                                ) : (
                                  <TrendingDown className="h-3 w-3" aria-hidden />
                                )}
                                {delta > 0 ? "+" : ""}
                                {brl(delta)}
                              </p>
                            )}
                          </>
                        ) : (
                          <Minus
                            className="ml-auto h-4 w-4 text-muted-foreground/50"
                            aria-hidden
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
