import { createFileRoute, Link, useNavigate, stripSearchParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";

import {
  ArrowRight,
  Beef,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  CalendarDays,
  Fuel,
  HardHat,
  Home as HomeIcon,
  Package,
  PawPrint,
  Phone,
  Pill,
  Search,
  Sparkles,
  ShoppingCart,
  Croissant,
  Apple,
  Wine,
  BookOpen,
} from "lucide-react";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { tc } from "@/lib/typeclear";
import { StoreBadge } from "@/components/brand/StoreBadge";
import { ProductQuickView } from "@/components/product/ProductQuickView";
import { getCategoryHub } from "@/lib/category-hub.functions";
import { CATEGORY_DEFS, categoryBySlug, norm } from "@/lib/category-hub";
import { useCategoryLabelWithFallback } from "@/hooks/use-category-labels";
import { classifyButcherCut, type ButcherProtein } from "@/lib/butcher-cuts";
import {
  hortifrutiSubgroup,
  HORTIFRUTI_SUBGROUP_LABELS,
  type HortifrutiSubgroup,
} from "@/lib/product-category";
import { computeHubSavings } from "@/lib/hub-savings";
import { Bird, Drumstick } from "lucide-react";
import { PLANTOES, diaDaSemana, diaVigente, farmaciaPorId } from "@/lib/farmacias-plantao";
import { useScrollRestoration } from "@/lib/use-scroll-restoration";
import { createRailController } from "@/lib/rail-scroll";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";

const ICONS: Record<string, typeof ShoppingCart> = {
  supermercados: ShoppingCart,
  farmacias: Pill,
  acougues: Beef,
  padarias: Croissant,
  hortifruti: Apple,
  bebidas: Wine,
  limpeza: HomeIcon,
  higiene: Sparkles,
  pet: PawPrint,
  construcao: HardHat,
  postos: Fuel,
  papelaria: BookOpen,
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SEARCH_DEFAULTS = { q: "", loja: "", view: "list", page: 1, per: 30, p: "", corte: "", so_cortes: 0, sub: "" };

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  loja: fallback(z.string(), "").default(""),
  view: fallback(z.string(), "list").default("list"),
  page: fallback(z.number().int(), 1).default(1),
  per: fallback(z.number().int(), 30).default(30),
  /** Produto aberto no quick view (compartilhável e reversível pelo histórico). */
  p: fallback(z.string(), "").default(""),
  /** Filtro de corte no hub de açougue: bovino | frango | suino | outros | "" */
  corte: fallback(z.string(), "").default(""),
  /** Só cortes (esconde temperos/molhos) — hub de açougue. 0 = tudo, 1 = só cortes. */
  so_cortes: fallback(z.number().int().min(0).max(1), 0).default(0),
  /** Subgrupo de hortifrúti: frutas | verduras | legumes | tuberculos | temperos | cogumelos */
  sub: fallback(z.string(), "").default(""),
});


