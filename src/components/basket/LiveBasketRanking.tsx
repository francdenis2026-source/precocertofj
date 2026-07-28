import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Star,
  Download,
  FileText,
  FileSpreadsheet,
  Link2,
  ArrowRightLeft,
} from "lucide-react";
import {
  suggestSubstitutions,
  projectVerdictWithSubstitutions,
  type BasketSubstitution,
} from "@/lib/basket-suggestions";
import { BasketSubstitutionPanel } from "@/components/basket/BasketSubstitutionPanel";
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
import { getBasketSparklines } from "@/lib/basket-sparklines.functions";
import {
  listFavoriteEstablishments,
  toggleFavoriteEstablishment,
} from "@/lib/favorite-establishments.functions";
import {
  exportRankingCsv,
  exportRankingPdf,
  exportStoreDetailsCsv,
  exportStoreDetailsPdf,
  type RankingExportRow,
} from "@/lib/basket-export";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/basket/Sparkline";

type CategoryFilter = "all" | EssentialCategory;

export type LiveBasketSort = "coverage" | "total" | "savings" | "recent";
const SORT_STORAGE_KEY = "pc:live-basket:sort";
const SORT_OPTIONS: { key: LiveBasketSort; label: string }[] = [
  { key: "coverage", label: "Cobertura + menor total" },
  { key: "total", label: "Menor total" },
  { key: "savings", label: "Maior economia vs. líder" },
  { key: "recent", label: "Atualização mais recente" },
];

