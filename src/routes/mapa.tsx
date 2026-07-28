import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Store, Package, Search, Star, X, Tag, TrendingUp, Building2 } from "lucide-react";
import { listEstablishmentsByNeighborhood } from "@/lib/scans-history.functions";
import {
  listFavoriteNeighborhoods,
  toggleFavoriteNeighborhood,
} from "@/lib/favorites-neighborhoods.functions";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { EmptyState, PageShell, PageShellContent } from "@/components/layout";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import { tc } from "@/lib/typeclear";
import { StatCell, StatCellGroup, StatCellDivider } from "@/components/ds/StatCell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type SortBy = "price" | "markets" | "alpha" | "favorites";


function NeighborhoodsPage() {
  const fetchNeighborhoods = useServerFn(listEstablishmentsByNeighborhood);
  const fetchFavs = useServerFn(listFavoriteNeighborhoods);
  const toggleFav = useServerFn(toggleFavoriteNeighborhood);
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();
  const isAuthed = !sessionLoading && !!session;
  const promptSignIn = usePromptSignIn();

  const [term, setTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("price");
  const [category, setCategory] = useState("");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

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

  const favKeys = useMemo(() => new Set((favs.data ?? []).map((f) => f.key)), [favs.data]);

  const toggleMutation = useMutation({
    mutationFn: (v: { key: string; name: string; city: string | null }) => toggleFav({ data: v }),
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

  const availableCategories = useMemo(() => {
    const set = new Map<string, number>();
    for (const g of groups.data ?? []) {
      for (const c of g.topCategories) set.set(c.name, (set.get(c.name) ?? 0) + c.count);
    }
    return Array.from(set.entries())
      .sort((a, z) => z[1] - a[1])
      .map(([name]) => name);
  }, [groups.data]);

  const minPriceByNeighborhood = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups.data ?? []) {
      const prices = g.topProducts.map((p) => p.minPrice).filter((v): v is number => v != null);
      if (prices.length > 0) m.set(g.neighborhood, Math.min(...prices));
    }
    return m;
  }, [groups.data]);

  const filteredGroups = useMemo(() => {
    const data = groups.data ?? [];
    const q = term.trim().toLocaleLowerCase("pt-BR");

    let out = data.map((g) => ({
      ...g,
      establishments: q
        ? g.establishments.filter((e) => e.name.toLocaleLowerCase("pt-BR").includes(q))
        : g.establishments,
    }));

    if (q) out = out.filter((g) => g.establishments.length > 0);
    if (category) out = out.filter((g) => g.topCategories.some((c) => c.name === category));
    if (onlyFavs) out = out.filter((g) => favKeys.has(g.neighborhood));

    const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
    if (sortBy === "price") {
      out = [...out].sort((a, z) => {
        const pa = minPriceByNeighborhood.get(a.neighborhood) ?? Infinity;
        const pz = minPriceByNeighborhood.get(z.neighborhood) ?? Infinity;
        return pa !== pz ? pa - pz : collator.compare(a.neighborhood, z.neighborhood);
      });
    } else if (sortBy === "markets") {
      out = [...out].sort((a, z) => z.establishments.length - a.establishments.length);
    } else if (sortBy === "alpha") {
      out = [...out].sort((a, z) => collator.compare(a.neighborhood, z.neighborhood));
    } else {
      out = [...out].sort((a, z) => {
        const fa = favKeys.has(a.neighborhood) ? 0 : 1;
        const fz = favKeys.has(z.neighborhood) ? 0 : 1;
        return fa !== fz ? fa - fz : z.establishments.length - a.establishments.length;
      });
    }
    return out;
  }, [groups.data, term, category, onlyFavs, sortBy, favKeys, minPriceByNeighborhood]);

  // Mantém sempre um bairro selecionado válido.
  useEffect(() => {
    if (filteredGroups.length === 0) {
      if (selected !== null) setSelected(null);
      return;
    }
    if (!selected || !filteredGroups.some((g) => g.neighborhood === selected)) {
      setSelected(filteredGroups[0].neighborhood);
    }
  }, [filteredGroups, selected]);

  const active = filteredGroups.find((g) => g.neighborhood === selected) ?? null;
  const totalMarkets = filteredGroups.reduce((n, g) => n + g.establishments.length, 0);
  const hasActiveFilters = !!term || !!category || onlyFavs || sortBy !== "price";

  const clearFilters = () => {
    setTerm("");
    setCategory("");
    setOnlyFavs(false);
    setSortBy("price");
  };

  const handleFavClick = (name: string, city: string | null) => {
    if (!isAuthed) {
      void promptSignIn({ intent: "favorite-district", payload: { name, city }, returnTo: "/mapa" });
      return;
    }
    toggleMutation.mutate({ key: name, name, city });
  };

  return (
    <PageShell hideFooter>
      <PageShellContent className="!flex-initial flex h-[calc(100dvh-64px)] flex-col overflow-hidden !pb-0">
        {/* Cabeçalho editorial compacto */}
        <header className="shrink-0 border-b border-border/70 bg-card/60">
          <span
            aria-hidden
            className="block h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 70%, transparent) 50%, transparent)",
            }}
          />
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-3 py-2.5 md:px-6 md:py-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <HomeBrandLink showWordmark={false} className="shrink-0" />
              <div className="min-w-0">
                <p className={`hidden sm:block ${tc.eyebrow}`}>Guia local · Feijó</p>
                <h1 className={`truncate sm:mt-0.5 ${tc.h1}`}>
                  Mercados por <span className="italic text-[var(--pc-gold-ink)]">bairro</span>
                </h1>
              </div>
            </div>

            {/* Bloco editorial de contagem — tipografia serif, mais presente */}
            <StatCellGroup
              label={`Resumo: ${filteredGroups.length} bairros e ${totalMarkets} mercados`}
            >
              <StatCell value={filteredGroups.length} label="Bairros" icon={Building2} accent />
              <StatCellDivider />
              <StatCell value={totalMarkets} label="Mercados" icon={Store} />
            </StatCellGroup>

          </div>
        </header>


        {/* Barra de comando */}
        <div className="border-b border-border/70 bg-background">
          <div className="mx-auto w-full max-w-6xl px-3 py-2 md:px-6">
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
              <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 transition-colors focus-within:border-brand-gold md:min-w-[200px] md:flex-1">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Buscar mercado…"
                  className={`min-w-0 flex-1 bg-transparent ${tc.body} placeholder:text-muted-foreground focus:outline-none`}
                  data-no-translate
                />
                {term && (
                  <button
                    type="button"
                    onClick={() => setTerm("")}
                    aria-label="Limpar busca"
                    className="rounded-full p-0.5 text-muted-foreground hover:text-brand-gold"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 items-center gap-2 md:flex md:w-auto">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger
                    aria-label="Ordenar bairros"
                    className={`h-8 w-full shrink-0 border-border bg-card px-2.5 md:w-[11.5rem] ${tc.control} shadow-none`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={tc.control}>
                    <SelectItem value="price">Menor preço</SelectItem>
                    <SelectItem value="markets">Mais mercados</SelectItem>
                    <SelectItem value="alpha">A–Z</SelectItem>
                    {isAuthed && <SelectItem value="favorites">Favoritos</SelectItem>}
                  </SelectContent>
                </Select>

                <Select
                  value={category || "__all"}
                  onValueChange={(v) => setCategory(v === "__all" ? "" : v)}
                >
                  <SelectTrigger
                    aria-label="Filtrar por categoria"
                    className={`h-8 w-full shrink-0 border-border bg-card px-2.5 md:w-[11.5rem] ${tc.control} shadow-none`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={`max-h-64 ${tc.control}`}>
                    <SelectItem value="__all">Categorias</SelectItem>
                    {availableCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isAuthed && (
                  <button
                    type="button"
                    onClick={() => setOnlyFavs((v) => !v)}
                    aria-pressed={onlyFavs}
                    className={
                      `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 ${tc.control} transition-colors ` +
                      (onlyFavs
                        ? "border-brand-gold bg-brand-gold/15 text-[var(--pc-gold-ink)]"
                        : "border-border bg-card text-muted-foreground hover:border-brand-gold/60")
                    }
                  >
                    <Star className={"h-3.5 w-3.5 " + (onlyFavs ? "fill-brand-gold" : "")} />
                    Favoritos
                  </button>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-card px-2.5 ${tc.control} text-muted-foreground transition-colors hover:border-brand-gold/60 hover:text-[var(--pc-gold-ink)]`}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Painel principal: índice de bairros + detalhe — uma única tela */}
        <main className="pc-rail mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-3 py-2 md:px-6 md:py-2.5">
          {groups.isLoading && (
            <div
              className="grid gap-3 min-w-0 md:grid-cols-[16rem_minmax(0,1fr)]"
              aria-busy="true"
              aria-live="polite"
              role="status"
            >
              <span className="sr-only">Carregando bairros e mercados…</span>
              {/* Índice — cartões editoriais */}
              <div className="rounded-lg border border-border/70 bg-card p-1.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-gold/25" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/50" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Detalhe — cabeçalho + linhas de mercado */}
              <div className="rounded-lg border border-border/70 bg-card">
                <div className="flex items-baseline justify-between border-b border-border/60 px-3 py-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted/70" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
                </div>
                <ul className="divide-y divide-border/50">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-muted/60" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
                        <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted/50" />
                      </div>
                      <div className="h-5 w-12 shrink-0 animate-pulse rounded-full bg-muted/50" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {groups.error && (
            <div
              role="alert"
              className={`rounded-md border border-destructive/40 bg-destructive/5 p-3 ${tc.body} text-destructive`}
            >
              <p className="font-semibold">Não foi possível carregar os bairros.</p>
              <p className="mt-0.5 text-destructive/80">
                {(groups.error as Error).message}
              </p>
              <button
                type="button"
                onClick={() => groups.refetch()}
                className={`mt-2 inline-flex items-center rounded-md border border-destructive/50 bg-background px-3 py-1 ${tc.chip} text-destructive hover:bg-destructive/10`}
              >
                Tentar novamente
              </button>
            </div>
          )}


          {groups.data && filteredGroups.length === 0 && !groups.isLoading && (
            <EmptyState
              icon={MapPin}
              title={hasActiveFilters ? "Nenhum bairro corresponde aos filtros" : "Nenhum bairro cadastrado"}
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
                    className={`rounded-md border border-brand-gold bg-brand-gold px-3 py-1.5 ${tc.chip} text-brand-navy`}
                  >
                    Limpar filtros
                  </button>
                ) : undefined
              }
            />
          )}

          {active && (
            <div className="grid min-h-0 flex-1 gap-2 min-w-0 md:gap-3 md:grid-cols-[16rem_minmax(0,1fr)] md:items-stretch">
              {/* Índice de bairros */}
              <nav
                aria-label="Bairros"
                className="min-w-0 rounded-lg border border-border bg-card md:min-h-0 md:overflow-y-auto"
              >
                <p className={`hidden border-b border-border/70 px-2.5 py-1.5 md:block ${tc.tableHead}`}>
                  Bairros
                </p>
                <ul className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto p-1.5 no-scrollbar md:block md:snap-none md:gap-0 md:divide-y md:divide-border/60 md:overflow-x-visible md:p-0">

                  {filteredGroups.map((g) => {
                    const isActive = g.neighborhood === active.neighborhood;
                    const isFav = favKeys.has(g.neighborhood);
                    const min = minPriceByNeighborhood.get(g.neighborhood) ?? null;
                    return (
                      <li
                        key={g.neighborhood}
                        className={
                          "relative w-[9.5rem] shrink-0 snap-start rounded-md border md:w-auto md:shrink md:snap-align-none md:rounded-none md:border-0 " +
                          (isActive ? "border-brand-gold/70 md:border-0" : "border-border md:border-0")
                        }
                      >
                        <button
                          type="button"
                          onClick={() => setSelected(g.neighborhood)}
                          aria-current={isActive ? "true" : undefined}
                          className={
                            "flex w-full items-center gap-2 rounded-md py-1.5 pl-2.5 pr-7 text-left transition-colors md:rounded-none md:pl-3 md:pr-8 " +
                            (isActive ? "bg-brand-gold/10" : "hover:bg-muted/50")
                          }
                        >
                          <span
                            aria-hidden
                            className={
                              "absolute inset-y-0 left-0 hidden w-[3px] md:block " +
                              (isActive ? "bg-brand-gold" : "bg-transparent")
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate ${tc.itemTitle}`}>{g.neighborhood}</span>
                            <span className={`block truncate ${tc.meta}`}>
                              {g.establishments.length}{" "}
                              {g.establishments.length === 1 ? "mercado" : "mercados"}
                              {min != null ? ` · ${currency(min)}` : ""}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFavClick(g.neighborhood, g.city)}
                          aria-pressed={isFav}
                          aria-label={isFav ? `Remover ${g.neighborhood} dos favoritos` : `Favoritar ${g.neighborhood}`}
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-brand-gold md:right-1.5"
                        >
                          <Star
                            className={"h-3.5 w-3.5 " + (isFav ? "fill-brand-gold text-brand-gold" : "")}
                            strokeWidth={1.75}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>


              {/* Detalhe do bairro */}
              <section className="min-w-0 flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
                <header className="shrink-0 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/70 px-3 py-2">
                  <div className="min-w-0">
                    <h2 className={`truncate ${tc.h2}`}>{active.neighborhood}</h2>
                    {active.city && <p className={tc.meta}>{active.city}</p>}
                  </div>
                  <p className={tc.tableHead}>
                    {active.establishments.length}{" "}
                    {active.establishments.length === 1 ? "mercado" : "mercados"}
                  </p>
                </header>

                <div className="grid min-h-0 flex-1 min-w-0 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_15rem]">

                  {/* Mercados */}
                  <ul className="divide-y divide-border/60">
                    {active.establishments.map((est) => (
                      <li key={est.id}>
                        <Link
                          to="/estabelecimento/$slug"
                          params={{ slug: slugifyEstablishment(est.name) }}
                          className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/50"
                        >
                          <StoreLogoThumb
                            src={est.logoUrl}
                            name={est.name}
                            className="h-9 w-9"
                          />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate ${tc.itemTitle}`}>
                              {highlight(est.name, term)}
                            </span>
                            {est.address && (
                              <span className={`block truncate ${tc.meta}`}>{est.address}</span>
                            )}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 ${tc.tag} text-foreground/80`}
                            title="Produtos cadastrados"
                          >
                            <Package className="h-3 w-3 text-[var(--pc-gold-ink)]" aria-hidden />
                            <span className="tabular-nums">{est.productsCount}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                    {active.establishments.length === 0 && (
                      <li className={`px-3 py-4 ${tc.meta}`}>
                        <Store className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                        Nenhum mercado neste bairro com os filtros atuais.
                      </li>
                    )}
                  </ul>

                  {/* Insights do bairro */}
                  <aside className="border-t border-border/60 px-3 py-2 lg:border-l lg:border-t-0">
                    {active.topCategories.length > 0 && (
                      <div className="mb-3">
                        <p className={`mb-1 inline-flex items-center gap-1 ${tc.tableHead}`}>
                          <Tag className="h-3 w-3 text-[var(--pc-gold-ink)]" aria-hidden /> Categorias
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {active.topCategories.slice(0, 6).map((c) => (
                            <span
                              key={c.name}
                              className={`inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 ${tc.tag} text-foreground/80`}
                            >
                              {c.name}
                              <span className="tabular-nums text-[var(--pc-gold-ink)]">{c.count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {active.topProducts.length > 0 && (
                      <div>
                        <p
                          className={`mb-1 inline-flex items-center gap-1 ${tc.tableHead}`}
                          translate="no"
                          data-no-translate
                        >
                          <TrendingUp className="h-3 w-3 text-[var(--pc-gold-ink)]" aria-hidden /> Mais
                          encontrados
                        </p>
                        <ul className="divide-y divide-border/50">
                          {active.topProducts.slice(0, 6).map((p) => (
                            <li key={p.name} className="flex items-baseline justify-between gap-2 py-1">
                              <span className={`min-w-0 flex-1 truncate ${tc.cell}`}>{p.name}</span>
                              <span className={`${tc.num} text-[var(--pc-gold-ink)]`}>
                                {currency(p.minPrice)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </aside>
                </div>
              </section>
            </div>
          )}
        </main>
      </PageShellContent>
    </PageShell>
  );
}