export const Route = createFileRoute("/categoria/$slug")({
  validateSearch: zodValidator(searchSchema),
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },

  head: ({ params }) => {
    const def = categoryBySlug(params.slug);
    const label = def?.label ?? "Categoria";
    const title = `${label} em Feijó/AC — preços e lojas | PreçoCerto`;
    const description =
      def?.desc ??
      "Compare preços por categoria nos estabelecimentos parceiros de Feijó/AC.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const catLabel = useCategoryLabelWithFallback();
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const def = categoryBySlug(slug);
  const fetchHub = useServerFn(getCategoryHub);

  // Estado derivado da URL (compartilhável + voltar/avançar do navegador)
  const q = search.q;
  const storeFilter = search.loja;
  const view: "list" | "grid" = search.view === "grid" ? "grid" : "list";
  const perPage = [30, 60, 120].includes(search.per) ? search.per : 30;
  const page = Math.max(1, search.page);

  const setSearch = useCallback(
    (patch: Partial<typeof search>, opts?: { replace?: boolean }) => {
      navigate({
        to: "/categoria/$slug",
        params: { slug },
        search: { ...search, ...patch },
        replace: opts?.replace ?? false,
        resetScroll: false,
      });
    },
    [navigate, slug, search],
  );


  // Campo de busca: digitação local + sincronização debounced na URL (sem poluir o histórico)
  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    if (qInput === q) return;
    const t = window.setTimeout(() => setSearch({ q: qInput, page: 1 }, { replace: true }), 350);
    return () => window.clearTimeout(t);
  }, [qInput, q, setSearch]);

  const [limit, setLimit] = useState(24);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["category-hub", slug],
    queryFn: () => fetchHub({ data: { slug } }),
    enabled: Boolean(def),
    staleTime: 60_000,
    // Mantém o conteúdo anterior enquanto a nova categoria carrega, evitando
    // que a página encolha/expanda a cada troca de categoria.
    placeholderData: keepPreviousData,
  });

  const Icon = ICONS[slug] ?? Package;
  const totalAll = data?.totals.products ?? 0;
  const totalListed = data?.products.length ?? 0;

  // Conjunto de nomes de lojas do nicho (para ativar assumeButcher na classificação)
  const nicheStoreNames = useMemo(
    () => new Set((data?.stores ?? []).filter((s) => s.isNicheStore).map((s) => s.name)),
    [data],
  );

  // Classifica cada produto por proteína (só faz sentido em /categoria/acougues)
  const classifyProtein = useCallback(
    (p: { name: string; unit: string | null; storeNames: string[] }): ButcherProtein | null => {
      const assume = p.storeNames.some((n) => nicheStoreNames.has(n));
      return classifyButcherCut(p.name, p.unit, assume ? { assumeButcher: true, category: null } : undefined);
    },
    [nicheStoreNames],
  );

  const products = useMemo(() => {
    let list = data?.products ?? [];
    const term = norm(q.trim());
    if (term) list = list.filter((p) => norm(p.name).includes(term));
    if (storeFilter) list = list.filter((p) => p.storeNames.includes(storeFilter));

    // Hortifrúti: subgrupos (frutas, verduras, legumes, tubérculos, temperos, cogumelos)
    if (slug === "hortifruti" && search.sub) {
      list = list.filter((p) => hortifrutiSubgroup(p.name) === search.sub);
    }

    if (slug === "acougues") {
      // Anexa a proteína classificada e reordena para cortes primeiro
      const ORDER: Record<string, number> = { bovino: 0, frango: 1, suino: 2, outros: 3 };
      const enriched = list.map((p) => {
        const prot = classifyProtein(p);
        const bucket = prot ?? "outros";
        return { p, prot, bucket };
      });
      const filtered = enriched.filter((x) => {
        if (search.so_cortes && x.bucket === "outros") return false;
        if (search.corte && x.bucket !== search.corte) return false;
        return true;
      });
      filtered.sort((a, b) => {
        const oa = ORDER[a.bucket] ?? 9;
        const ob = ORDER[b.bucket] ?? 9;
        if (oa !== ob) return oa - ob;
        return a.p.minPrice - b.p.minPrice;
      });
      return filtered.map((x) => x.p);
    }
    return list;
  }, [data, q, storeFilter, slug, search.corte, search.so_cortes, search.sub, classifyProtein]);

  // Contagem por subgrupo de hortifrúti (não depende do subgrupo ativo, mas
  // respeita busca e loja para não anunciar filtros que resultariam em vazio).
  const subgroupCounts = useMemo(() => {
    if (slug !== "hortifruti") return null;
    const term = norm(q.trim());
    const acc: Record<HortifrutiSubgroup, number> = {
      frutas: 0,
      verduras: 0,
      legumes: 0,
      tuberculos: 0,
      temperos: 0,
      cogumelos: 0,
    };
    for (const p of data?.products ?? []) {
      if (term && !norm(p.name).includes(term)) continue;
      if (storeFilter && !p.storeNames.includes(storeFilter)) continue;
      const g = hortifrutiSubgroup(p.name);
      if (g) acc[g] += 1;
    }
    return acc;
  }, [data, slug, q, storeFilter]);

  /**
   * Economia média recalculada sobre os produtos realmente exibidos, para que
   * cabeçalho e cartões de loja fiquem coerentes com os filtros ativos
   * (mesma fórmula do servidor). Sem filtro, cai nos números do servidor.
   */
  const filtersActive = Boolean(q.trim() || storeFilter || search.sub || search.corte || search.so_cortes);
  const savings = useMemo(() => computeHubSavings(products), [products]);
  const catAvgSaving = filtersActive ? savings.avgSavingPct : (data?.avgSavingPct ?? null);
  const catComparable = filtersActive ? savings.comparableProducts : (data?.comparableProducts ?? 0);

  /** Menor preço encontrado no recorte atual — métrica mais útil que a contagem de coletas. */
  const cheapestPrice = useMemo(() => {
    const values = products.map((p) => p.minPrice).filter((v) => Number.isFinite(v) && v > 0);
    return values.length ? Math.min(...values) : null;
  }, [products]);

  /** Lojas com a economia do recorte atual, na mesma ordem em desktop e mobile. */
  const displayStores = useMemo(() => {
    const list = data?.stores ?? [];
    if (!filtersActive) return list;
    return [...list]
      .map((s) => {
        const f = savings.byStore.get(s.id);
        return { ...s, avgSavingPct: f?.avgSavingPct ?? null, comparedProducts: f?.comparedProducts ?? 0 };
      })
      .sort(
        (a, b) =>
          Number(b.isNicheStore) - Number(a.isNicheStore) ||
          (b.avgSavingPct ?? -1) - (a.avgSavingPct ?? -1) ||
          b.productCount - a.productCount,
      );
  }, [data, savings, filtersActive]);

  // Contagem por bucket para os chips de filtro (independente do filtro corte ativo)
  const proteinCounts = useMemo(() => {
    if (slug !== "acougues") return null;
    const acc = { bovino: 0, frango: 0, suino: 0, outros: 0 } as Record<string, number>;
    for (const p of data?.products ?? []) {
      const prot = classifyProtein(p);
      acc[prot ?? "outros"] += 1;
    }
    return acc;
  }, [data, slug, classifyProtein]);

  // Quick view controlado pela URL (?p=nome): compartilhável e reversível
  // com voltar/avançar do navegador.
  const openProduct = search.p;
  const quickView = useMemo(() => {
    if (!openProduct) return null;
    const found = (data?.products ?? []).find((p) => p.name === openProduct);
    return found ?? { name: openProduct };
  }, [openProduct, data]);

  const openQuickView = useCallback(
    (name: string) => setSearch({ p: name }),
    [setSearch],
  );
  const closeQuickView = useCallback(() => setSearch({ p: "" }), [setSearch]);

  // Contagens e páginas sempre coerentes com filtros/loja/categoria ativa
  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * perPage;
  const visible = view === "list" ? products.slice(pageStart, pageStart + perPage) : products.slice(0, limit);

  useEffect(() => {
    setLimit(24);
  }, [slug, q, storeFilter, perPage, view, search.sub]);

  // Restaura a rolagem e a categoria ativa ao usar voltar/avançar.
  useScrollRestoration(!isLoading && Boolean(def));



  if (!def) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 pt-3"><HomeBrandLink /></div>
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-serif text-[24px] font-semibold">Categoria não encontrada</h1>
          <Link to="/" className="mt-4 inline-block text-[13px] font-semibold text-brand-gold underline">
            Voltar à página inicial
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-3"><HomeBrandLink /></div>
      <main className="pc-rail mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-3 pb-6 pt-3 [scrollbar-gutter:stable] sm:px-6">

        {/* Hero compacto — escala tipográfica única (eyebrow 11 / título 19-22 / meta 12 / stat 16).
            `data-surface="navy"` + `.gold-on-dark` garantem dourado vivo (AA) no modo claro. */}
        <header data-surface="navy" className="overflow-hidden rounded-xl border border-border/70 bg-[var(--pc-navy,#0f1b3d)] text-white shadow-sm">
          <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gold text-brand-navy sm:h-10 sm:w-10">
              <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="gold-on-dark text-[11px] font-bold uppercase leading-none tracking-[0.18em] text-brand-gold">
                Categoria
              </p>
              <h1 className="mt-1 truncate font-serif text-[19px] font-semibold leading-[1.15] text-white sm:text-[22px]">
                {catLabel(def.slug, def.label)}
              </h1>
              <p className="mt-1 truncate text-[12px] leading-snug text-white/85">{def.desc}</p>
            </div>
            <dl className="hidden shrink-0 items-start gap-5 sm:flex">
              <Stat label="Produtos" value={data?.totals.products ?? 0} hint="Itens distintos cadastrados nesta categoria" />
              <Stat label="Lojas" value={data?.totals.stores ?? 0} hint="Estabelecimentos com produtos desta categoria" />
              <Stat
                label="Registros de preço"
                value={data?.totals.prices ?? 0}
                hint="Preços coletados e conferidos nesta categoria"
              />

              <Stat
                label="Economia média"
                value={catAvgSaving ?? 0}
                suffix="%"
                hint={
                  catComparable
                    ? `${catComparable} produto(s) comparável(is)${filtersActive ? " no filtro atual" : ""}`
                    : "sem produtos em 2+ lojas"
                }
              />

            </dl>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-y divide-white/20 border-t border-white/20 sm:hidden">
            <div className="px-3 py-2">
              <Stat label="Produtos" value={data?.totals.products ?? 0} align="left" />
            </div>
            <div className="px-3 py-2">
              <Stat label="Lojas" value={data?.totals.stores ?? 0} align="left" />
            </div>
            <div className="px-3 py-2">
              <Stat label="Registros" value={data?.totals.prices ?? 0} align="left" hint="Preços coletados e conferidos nesta categoria" />
            </div>
            <div className="px-3 py-2">
              <Stat
                label="Economia média"
                value={catAvgSaving ?? 0}
                suffix="%"
                align="left"
              />
            </div>
          </dl>

        </header>


        {/* Trilho de categorias — setas de navegação + roda do mouse horizontal */}
        <CategoryRail current={slug} />

        {/* Filtro por corte quando o usuário abre o hub de açougues */}
        {slug === "acougues" && proteinCounts && (
          <ButcherProteinChips
            active={search.corte}
            counts={proteinCounts}
            onlyCuts={Boolean(search.so_cortes)}
            onChange={(v: string) => setSearch({ corte: v, page: 1 })}
            onToggleOnlyCuts={() =>
              setSearch({ so_cortes: search.so_cortes ? 0 : 1, page: 1 })
            }
          />
        )}

        {/* Subgrupos do hortifrúti — mesma faixa rolável no desktop e no mobile */}
        {slug === "hortifruti" && subgroupCounts && (
          <HortifrutiSubgroupChips
            active={search.sub}
            counts={subgroupCounts}
            onChange={(v: string) => setSearch({ sub: v, page: 1 })}
          />
        )}

        {/* Plantão (só farmácias) */}
        {slug === "farmacias" && <PlantaoStrip />}

        {/* Lojas do nicho */}
        <section className="mt-5" aria-label={`Estabelecimentos — ${def.label}`}>
          <SectionTitle icon={Building2} title="Estabelecimentos" hint={`${data?.stores.length ?? 0} no nicho`} />
          {isLoading ? (
            <SkeletonRow />
          ) : (data?.stores.length ?? 0) === 0 ? (
            <EmptyCard text="Nenhum estabelecimento desta categoria cadastrado ainda." />
          ) : (
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {displayStores.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/estabelecimento/$slug"
                    params={{ slug: s.slug }}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-brand-gold"
                  >
                    <StoreBadge name={s.name} logoUrl={s.logoUrl} brandColor={s.brandColor} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{s.name}</span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">
                        {s.neighborhood ?? "Feijó/AC"} · {s.productCount} item(ns) na categoria
                      </span>
                      {/* Economia média desta loja vs. maior preço, ao lado da média
                          geral da categoria — mostra onde o usuário ganha mais. */}
                      {s.avgSavingPct !== null && (
                        <span
                          className="mt-0.5 block truncate text-[11px] font-semibold tabular-nums text-brand-gold"
                          title={`Média em ${s.comparedProducts} produto(s) presentes em 2+ lojas. Média da categoria: ${catAvgSaving ?? 0}%`}
                        >
                          Economia média aqui: {s.avgSavingPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                          <span className="font-medium text-muted-foreground">
                            {" "}· categoria {(catAvgSaving ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                          </span>
                        </span>
                      )}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden />

                  </Link>
                  {slug === "acougues" && !s.isNicheStore && (
                    <Link
                      to="/estabelecimento/$slug"
                      params={{ slug: s.slug }}
                      search={{ aba: "acougue" } as never}
                      className="mt-1 inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-semibold text-foreground hover:border-brand-gold"
                    >
                      <Beef className="h-3 w-3 text-brand-gold" aria-hidden /> Ver açougue do mercado
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Produtos do nicho */}
        <section className="mt-5" aria-label={`Produtos — ${def.label}`}>
          <SectionTitle
            icon={Package}
            title="Produtos da categoria"
            hint={
              isLoading
                ? "carregando…"
                : filtersActive
                  ? `${products.length.toLocaleString("pt-BR")} de ${totalListed.toLocaleString("pt-BR")} filtrado(s)`
                  : totalAll > totalListed
                    ? `${totalListed.toLocaleString("pt-BR")} exibidos de ${totalAll.toLocaleString("pt-BR")}`
                    : `${totalAll.toLocaleString("pt-BR")} produto(s)`
            }
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <label htmlFor="cat-prod-search" className="sr-only">
                Filtrar produtos da categoria
              </label>
              <input
                id="cat-prod-search"
                type="search"
                name="pc-cat-search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                aria-controls="cat-prod-results"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode="search"
                enterKeyHint="search"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                placeholder={slug === "acougues" ? "Buscar corte: picanha, filé, costela…" : `Filtrar em ${def.label.toLowerCase()}…`}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13.5px] outline-none focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/50"
              />
            </div>
            <ViewToggle
              view={view}
              onChange={(v) => setSearch({ view: v, page: 1 })}
            />
          </div>

          {(data?.stores.length ?? 0) > 1 && (
            <div
              role="group"
              aria-label="Filtrar por loja"
              className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible"
            >
              <FilterChip
                label="Todas as lojas"
                active={storeFilter === ""}
                onClick={() => setSearch({ loja: "", page: 1 })}
              />
              {displayStores.map((s2) => (
                <FilterChip
                  key={s2.id}
                  label={s2.name}
                  active={storeFilter === s2.name}
                  onClick={() =>
                    setSearch({ loja: storeFilter === s2.name ? "" : s2.name, page: 1 })
                  }
                />
              ))}
            </div>
          )}


          {isLoading ? (
            <SkeletonRow />
          ) : products.length === 0 ? (
            <EmptyCard
              text={
                q || storeFilter
                  ? "Nenhum produto encontrado com esse filtro."
                  : "Ainda não há produtos desta categoria cadastrados. Colabore enviando fotos de etiquetas."
              }
              action={
                !q && !storeFilter
                  ? { label: "Quero colaborar", onClick: () => navigate({ to: "/colaborar" }) }
                  : undefined
              }
            />
          ) : (
            <div id="cat-prod-results">

              <p className="sr-only" aria-live="polite">
                {`${products.length.toLocaleString("pt-BR")} produto(s) — modo ${view === "list" ? "lista" : "grade"}${
                  view === "list" ? `, página ${safePage} de ${totalPages}` : ""
                }`}
              </p>
              {view === "grid" ? (
                // Grade densa: 2 colunas já no mobile — cards de 1 coluna
                // ficavam exageradamente grandes e exigiam muita rolagem.
                <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">

                  {visible.map((p, idx) => {
                    const isTop = idx === 0 && safePage === 1;
                    return (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => openQuickView(p.name)}
                        className={cn(
                          "flex h-full w-full items-start gap-2 p-2 text-left",
                          isTop ? "pc-surface-3-interactive" : "pc-surface-2-interactive",
                        )}
                      >
                        <StoreBadge name={p.cheapestStore} logoUrl={p.cheapestLogo} size="xs" />
                        <span className="min-w-0 flex-1">
                          {isTop && <span className={cn(tc.eyebrow, "mb-0.5 block")}>Menor oferta</span>}
                          <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight">
                            {p.name}
                          </span>
                          <span className={cn("mt-0.5 block truncate", tc.storeNameTight)}>
                            {p.cheapestStore}
                            {p.storeCount > 1 ? ` · ${p.storeCount} mercados` : ""}
                          </span>
                          <Price
                            as="div"
                            value={p.minPrice}
                            size={isTop ? "md" : "sm"}
                            tone={isTop ? "best" : "default"}
                            className="mt-0.5"
                          />
                        </span>
                      </button>
                    </li>
                    );
                  })}
                </ul>

              ) : (
              <ul className="mt-2 space-y-1.5">
                {visible.map((p, idx) => {
                  const isTop = idx === 0 && safePage === 1;
                  return (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => openQuickView(p.name)}
                      aria-label={`Ver detalhes de ${p.name}`}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-2.5 py-2 text-left",
                        isTop ? "pc-surface-3-interactive" : "pc-surface-2-interactive",
                      )}
                    >
                      <StoreBadge name={p.cheapestStore} logoUrl={p.cheapestLogo} size="xs" />
                      <span className="min-w-0 flex-1">
                        {isTop && <span className={cn(tc.eyebrow, "mb-0.5 block")}>Menor oferta</span>}
                        <span className="block truncate text-[13px] font-semibold leading-tight">
                          {p.name}
                        </span>
                        <span className={cn("block truncate", tc.storeNameTight)}>
                          {p.cheapestStore}
                          {p.storeCount > 1 ? ` · ${p.storeCount} mercados` : ""}
                          {p.unit ? ` · ${p.unit}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Price
                          as="div"
                          value={p.minPrice}
                          size={isTop ? "lg" : "sm"}
                          tone={isTop ? "best" : "default"}
                          className="justify-end"
                        />
                        {p.storeCount > 1 && p.maxPrice > p.minPrice && (
                          <span className={cn("block", tc.metaMuted)}>
                            até <Price value={p.maxPrice} size="xs" tone="muted" />
                          </span>
                        )}
                      </span>
                      <span className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                        isTop ? "text-[var(--pc-gold-ink)]" : "border border-[var(--pc-surface-2-border)] text-brand-gold",
                      )}>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </button>
                  </li>
                  );
                })}
              </ul>
              )}

              {view === "list" ? (
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  perPage={perPage}
                  from={products.length === 0 ? 0 : pageStart + 1}
                  to={Math.min(pageStart + perPage, products.length)}
                  total={products.length}
                  onPage={(n) => {
                    setSearch({ page: n });
                    document.getElementById("cat-prod-search")?.scrollIntoView({ block: "center" });
                  }}
                  onPerPage={(n) => setSearch({ per: n, page: 1 })}

                />
              ) : (
                products.length > limit && (
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + 24)}
                    className="mt-2 h-9 w-full rounded-lg border border-border bg-card text-[12.5px] font-semibold hover:border-brand-gold"
                  >
                    Mostrar mais ({products.length - limit} restantes)
                  </button>
                )
              )}
            </div>

          )}
        </section>
      </main>
      <ProductQuickView product={quickView} onClose={closeQuickView} />
      <SiteFooter />
    </div>
  );
}

/** Alternância Lista/Grade acessível: radiogroup com foco rotativo e setas do teclado. */
function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "grid";
  onChange: (v: "list" | "grid") => void;
}) {
  const options = [
    { id: "list", label: "Lista", Icon: List },
    { id: "grid", label: "Grade", Icon: LayoutGrid },
  ] as const;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (dir: -1 | 1, index: number) => {
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Modo de exibição dos produtos"
      className="flex h-10 shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1"
    >
      {options.map(({ id, label, Icon: VIcon }, i) => {
        const selected = view === id;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Exibir em ${label.toLowerCase()}`}
            aria-controls="cat-prod-results"
            tabIndex={selected ? 0 : -1}
            title={label}
            onClick={() => onChange(id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1, i);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1, i);
              } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onChange(id);
              }
            }}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
              selected
                ? "bg-brand-gold text-brand-navy"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <VIcon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}


function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-[11.5px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
        active
          ? "border-brand-gold bg-brand-gold text-brand-navy"
          : "border-border bg-card text-muted-foreground hover:border-brand-gold hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/** Paginação numérica consistente para o modo Lista. */
function Pagination({
  page,
  totalPages,
  perPage,
  from,
  to,
  total,
  onPage,
  onPerPage,
}: {
  page: number;
  totalPages: number;
  perPage: number;
  from: number;
  to: number;
  total: number;
  onPage: (n: number) => void;
  onPerPage: (n: number) => void;
}) {
  const pages = useMemo(() => {
    const out: (number | "…")[] = [];
    const push = (n: number) => out.push(n);
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) push(i);
      return out;
    }
    push(1);
    if (page > 3) out.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i);
    if (page < totalPages - 2) out.push("…");
    push(totalPages);
    return out;
  }, [page, totalPages]);

  const btn =
    "grid h-8 min-w-8 place-items-center rounded-md border px-2 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-40";

  return (
    <nav
      aria-label="Paginação de produtos"
      className="mt-2.5 flex flex-col gap-2 border-t border-border pt-2.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[11.5px] text-muted-foreground" aria-live="polite">
        {total === 0
          ? "Nenhum resultado"
          : `Exibindo ${from.toLocaleString("pt-BR")}–${to.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}`}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={cn(btn, "border-border bg-card")}
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {pages.map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-[12px] text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                btn,
                n === page
                  ? "border-brand-gold bg-brand-gold text-brand-navy"
                  : "border-border bg-card text-foreground hover:border-brand-gold",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(btn, "border-border bg-card")}
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <label className="ml-1 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Por página</span>
          <select
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            className="h-8 rounded-md border border-border bg-card px-1.5 text-[12px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {[30, 60, 120].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </nav>
  );
}

/** Trilho horizontal de categorias com setas, roda do mouse, arraste e teclado. */
function CategoryRail({ current }: { current: string }) {
  const railLabel = useCategoryLabelWithFallback();
  const ref = useRef<HTMLDivElement | null>(null);
  const ctrl = useRef<ReturnType<typeof createRailController> | null>(null);
  const [{ canPrev, canNext }, setState] = useState({ canPrev: false, canNext: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const c = createRailController(el, setState);
    ctrl.current = c;
    return () => {
      c.destroy();
      ctrl.current = null;
    };
  }, []);

  // Centraliza (e revalida) sempre que a categoria ativa muda.
  useEffect(() => {
    ctrl.current?.centerActive("smooth");
    ctrl.current?.sync();
  }, [current]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (ctrl.current?.handleKey(e.key)) e.preventDefault();
  };

  return (
    <nav aria-label="Outras categorias" className="relative mt-2.5">
      <p id="cat-rail-help" className="sr-only">
        Use as setas esquerda e direita para navegar entre as categorias. Home vai para a
        primeira e End para a última.
      </p>
      <div
        ref={ref}
        onKeyDown={onKeyDown}
        role="group"
        aria-describedby="cat-rail-help"
        className={cn(
          "no-scrollbar overflow-x-auto overscroll-x-contain scroll-smooth py-1",
          // O espaço lateral acompanha a presença das setas para nunca recortar
          // o primeiro/último chip em nenhuma largura de tela.
          "[scroll-padding-inline:2.25rem]",
          canPrev ? "pl-9" : "pl-0.5",
          canNext ? "pr-9" : "pr-0.5",
        )}

      >
        <ul className="flex w-max gap-1.5 pr-1">
          {CATEGORY_DEFS.map((c) => {
            const CIcon = ICONS[c.slug] ?? Package;
            const active = c.slug === current;
            return (
              <li key={c.slug}>
                <Link
                  to="/categoria/$slug"
                  params={{ slug: c.slug }}
                  data-rail-item=""
                  aria-current={active ? "page" : undefined}
                  aria-label={`Categoria ${c.label}${active ? " (atual)" : ""}`}
                  tabIndex={active ? 0 : -1}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-brand-gold bg-brand-gold text-brand-navy"
                      : "border-border bg-card text-foreground hover:border-brand-gold",
                  )}
                >
                  <CIcon className="h-3.5 w-3.5" aria-hidden /> {railLabel(c.slug, c.short)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>


      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity",
          canPrev ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity",
          canNext ? "opacity-100" : "opacity-0",
        )}
      />
      <RailArrow side="left" onClick={() => ctrl.current?.scrollByPage(-1)} disabled={!canPrev} />
      <RailArrow side="right" onClick={() => ctrl.current?.scrollByPage(1)} disabled={!canNext} />

    </nav>
  );
}

function RailArrow({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Categorias anteriores" : "Próximas categorias"}
      className={cn(
        "absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition-opacity hover:border-brand-gold",
        side === "left" ? "left-0" : "right-0",
        disabled && "pointer-events-none opacity-0",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function Stat({
  label,
  value,
  align = "right",
  suffix,
  hint,
}: {
  label: string;
  value: number;
  align?: "left" | "right";
  /** sufixo exibido junto ao número (ex.: "%") */
  suffix?: string;
  /** texto auxiliar em `title` para explicar a métrica */
  hint?: string;
}) {
  return (
    // Rótulo em white/85 (≈ 9:1 sobre navy) e número dourado marcado como
    // `gold-on-dark` para não cair no ink escuro do modo claro.
    <div className={align === "left" ? "text-left" : "text-right"} title={hint}>
      <dt className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-white/85">
        {label}
      </dt>
      <dd className="gold-on-dark mt-1.5 text-[16px] font-bold leading-none tabular-nums text-brand-gold">
        {value.toLocaleString("pt-BR", suffix === "%" ? { maximumFractionDigits: 1 } : undefined)}
        {suffix ? <span className="text-[12px] font-semibold">{suffix}</span> : null}
      </dd>
    </div>


  );
}


function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Package;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={cn("inline-flex items-center gap-1.5", tc.eyebrow)}>
        <Icon className="h-3.5 w-3.5 text-[var(--pc-gold-ink)]" aria-hidden /> {title}
      </h2>
      {hint && <span className={tc.metaMuted}>{hint}</span>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="mt-2 space-y-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}

/**
 * Chips de filtro por proteína no hub de açougues.
 * Bovinos / Frango / Suínos / Outros — reflete o `?corte=` na URL.
 */
function ButcherProteinChips({
  active,
  counts,
  onlyCuts,
  onChange,
  onToggleOnlyCuts,
}: {
  active: string;
  counts: Record<string, number>;
  onlyCuts: boolean;
  onChange: (v: string) => void;
  onToggleOnlyCuts: () => void;
}) {
  const CHIPS: { id: string; label: string; Icon: typeof Beef }[] = [
    { id: "", label: "Todos", Icon: Beef },
    { id: "bovino", label: "Bovinos", Icon: Beef },
    { id: "frango", label: "Frango", Icon: Bird },
    { id: "suino", label: "Suínos", Icon: Drumstick },
    { id: "outros", label: "Outros", Icon: Package },
  ];
  // Quando "só cortes" está ativo, escondemos o chip "Outros" e reduzimos o total.
  const visibleChips = onlyCuts ? CHIPS.filter((c) => c.id !== "outros") : CHIPS;
  const total = counts.bovino + counts.frango + counts.suino + (onlyCuts ? 0 : counts.outros);
  return (
    <section
      aria-label="Filtrar por corte"
      className="mt-3 rounded-xl border border-brand-gold/50 bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] px-2.5 py-2 sm:px-3 sm:py-2.5"
    >
      {/* Cabeçalho: rótulo + toggle "Só cortes" — grid no mobile evita colisão com o trilho */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--pc-gold-ink)]">
          <Beef className="h-3 w-3 shrink-0" aria-hidden /> Açougue — cortes
        </span>
        <button
          type="button"
          onClick={onToggleOnlyCuts}
          role="switch"
          aria-checked={onlyCuts}
          title={onlyCuts ? "Mostrar temperos, molhos e afins" : "Esconder temperos e molhos"}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
            onlyCuts
              ? "border-brand-gold bg-brand-gold text-brand-navy"
              : "border-brand-gold/50 bg-background text-foreground hover:border-brand-gold",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "grid h-3.5 w-6 place-items-start rounded-full p-0.5 transition-colors",
              onlyCuts ? "bg-brand-navy/25" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full bg-background transition-transform",
                onlyCuts ? "translate-x-2.5" : "translate-x-0",
              )}
            />
          </span>
          <span className="hidden xs:inline">Só cortes</span>
          <span className="xs:hidden">Cortes</span>
        </button>
      </div>

      {/* Trilho horizontal no mobile · wrap no desktop. no-scrollbar mantém o visual limpo. */}
      <ul
        role="list"
        className="no-scrollbar mt-2 -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 sm:flex-wrap sm:overflow-visible"
      >
        {visibleChips.map((c) => {
          const n = c.id === "" ? total : (counts[c.id] ?? 0);
          const isActive = active === c.id;
          const disabled = n === 0 && c.id !== "";
          return (
            <li key={c.id || "all"} className="shrink-0">
              <button
                type="button"
                onClick={() => !disabled && onChange(c.id)}
                disabled={disabled}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                  isActive
                    ? "border-brand-gold bg-brand-gold text-brand-navy"
                    : "border-brand-gold/50 bg-background text-foreground hover:border-brand-gold",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <c.Icon className={cn("h-3 w-3", isActive ? "text-brand-navy" : "text-brand-gold")} aria-hidden />
                {c.label}
                <span className={cn("ml-0.5 tabular-nums", isActive ? "text-brand-navy/80" : "text-muted-foreground")}>
                  {n}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Chips de subgrupo do hortifrúti (frutas, verduras, legumes, tubérculos,
 * temperos, cogumelos). Mesma marcação em desktop e mobile: trilho rolável
 * no mobile, wrap no desktop — sem divergência de ordem ou contagem.
 */
const HF_SUBGROUP_ORDER: HortifrutiSubgroup[] = [
  "frutas",
  "verduras",
  "legumes",
  "tuberculos",
  "temperos",
  "cogumelos",
];

function HortifrutiSubgroupChips({
  active,
  counts,
  onChange,
}: {
  active: string;
  counts: Record<HortifrutiSubgroup, number>;
  onChange: (v: string) => void;
}) {
  const total = HF_SUBGROUP_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0);
  const chips: { id: string; label: string; n: number }[] = [
    { id: "", label: "Todos", n: total },
    ...HF_SUBGROUP_ORDER.map((k) => ({
      id: k,
      label: HORTIFRUTI_SUBGROUP_LABELS[k],
      n: counts[k] ?? 0,
    })),
  ];

  return (
    <section className="mt-3" aria-label="Filtrar por subgrupo do hortifrúti">
      <p className="text-[11px] font-bold uppercase leading-none tracking-[0.16em] text-muted-foreground">
        Subgrupos
      </p>
      <ul
        role="list"
        className="no-scrollbar mt-2 -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 sm:flex-wrap sm:overflow-visible"
      >
        {chips.map((c) => {
          const isActive = active === c.id;
          const disabled = c.n === 0 && c.id !== "";
          return (
            <li key={c.id || "all"} className="shrink-0">
              <button
                type="button"
                onClick={() => !disabled && onChange(isActive && c.id ? "" : c.id)}
                disabled={disabled}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                  isActive
                    ? "border-brand-gold bg-brand-gold text-brand-navy"
                    : "border-brand-gold/50 bg-background text-foreground hover:border-brand-gold",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <Apple className={cn("h-3 w-3", isActive ? "text-brand-navy" : "text-brand-gold")} aria-hidden />
                {c.label}
                <span className={cn("ml-0.5 tabular-nums", isActive ? "text-brand-navy/80" : "text-muted-foreground")}>
                  {c.n}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}



function EmptyCard({
  text,
  action,
}: {
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="pc-surface-1 mt-2 border-dashed px-4 py-6 text-center">
      <p className="text-[12.5px] text-muted-foreground">{text}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 h-9 rounded-full bg-brand-gold px-4 text-[12.5px] font-bold text-brand-navy"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Faixa compacta com o plantão de hoje/amanhã + atalho para o calendário. */
function PlantaoStrip() {
  const hoje = diaVigente();
  const f = hoje ? farmaciaPorId(PLANTOES[hoje]) : null;
  const amanha = hoje && PLANTOES[hoje + 1] ? farmaciaPorId(PLANTOES[hoje + 1]) : null;

  return (
    <section
      className="mt-2.5 overflow-hidden rounded-xl border border-brand-gold/55 bg-brand-gold/10"
      aria-label="Plantão das farmácias"
    >
      <div className="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
          <span className="inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full bg-brand-gold px-2.5 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-brand-navy">
            <CalendarDays className="h-3 w-3" aria-hidden />
            Plantão{hoje ? ` · ${diaDaSemana(hoje)}` : ""}
          </span>
          <p className="min-w-0 truncate text-[13px] font-semibold leading-snug text-foreground">
            {f ? (
              <>
                {f.nome}
                <span className="font-normal text-muted-foreground">
                  {" — "}
                  {f.endereco}, {f.bairro}
                </span>
              </>
            ) : (
              "Consulte o calendário oficial do mês"
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {f?.telefones[0] && (
            <a
              href={`tel:${f.telefones[0].replace(/\D/g, "")}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[11.5px] font-semibold leading-none whitespace-nowrap text-foreground transition-colors hover:border-brand-gold"
            >
              <Phone className="h-3 w-3 text-brand-gold" aria-hidden /> {f.telefones[0]}
            </a>
          )}
          <Link
            to="/farmacias"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-gold px-3 text-[11.5px] font-bold leading-none whitespace-nowrap text-brand-navy transition-opacity hover:opacity-90"
          >
            Calendário completo <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
      {amanha && (
        <p className="border-t border-brand-gold/25 px-3 py-1.5 text-[11.5px] leading-snug text-muted-foreground">
          Amanhã: <strong className="font-semibold text-foreground">{amanha.nome}</strong> —{" "}
          {amanha.bairro}
        </p>
      )}
    </section>
  );

}