export type LiveBasketFilters = {
  category: CategoryFilter;
  city: string; // "all" or city name
  neighborhood: string; // "all" or neighborhood name
};

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "Cesta completa" },
  { key: "graos", label: CATEGORY_LABELS.graos },
  { key: "mercearia", label: CATEGORY_LABELS.mercearia },
  { key: "laticinios", label: CATEGORY_LABELS.laticinios },
  { key: "higiene", label: CATEGORY_LABELS.higiene },
  { key: "limpeza", label: CATEGORY_LABELS.limpeza },
];

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
  value,
  onChange,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
  value?: LiveBasketFilters;
  onChange?: (next: LiveBasketFilters) => void;
}) {
  const qc = useQueryClient();
  const fetchComparison = useServerFn(getBasketComparison);
  const fetchSparklines = useServerFn(getBasketSparklines);
  const listFavs = useServerFn(listFavoriteEstablishments);
  const toggleFav = useServerFn(toggleFavoriteEstablishment);

  const [pulse, setPulse] = useState(false);

  // ---- Filtros controlados/uncontrolled ----
  const isControlled = !!value && !!onChange;
  const [localFilters, setLocalFilters] = useState<LiveBasketFilters>({
    category: "all",
    city: "all",
    neighborhood: "all",
  });
  const filters = isControlled ? value! : localFilters;
  const setFilters = useCallback(
    (updater: (prev: LiveBasketFilters) => LiveBasketFilters) => {
      if (isControlled) onChange!(updater(value!));
      else setLocalFilters(updater);
    },
    [isControlled, onChange, value],
  );
  const { category, city, neighborhood } = filters;

  // Modo de ordenação persistido em localStorage.
  const [sortMode, setSortMode] = useState<LiveBasketSort>(() => {
    if (typeof window === "undefined") return "coverage";
    const raw = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (raw === "coverage" || raw === "total" || raw === "savings" || raw === "recent") return raw;
    return "coverage";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(SORT_STORAGE_KEY, sortMode);
  }, [sortMode]);

  const [detailStoreId, setDetailStoreId] = useState<string | null>(null);

  // Snapshot dos últimos preços por (estabelecimento, item) para calcular delta.
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Map<string, number>>(new Map());

  // ---- Comparação principal ----
  const query = useQuery<BasketComparisonResult>({
    queryKey: ["basket-comparison", "live", city],
    queryFn: () => fetchComparison({ data: { city: city === "all" ? null : city } }),
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });

  // ---- Favoritos ----
  const favoritesQuery = useQuery<string[]>({
    queryKey: ["favorite-establishments"],
    queryFn: () => listFavs(),
    staleTime: 60_000,
    retry: false,
  });
  const favoritesSet = useMemo(
    () => new Set<string>(favoritesQuery.data ?? []),
    [favoritesQuery.data],
  );
  const canFavorite = favoritesQuery.isSuccess || favoritesQuery.isLoading;

  const favMutation = useMutation({
    mutationFn: (establishmentId: string) => toggleFav({ data: { establishmentId } }),
    onMutate: async (establishmentId: string) => {
      await qc.cancelQueries({ queryKey: ["favorite-establishments"] });
      const prev = qc.getQueryData<string[]>(["favorite-establishments"]) ?? [];
      const next = prev.includes(establishmentId)
        ? prev.filter((id) => id !== establishmentId)
        : [...prev, establishmentId];
      qc.setQueryData(["favorite-establishments"], next);
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorite-establishments"], ctx.prev);
      toast.error("Não foi possível atualizar os favoritos.");
    },
    onSuccess: (res) => {
      toast.success(
        res.isFavorite ? "Estabelecimento favoritado." : "Removido dos favoritos.",
      );
    },
  });

  // ---- Realtime ----
  useEffect(() => {
    const channel = supabase
      .channel("scans-basket-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scans" },
        () => {
          setPulse(true);
          qc.invalidateQueries({ queryKey: ["basket-comparison", "live"] });
          qc.invalidateQueries({ queryKey: ["basket-sparklines"] });
          window.setTimeout(() => setPulse(false), 1500);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // ---- Deltas ----
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
    if (nextDeltas.size > 0 || deltas.size > 0) setDeltas(nextDeltas);
    prevPricesRef.current = nextMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const data = query.data;

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

  // ---- Ranking ----
  const ranked = useMemo<ScopedStore[]>(() => {
    if (!data) return [];
    const filtered = data.stores.filter((s) => {
      if (neighborhood !== "all" && s.neighborhood !== neighborhood) return false;
      return true;
    });
    const scoped = filtered.map((s) => scopeStore(s, category));
    const eligible = scoped.filter((s) => s.scopedFound > 0 || category === "all");
    // Máximo total dentro do escopo para calcular "economia vs. mais caro"
    const maxTotal = eligible.reduce((m, s) => (s.scopedTotal > m ? s.scopedTotal : m), 0);
    const lastUpdateOf = (s: ScopedStore) =>
      s.scopedItems.reduce((mx, it) => (it && it.when > mx ? it.when : mx), "");

    const sorters: Record<LiveBasketSort, (a: ScopedStore, b: ScopedStore) => number> = {
      coverage: (a, b) => {
        const covA = a.scopedTotalItems > 0 ? a.scopedFound / a.scopedTotalItems : 0;
        const covB = b.scopedTotalItems > 0 ? b.scopedFound / b.scopedTotalItems : 0;
        if (covB !== covA) return covB - covA;
        return a.scopedTotal - b.scopedTotal;
      },
      total: (a, b) => a.scopedTotal - b.scopedTotal,
      savings: (a, b) => (maxTotal - a.scopedTotal) < (maxTotal - b.scopedTotal) ? 1 : -1,
      recent: (a, b) => (lastUpdateOf(b) || "").localeCompare(lastUpdateOf(a) || ""),
    };
    eligible.sort(sorters[sortMode]);
    return eligible;
  }, [data, category, neighborhood, sortMode]);

  const winner = ranked[0] ?? null;
  const scopeLabel =
    category === "all" ? "cesta completa" : CATEGORY_LABELS[category].toLowerCase();

  // Favoritos mais baratos por categoria (com base no ranked filtrado por região atual).
  const favoritesByCategory = useMemo(() => {
    if (favoritesSet.size === 0 || !data) return [];
    const regionStores = data.stores.filter(
      (s) => neighborhood === "all" || s.neighborhood === neighborhood,
    );
    const favStores = regionStores.filter((s) => favoritesSet.has(s.establishmentId));
    if (favStores.length === 0) return [];
    return (Object.keys(CATEGORY_LABELS) as EssentialCategory[])
      .map((cat) => {
        const scoped = favStores
          .map((s) => scopeStore(s, cat))
          .filter((s) => s.scopedFound > 0)
          .sort((a, b) => a.scopedTotal - b.scopedTotal);
        return scoped[0] ? { category: cat, store: scoped[0] } : null;
      })
      .filter((x): x is { category: EssentialCategory; store: ScopedStore } => x != null);
  }, [favoritesSet, data, neighborhood]);

  // ---- Substituições sugeridas (apenas com cesta completa) ----
  const substitutionsByStore = useMemo<Map<string, BasketSubstitution[]>>(() => {
    const map = new Map<string, BasketSubstitution[]>();
    if (!data || category !== "all") return map;
    for (const s of ranked) {
      const subs = suggestSubstitutions(data, s.establishmentId);
      if (subs.length > 0) map.set(s.establishmentId, subs);
    }
    return map;
  }, [data, category, ranked]);

  const hypotheticalVerdict = useMemo(() => {
    if (!data || category !== "all" || ranked.length === 0) return null;
    const projections = projectVerdictWithSubstitutions(data);
    // Restringe às lojas atualmente no ranking (respeita filtro de bairro)
    const inScope = new Set(ranked.map((s) => s.establishmentId));
    const scoped = projections.filter((p) => inScope.has(p.storeId));
    if (scoped.length === 0) return null;
    const currentLeader = ranked[0];
    const projectedLeader = scoped[0];
    const changes = scoped.reduce((n, p) => n + p.substitutionsApplied, 0);
    if (changes === 0) return null;
    return {
      currentLeaderId: currentLeader.establishmentId,
      currentLeaderName: currentLeader.establishmentName,
      projectedLeaderId: projectedLeader.storeId,
      projectedLeaderName: projectedLeader.storeName,
      projectedTotal: projectedLeader.hypotheticalTotal,
      changed: projectedLeader.storeId !== currentLeader.establishmentId,
      totalSubstitutions: changes,
    };
  }, [data, category, ranked]);

  // ---- Sparklines (últimos 7 dias) ----
  const storeIds = useMemo(() => ranked.slice(0, 10).map((s) => s.establishmentId), [ranked]);
  const sparklineQuery = useQuery<Record<string, Array<{ t: string; p: number }>>>({
    queryKey: ["basket-sparklines", storeIds],
    queryFn: () => fetchSparklines({ data: { storeIds } }),
    enabled: storeIds.length > 0,
    staleTime: 60_000,
    retry: false,
  });
  const sparklines = sparklineQuery.data ?? {};

  const detailStore = useMemo(() => {
    if (!detailStoreId) return null;
    return ranked.find((s) => s.establishmentId === detailStoreId) ?? null;
  }, [detailStoreId, ranked]);

  // ---- Export helpers ----
  const exportMeta = () => ({
    categoryLabel: CATEGORY_TABS.find((t) => t.key === category)?.label ?? "Cesta completa",
    cityLabel: city === "all" ? "Todas" : city,
    neighborhoodLabel: neighborhood === "all" ? "Todos" : neighborhood,
    generatedAt: new Date(),
  });

  const buildRows = (): RankingExportRow[] => {
    const first = ranked[0];
    return ranked.map((s, idx) => ({
      position: idx + 1,
      store: s,
      diffToLeader: first ? Number((s.scopedTotal - first.scopedTotal).toFixed(2)) : 0,
      isFavorite: favoritesSet.has(s.establishmentId),
    }));
  };

  const handleExport = (format: "csv" | "pdf") => {
    if (ranked.length === 0) {
      toast.info("Nada para exportar ainda.");
      return;
    }
    const rows = buildRows();
    const meta = exportMeta();
    if (format === "csv") exportRankingCsv(rows, meta);
    else exportRankingPdf(rows, meta);
    toast.success(`Ranking exportado em ${format.toUpperCase()}.`);
  };

  const handleExportDetails = (format: "csv" | "pdf") => {
    if (!detailStore) return;
    const meta = exportMeta();
    if (format === "csv") exportStoreDetailsCsv(detailStore, deltas, meta);
    else exportStoreDetailsPdf(detailStore, deltas, meta);
    toast.success(`Detalhes exportados em ${format.toUpperCase()}.`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  // ---- Render ----
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
          <div className="flex items-center gap-2">
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as LiveBasketSort)}>
              <SelectTrigger
                data-testid="live-basket-sort"
                className="h-7 w-[200px] gap-1 px-2 text-[11px]"
                aria-label="Ordenar ranking"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleExport("csv")} className="gap-2 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden /> Ranking em CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport("pdf")} className="gap-2 text-xs">
                  <FileText className="h-3.5 w-3.5" aria-hidden /> Ranking em PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isControlled && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={handleCopyLink}
                aria-label="Copiar link do ranking atual"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Copiar link</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por categoria">
              {CATEGORY_TABS.map((t) => {
                const active = category === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilters((prev) => ({ ...prev, category: t.key }))}
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
                  onValueChange={(v) =>
                    setFilters((prev) => ({ ...prev, city: v, neighborhood: "all" }))
                  }
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
                  onValueChange={(v) => setFilters((prev) => ({ ...prev, neighborhood: v }))}
                  disabled={neighborhoods.length === 0}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={neighborhoods.length ? "Bairro" : "Sem bairros"} />
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

          {/* Barra de favoritos */}
          {canFavorite && favoritesByCategory.length > 0 && (
            <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy">
                <Star className="h-3 w-3 fill-brand-gold text-brand-gold" aria-hidden />
                Seus favoritos mais baratos por categoria
              </p>
              <div className="flex flex-wrap gap-1.5">
                {favoritesByCategory.map(({ category: cat, store: s }) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
                      className={cn(
                        "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                        active
                          ? "border-brand-gold bg-brand-gold text-brand-navy"
                          : "border-border bg-background text-foreground hover:border-brand-gold/60",
                      )}
                      aria-pressed={active}
                    >
                      <span className="text-muted-foreground group-aria-pressed:text-brand-navy/70">
                        {CATEGORY_LABELS[cat]}:
                      </span>
                      <span className="max-w-[10rem] truncate">{s.establishmentName}</span>
                      <span className="tabular-nums">{brl(s.scopedTotal)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

              {hypotheticalVerdict && (
                <div
                  data-testid="basket-hypothetical-verdict"
                  className={cn(
                    "flex flex-wrap items-start gap-3 rounded-xl border p-3 text-xs",
                    hypotheticalVerdict.changed
                      ? "border-amber-400/60 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/5"
                      : "border-border bg-muted/30",
                  )}
                >
                  <ArrowRightLeft
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      hypotheticalVerdict.changed
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      Com {hypotheticalVerdict.totalSubstitutions} substituição
                      {hypotheticalVerdict.totalSubstitutions > 1 ? "ões" : ""} sugerida
                      {hypotheticalVerdict.totalSubstitutions > 1 ? "s" : ""} entre itens da mesma
                      categoria,{" "}
                      {hypotheticalVerdict.changed ? (
                        <>
                          o veredito mudaria para{" "}
                          <span className="text-brand-navy dark:text-brand-gold">
                            {hypotheticalVerdict.projectedLeaderName}
                          </span>{" "}
                          por {brl(hypotheticalVerdict.projectedTotal)}.
                        </>
                      ) : (
                        <>
                          {hypotheticalVerdict.currentLeaderName} continuaria líder por{" "}
                          {brl(hypotheticalVerdict.projectedTotal)}.
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      Abra “Detalhes” em um mercado para ver quais trocas foram consideradas e o
                      impacto no total.
                    </p>
                  </div>
                </div>
              )}

              <ol className="space-y-2">
                {ranked.slice(0, compact ? 5 : 10).map((s, idx) => {
                  const isWinner = idx === 0;
                  const diff = winner && !isWinner ? s.scopedTotal - winner.scopedTotal : 0;
                  const isFav = favoritesSet.has(s.establishmentId);
                  const hasDelta = s.items.some(
                    (it) => it && deltas.has(`${s.establishmentId}::${it.key}`),
                  );
                  // Pega o item mais barato do escopo para exibir sparkline mini
                  const cheapestScoped = s.scopedItems
                    .filter((x): x is NonNullable<typeof x> => x != null)
                    .sort((a, b) => a.price - b.price)[0];
                  const sparkPts = cheapestScoped
                    ? sparklines[`${s.establishmentId}::${cheapestScoped.key}`] ?? []
                    : [];

                  return (
                    <li
                      key={s.establishmentId}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                        isFav
                          ? "border-brand-gold/70 bg-brand-gold/10"
                          : isWinner
                            ? "border-brand-gold/60 bg-brand-gold/5"
                            : "border-border bg-background hover:border-brand-gold/40",
                      )}
                    >
                      {canFavorite && (
                        <button
                          type="button"
                          aria-pressed={isFav}
                          aria-label={isFav ? "Remover dos favoritos" : "Marcar como favorito"}
                          onClick={() => favMutation.mutate(s.establishmentId)}
                          disabled={favMutation.isPending}
                          className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                            isFav
                              ? "bg-brand-gold/20 text-brand-gold"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <Star
                            className={cn("h-4 w-4", isFav && "fill-brand-gold")}
                            aria-hidden
                          />
                        </button>
                      )}
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
                          <span data-testid="row-coverage">{s.scopedFound}/{s.scopedTotalItems} itens</span>
                          {s.scopedFound > 0 && (
                            <> · <span title="Custo médio por item disponível">{brl(s.scopedTotal / s.scopedFound)}/item</span></>
                          )}
                          {s.neighborhood ? ` · ${s.neighborhood}` : ""}
                          {s.city ? ` · ${s.city}` : ""}
                        </p>
                        {(() => {
                          const subs = substitutionsByStore.get(s.establishmentId);
                          if (!subs || subs.length === 0) return null;
                          const extra = subs.reduce((sum, x) => sum + x.substitutePrice * x.substituteQuantity, 0);
                          return (
                            <button
                              type="button"
                              onClick={() => setDetailStoreId(s.establishmentId)}
                              className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50/60 px-2 py-0.5 text-[10px] font-semibold text-amber-800 transition-colors hover:bg-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                              aria-label={`Ver ${subs.length} sugestão${subs.length > 1 ? "ões" : ""} de substituição em ${s.establishmentName}`}
                            >
                              <ArrowRightLeft className="h-2.5 w-2.5" aria-hidden />
                              {subs.length} substituição{subs.length > 1 ? "ões" : ""} · +{brl(extra)}
                            </button>
                          );
                        })()}
                      </div>
                      {cheapestScoped && (
                        <div
                          className="hidden text-muted-foreground sm:block"
                          title={`Tendência 7 dias — ${cheapestScoped.label}`}
                        >
                          <Sparkline points={sparkPts} width={44} height={14} />
                        </div>
                      )}
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

      {/* Modal de detalhes */}
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

              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-brand-gold/40 bg-brand-gold/5 p-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Total {category === "all" ? "da cesta" : `em ${scopeLabel}`}
                  </p>
                  <p className="text-xl font-bold tabular-nums text-brand-navy">
                    {brl(detailStore.scopedTotal)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                      <Download className="h-3.5 w-3.5" aria-hidden /> Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => handleExportDetails("csv")}
                      className="gap-2 text-xs"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden /> Detalhes em CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleExportDetails("pdf")}
                      className="gap-2 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden /> Detalhes em PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {category === "all" && data && (
                <BasketSubstitutionPanel
                  data={data}
                  storeId={detailStore.establishmentId}
                  className="mt-3"
                />
              )}



              <ul className="mt-3 divide-y divide-border">
                {ESSENTIALS.filter((e) => category === "all" || e.category === category).map(
                  (ess) => {
                    const it = detailStore.items.find((x) => x?.key === ess.key) ?? null;
                    const dKey = `${detailStore.establishmentId}::${ess.key}`;
                    const delta = deltas.get(dKey) ?? 0;
                    const pts = sparklines[dKey] ?? [];
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
                        <Sparkline
                          points={pts}
                          width={60}
                          height={18}
                          className="mt-0.5 hidden sm:inline-block"
                        />
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
                  },
                )}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
