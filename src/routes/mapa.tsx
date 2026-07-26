import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  MapPin,
  Store,
  Package,
  Search,
  Star,
  X,
  Tag,
  TrendingUp,
  ArrowUpDown,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { listEstablishmentsByNeighborhood } from "@/lib/scans-history.functions";
import {
  listFavoriteNeighborhoods,
  toggleFavoriteNeighborhood,
} from "@/lib/favorites-neighborhoods.functions";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { EmptyState, LoadingSkeleton, PageShell, PageShellContent } from "@/components/layout";
import { SiteHeader } from "@/components/layout/SiteHeader";
import mapaHero from "@/assets/mapa-hero.jpg";
import { Link } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mercados por bairro — PreçoCerto" },
      {
        name: "description",
        content:
          "Veja os mercados cadastrados organizados por bairro, favorite os seus e compare preços rapidamente.",
      },
      { property: "og:title", content: "Mercados por bairro — PreçoCerto" },
      {
        property: "og:description",
        content: "Encontre os mercados mais próximos organizados por bairro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NeighborhoodsPage,
});

function currency(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function highlight(text: string, term: string) {
  if (!term.trim()) return text;
  const idx = text.toLocaleLowerCase("pt-BR").indexOf(term.toLocaleLowerCase("pt-BR"));
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-brand-gold/25 px-0.5 text-brand-navy dark:text-brand-gold">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

function NeighborhoodsPage() {
  const fetchNeighborhoods = useServerFn(listEstablishmentsByNeighborhood);
  const fetchFavs = useServerFn(listFavoriteNeighborhoods);
  const toggleFav = useServerFn(toggleFavoriteNeighborhood);
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();
  const isAuthed = !sessionLoading && !!session;
  const promptSignIn = usePromptSignIn();

  const [term, setTerm] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "markets" | "alpha" | "favorites">(
    "price",
  );
  const [category, setCategory] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groups = useQuery({
    queryKey: ["neighborhoods"],
    queryFn: () => fetchNeighborhoods({}),
    staleTime: 60_000,
  });

  const favs = useQuery({
    queryKey: ["favorite-neighborhoods"],
    queryFn: () => fetchFavs({}),
    enabled: isAuthed,
    staleTime: 30_000,
  });

  const favKeys = useMemo(
    () => new Set((favs.data ?? []).map((f) => f.key)),
    [favs.data],
  );

  const toggleMutation = useMutation({
    mutationFn: (v: { key: string; name: string; city: string | null }) =>
      toggleFav({ data: v }),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: ["favorite-neighborhoods"] });
      const prev = queryClient.getQueryData<
        Array<{ id: string; key: string; name: string; city: string | null }>
      >(["favorite-neighborhoods"]);
      const isFav = prev?.some((p) => p.key === v.key);
      const next = isFav
        ? (prev ?? []).filter((p) => p.key !== v.key)
        : [{ id: "optimistic-" + v.key, ...v }, ...(prev ?? [])];
      queryClient.setQueryData(["favorite-neighborhoods"], next);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      queryClient.setQueryData(["favorite-neighborhoods"], ctx?.prev);
      toast.error((err as Error).message || "Não foi possível atualizar o favorito");
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["favorite-neighborhoods"] });
      toast.success(res.favored ? "Bairro favoritado" : "Bairro removido dos favoritos");
    },
  });

  // Opções derivadas (categorias e cidades disponíveis)
  const availableCategories = useMemo(() => {
    const set = new Map<string, number>();
    for (const g of groups.data ?? []) {
      for (const c of g.topCategories) {
        set.set(c.name, (set.get(c.name) ?? 0) + c.count);
      }
    }
    return Array.from(set.entries())
      .sort((a, z) => z[1] - a[1])
      .map(([name]) => name);
  }, [groups.data]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups.data ?? []) {
      if (g.city) set.add(g.city);
    }
    return Array.from(set).sort((a, z) => a.localeCompare(z, "pt-BR"));
  }, [groups.data]);

  // Preço mínimo por bairro (para ordenar por "menor preço")
  const minPriceByNeighborhood = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups.data ?? []) {
      const prices = g.topProducts
        .map((p) => p.minPrice)
        .filter((v): v is number => v != null);
      if (prices.length > 0) m.set(g.neighborhood, Math.min(...prices));
    }
    return m;
  }, [groups.data]);

  const filteredGroups = useMemo(() => {
    const data = groups.data ?? [];
    const q = term.trim().toLocaleLowerCase("pt-BR");

    let out = data.map((g) => {
      const ests = q
        ? g.establishments.filter((e) =>
            e.name.toLocaleLowerCase("pt-BR").includes(q),
          )
        : g.establishments;
      return { ...g, establishments: ests };
    });

    if (q) out = out.filter((g) => g.establishments.length > 0);

    if (cityFilter) {
      out = out.filter((g) => (g.city ?? "") === cityFilter);
    }

    if (category) {
      out = out.filter((g) => g.topCategories.some((c) => c.name === category));
    }

    if (onlyFavs) {
      out = out.filter((g) => favKeys.has(g.neighborhood));
    }

    // Ordenação
    const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
    if (sortBy === "price") {
      out = [...out].sort((a, z) => {
        const pa = minPriceByNeighborhood.get(a.neighborhood) ?? Infinity;
        const pz = minPriceByNeighborhood.get(z.neighborhood) ?? Infinity;
        if (pa !== pz) return pa - pz;
        return collator.compare(a.neighborhood, z.neighborhood);
      });
    } else if (sortBy === "markets") {
      out = [...out].sort(
        (a, z) => z.establishments.length - a.establishments.length,
      );
    } else if (sortBy === "alpha") {
      out = [...out].sort((a, z) => collator.compare(a.neighborhood, z.neighborhood));
    } else if (sortBy === "favorites") {
      out = [...out].sort((a, z) => {
        const fa = favKeys.has(a.neighborhood) ? 0 : 1;
        const fz = favKeys.has(z.neighborhood) ? 0 : 1;
        if (fa !== fz) return fa - fz;
        return z.establishments.length - a.establishments.length;
      });
    }

    return out;
  }, [groups.data, term, cityFilter, category, onlyFavs, sortBy, favKeys, minPriceByNeighborhood]);

  const totalMarkets =
    filteredGroups.reduce((n, g) => n + g.establishments.length, 0) ?? 0;

  const hasActiveFilters =
    !!term || !!category || !!cityFilter || onlyFavs || sortBy !== "price";

  const clearFilters = () => {
    setTerm("");
    setCategory("");
    setCityFilter("");
    setOnlyFavs(false);
    setSortBy("price");
  };

  const favoriteGroups = useMemo(() => {
    if (!favs.data || favs.data.length === 0) return [];
    const byKey = new Map(
      (groups.data ?? []).map((g) => [g.neighborhood, g] as const),
    );
    return favs.data
      .map((f) => byKey.get(f.name))
      .filter((g): g is NonNullable<typeof g> => !!g);
  }, [favs.data, groups.data]);

  const handleFavClick = (name: string, city: string | null) => {
    if (!isAuthed) {
      void promptSignIn({
        intent: "favorite-district",
        payload: { name, city },
        returnTo: "/mapa",
      });
      return;
    }
    toggleMutation.mutate({ key: name, name, city });
  };

  return (
    <PageShell>
      
      <PageShellContent>

      {/* Hero editorial — foto aérea + camadas Navy/Gold */}
      <section className="relative isolate overflow-hidden border-b border-brand-gold/20 bg-brand-navy text-white">
        {/* Foto de fundo (aérea de cidade ribeirinha ao entardecer) */}
        <img
          src={mapaHero}
          alt=""
          aria-hidden
          width={1920}
          height={720}
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-[50%_60%] opacity-[0.55]"
        />
        {/* Scrim vertical Navy → transparente → Navy para legibilidade do texto */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-navy/95 via-brand-navy/55 to-brand-navy/95"
        />
        {/* Vinheta lateral para reforçar leitura do título à esquerda */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-2/3 bg-gradient-to-r from-brand-navy/85 via-brand-navy/45 to-transparent"
        />
        {/* Realce dourado sutil no canto superior direito */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-12 -z-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #c9a227 0%, transparent 60%)" }}
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent" />

        <div className="relative mx-auto flex w-full max-w-4xl flex-row items-center justify-between gap-3 px-4 py-2 md:px-6 md:py-2.5">
          <div className="min-w-0">
            <div className="mb-0.5 inline-flex items-center gap-1 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-1.5 py-[1px] text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gold">
              <MapPin className="h-2.5 w-2.5" strokeWidth={2.5} />
              Guia local · Feijó
            </div>
            <h1
              className="text-[clamp(1.1rem,2.4vw,1.5rem)] font-semibold leading-[1.05] tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mercados por <span className="italic text-brand-gold">bairro</span>
            </h1>
          </div>

          {filteredGroups.length > 0 && (
            <div className="flex shrink-0 items-stretch gap-1.5">
              <div className="rounded-md border border-brand-gold/30 bg-white/[0.04] px-2 py-0.5 text-center backdrop-blur-sm">
                <div className="font-mono text-[13px] font-bold leading-none tabular-nums text-brand-gold">
                  {filteredGroups.length}
                </div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">
                  {filteredGroups.length === 1 ? "Bairro" : "Bairros"}
                </div>
              </div>
              <div className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-0.5 text-center backdrop-blur-sm">
                <div className="font-mono text-[13px] font-bold leading-none tabular-nums text-white">
                  {totalMarkets}
                </div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">
                  {totalMarkets === 1 ? "Mercado" : "Mercados"}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl px-4 pt-3 md:px-6 md:pt-4">




        {/* Barra de busca — compacta, focus dourado (com atalho de filtros no mobile) */}
        <div className="mb-2 flex items-center gap-2 md:mb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm transition-colors focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/30">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar mercado por nome…"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              data-no-translate
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:text-brand-gold"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Drawer de filtros — só no mobile */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors md:hidden " +
                  (hasActiveFilters
                    ? "border-brand-gold bg-brand-gold/15 text-brand-gold"
                    : "border-border bg-card text-muted-foreground")
                }
                aria-label="Abrir filtros"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Filtros
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle className="text-[15px]">Filtros e ordenação</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 pb-6">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <ArrowUpDown className="h-3.5 w-3.5 text-brand-gold" strokeWidth={2.25} /> Ordenar
                  </span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="h-9 w-full text-[13px] font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-[13px]">
                      <SelectItem value="price">Menor preço</SelectItem>
                      <SelectItem value="markets">Mais mercados</SelectItem>
                      <SelectItem value="alpha">A–Z</SelectItem>
                      {isAuthed && <SelectItem value="favorites">Favoritos primeiro</SelectItem>}
                    </SelectContent>
                  </Select>
                </label>

                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 text-brand-gold" strokeWidth={2.25} /> Categoria
                  </span>
                  <Select value={category || "__all"} onValueChange={(v) => setCategory(v === "__all" ? "" : v)}>
                    <SelectTrigger className="h-9 w-full text-[13px] font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 text-[13px]">
                      <SelectItem value="__all">Todas as categorias</SelectItem>
                      {availableCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                {availableCities.length > 1 && (
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-brand-gold" strokeWidth={2.25} /> Região
                    </span>
                    <Select value={cityFilter || "__all"} onValueChange={(v) => setCityFilter(v === "__all" ? "" : v)}>
                      <SelectTrigger className="h-9 w-full text-[13px] font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-[13px]">
                        <SelectItem value="__all">Todas</SelectItem>
                        {availableCities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}

                {isAuthed && (
                  <button
                    type="button"
                    onClick={() => setOnlyFavs((v) => !v)}
                    aria-pressed={onlyFavs}
                    className={
                      "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors " +
                      (onlyFavs
                        ? "border-brand-gold bg-brand-gold/15 text-brand-gold"
                        : "border-border bg-background text-foreground")
                    }
                  >
                    <Star className={"h-4 w-4 " + (onlyFavs ? "fill-brand-gold text-brand-gold" : "text-muted-foreground")} />
                    Somente favoritos
                  </button>
                )}

                <div className="flex gap-2 pt-1">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="flex-1 rounded-lg bg-brand-gold px-3 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-brand-navy"
                  >
                    Ver {filteredGroups.length} {filteredGroups.length === 1 ? "bairro" : "bairros"}
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>


        {/* Filtros e ordenação — inline no desktop, drawer no mobile */}
        <div className="mb-3 rounded-lg border border-border bg-card p-2.5 shadow-sm max-md:hidden">
          <div className="flex flex-wrap items-center gap-2">

            {/* Ordenação */}
            <div className="inline-flex min-w-[180px] items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5 text-brand-gold" strokeWidth={2.25} />
                Ordenar
              </span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger
                  className="h-8 flex-1 border-border bg-background px-2.5 text-[12.5px] font-semibold text-foreground shadow-none hover:border-brand-gold/60 focus-visible:border-brand-gold focus-visible:ring-brand-gold/30"
                  aria-label="Ordenar bairros"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-[12.5px]">
                  <SelectItem value="price">Menor preço</SelectItem>
                  <SelectItem value="markets">Mais mercados</SelectItem>
                  <SelectItem value="alpha">A–Z</SelectItem>
                  {isAuthed && (
                    <SelectItem value="favorites">Favoritos primeiro</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="inline-flex min-w-[200px] items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <Tag className="h-3.5 w-3.5 text-brand-gold" strokeWidth={2.25} />
                Categoria
              </span>
              <Select value={category || "__all"} onValueChange={(v) => setCategory(v === "__all" ? "" : v)}>
                <SelectTrigger
                  className="h-8 flex-1 border-border bg-background px-2.5 text-[12.5px] font-semibold text-foreground shadow-none hover:border-brand-gold/60 focus-visible:border-brand-gold focus-visible:ring-brand-gold/30"
                  aria-label="Filtrar por categoria"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64 text-[12.5px]">
                  <SelectItem value="__all">Todas as categorias</SelectItem>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cidade / região */}
            {availableCities.length > 1 && (
              <div className="inline-flex min-w-[180px] items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-brand-gold" strokeWidth={2.25} />
                  Região
                </span>
                <Select value={cityFilter || "__all"} onValueChange={(v) => setCityFilter(v === "__all" ? "" : v)}>
                  <SelectTrigger
                    className="h-8 flex-1 border-border bg-background px-2.5 text-[12.5px] font-semibold text-foreground shadow-none hover:border-brand-gold/60 focus-visible:border-brand-gold focus-visible:ring-brand-gold/30"
                    aria-label="Filtrar por cidade"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-[12.5px]">
                    <SelectItem value="__all">Todas</SelectItem>
                    {availableCities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Somente favoritos */}
            {isAuthed && (
              <button
                type="button"
                onClick={() => setOnlyFavs((v) => !v)}
                aria-pressed={onlyFavs}
                className={
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-semibold transition-colors " +
                  (onlyFavs
                    ? "border-brand-gold bg-brand-gold/15 text-brand-gold"
                    : "border-border bg-background text-foreground hover:border-brand-gold/60")
                }
              >
                <Star
                  className={"h-3.5 w-3.5 " + (onlyFavs ? "fill-brand-gold text-brand-gold" : "text-muted-foreground")}
                />
                Favoritos
              </button>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-brand-gold/60 hover:text-brand-gold"
              >
                <SlidersHorizontal className="h-3 w-3" />
                Limpar
              </button>
            )}
          </div>

          {/* Legenda visual — o que os selos e ícones significam */}
          <div className="mt-2 hidden flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-[11px] text-muted-foreground md:flex">

            <span className="font-bold uppercase tracking-[0.14em]">Legenda:</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-[3px] rounded-sm bg-brand-gold" aria-hidden />
              Bairro
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-brand-gold text-brand-gold" aria-hidden />
              Favorito
            </span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3 text-brand-gold" aria-hidden />
              Nº de produtos
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-brand-gold" aria-hidden />
              Mais procurados no bairro
            </span>
          </div>
        </div>


        {/* Seus bairros — atalho gold */}
        {isAuthed && favoriteGroups.length > 0 && !term && (
          <section className="mb-4">
            <h2 className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" /> Seus bairros
            </h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {favoriteGroups.map((g) => (
                <a
                  key={g.neighborhood}
                  href={`#bairro-${encodeURIComponent(g.neighborhood)}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-[12px] font-semibold text-brand-gold transition-colors hover:border-brand-gold hover:bg-brand-gold hover:text-brand-navy"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {g.neighborhood}
                  <span className="rounded-full bg-brand-gold/20 px-1.5 text-[11px] font-bold tabular-nums">
                    {g.establishments.length}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {groups.isLoading && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <span className="sr-only">Carregando bairros…</span>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
                    <div className="space-y-1">
                      <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-20 animate-pulse rounded bg-muted/70" />
                    </div>
                  </div>
                  <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="divide-y divide-border">
                  {[0, 1].map((k) => (
                    <div key={k} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/70" />
                      </div>
                      <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {groups.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-[13.5px] text-destructive">
            Não foi possível carregar os bairros: {(groups.error as Error).message}
          </div>
        )}

        {groups.data && filteredGroups.length === 0 && !groups.isLoading && (
          <EmptyState
            icon={MapPin}
            title={hasActiveFilters ? "Nenhum bairro corresponde aos filtros" : "Nenhum bairro cadastrado ainda"}
            description={
              hasActiveFilters
                ? "Ajuste ou limpe os filtros para ver todos os bairros disponíveis."
                : "Assim que houver mercados cadastrados, eles aparecerão aqui."
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand-gold bg-brand-gold px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-brand-navy transition-colors hover:brightness-105"
                >
                  <SlidersHorizontal className="h-3 w-3" aria-hidden /> Limpar filtros
                </button>
              ) : undefined
            }
          />
        )}



        {filteredGroups.length > 0 && (
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const isFav = favKeys.has(group.neighborhood);
              const isOpen = expanded.has(group.neighborhood);
              const bodyClass = isOpen ? "block" : "hidden md:block";
              return (
                <section
                  key={group.neighborhood}
                  id={`bairro-${encodeURIComponent(group.neighborhood)}`}
                  className="cv-row overflow-hidden rounded-xl border border-border bg-card shadow-sm scroll-mt-4 transition-colors hover:border-brand-gold/40"
                >
                  {/* Header do bairro — faixa dourada lateral + tipografia clean */}
                  <header className="relative flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-3.5 py-2.5 pl-4">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px] bg-brand-gold"
                    />
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-gold/15 text-brand-gold">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-[13.5px] font-bold tracking-tight text-foreground">
                          {group.neighborhood}
                        </h2>
                        {group.city && (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {group.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-gold">
                        {group.establishments.length}{" "}
                        {group.establishments.length === 1 ? "mercado" : "mercados"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(group.neighborhood)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Recolher bairro" : "Expandir bairro"}
                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-brand-gold md:hidden"
                      >
                        <ChevronDown
                          className={"h-4 w-4 transition-transform " + (isOpen ? "rotate-180" : "")}
                          strokeWidth={2.25}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFavClick(group.neighborhood, group.city)}
                        aria-label={isFav ? "Remover dos favoritos" : "Favoritar bairro"}
                        aria-pressed={isFav}
                        className={
                          "rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold " +
                          (isFav
                            ? "text-brand-gold hover:text-brand-gold/80"
                            : "text-muted-foreground hover:text-brand-gold")
                        }
                      >
                        <Star
                          className={"h-4 w-4 " + (isFav ? "fill-brand-gold" : "")}
                          strokeWidth={1.75}
                        />
                      </button>
                    </div>
                  </header>

                  {/* Insights — categorias e top produtos */}
                  {(group.topCategories.length > 0 || group.topProducts.length > 0) && (
                    <div className={`${bodyClass} space-y-2.5 border-b border-border bg-muted/10 px-3.5 py-2.5`}>
                      {group.topCategories.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            <Tag className="h-3 w-3" /> Categorias mais cadastradas
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {group.topCategories.map((c) => (
                              <span
                                key={c.name}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground"
                              >
                                {c.name}
                                <span className="rounded-full bg-brand-gold/15 px-1.5 text-[11px] font-bold text-brand-gold tabular-nums">
                                  {c.count}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {group.topProducts.length > 0 && (
                        <div>
                          <div
                            className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                            translate="no"
                            data-no-translate
                          >
                            <TrendingUp className="h-3 w-3" /> Mais encontrados no bairro
                          </div>
                          <ul className="space-y-0.5">
                            {group.topProducts.map((p) => (
                              <li
                                key={p.name}
                                className="flex items-center justify-between gap-2 text-[12px]"
                              >
                                <span className="min-w-0 flex-1 truncate text-foreground">
                                  {p.name}
                                </span>
                                <span className="shrink-0 font-bold tabular-nums text-brand-gold">
                                  {currency(p.minPrice)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <ul className={`${bodyClass} divide-y divide-border`}>
                    {group.establishments.map((est) => (
                      <li
                        key={est.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <div
                          className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background"
                          style={{
                            backgroundColor: est.brandColor ?? undefined,
                          }}
                        >
                          {est.logoUrl ? (
                            <img
                              src={est.logoUrl}
                              alt={est.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                              width={40}
                              height={40}
                            />
                          ) : (
                            <Store className="h-4.5 w-4.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-foreground">
                            {highlight(est.name, term)}
                          </p>
                          {est.address && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {est.address}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-foreground">
                          <Package className="h-3 w-3 text-brand-gold" />
                          <span className="tabular-nums">{est.productsCount}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
      </PageShellContent>
    </PageShell>
  );
}
