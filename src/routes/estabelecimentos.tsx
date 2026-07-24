import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  listPublicEstablishments,
  humanizeCategory,
  type EstablishmentsOverview,
} from "@/lib/establishments-public.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  PageHeader,
  SectionCard,
  StatGrid,
  EmptyState,
  LoadingSkeleton,
  CardSkeleton,
} from "@/components/layout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, MapPin, Package, Search, Sparkles, Store, TrendingUp, Pill, Croissant, Beef, ShoppingBasket, PiggyBank, Radio, ChevronLeft } from "lucide-react";
import mercadosHero from "@/assets/mercados-hero-v2.jpg.asset.json";
import { useRef } from "react";
import { useAdaptiveOverlayOpacity } from "@/hooks/use-adaptive-overlay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/estabelecimentos")({
  head: () => ({
    meta: [
      { title: "Estabelecimentos com preços atualizados — PreçoCerto" },
      {
        name: "description",
        content:
          "Veja quantos produtos cada mercado tem cadastrado, quais são as categorias mais comuns e onde encontrar os melhores preços em Feijó/AC.",
      },
      { property: "og:title", content: "Mercados parceiros — PreçoCerto" },
      {
        property: "og:description",
        content:
          "Rede de mercados com preços monitorados e categorias mais populares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstablishmentsPage,
});

function EstablishmentsPage() {
  const fetchList = useServerFn(listPublicEstablishments);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-establishments"],
    queryFn: () => fetchList({}),
    staleTime: 60_000,
  });

  const [q, setQ] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>("__all");
  const [sort, setSort] = useState<"name" | "neighborhood" | "products">("neighborhood");
  const [kindFilter, setKindFilter] = useState<string>("__all");
  const [metricDetail, setMetricDetail] = useState<null | "establishments" | "products" | "savings" | "live">(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayOpacity = useAdaptiveOverlayOpacity(mercadosHero.url, { min: 0.6, max: 0.94 });

  const neighborhoods = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    for (const e of data.items) if (e.neighborhood) set.add(e.neighborhood);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data]);

  const visibleItems = useMemo(() => {
    if (!data) return [] as EstablishmentsOverview["items"];
    const term = q.trim().toLowerCase();
    let list = data.items.slice();
    if (kindFilter !== "__all") {
      list = list.filter((e) => (e.kind ?? "outro") === kindFilter);
    }
    if (neighborhood !== "__all") {
      list = list.filter((e) => (e.neighborhood ?? "") === neighborhood);
    }
    if (term) {
      list = list.filter((e) =>
        [e.name, e.neighborhood ?? "", e.city ?? ""].some((v) =>
          v.toLowerCase().includes(term),
        ),
      );
    }
    switch (sort) {
      case "neighborhood":
        list.sort((a, b) => {
          const an = a.neighborhood ?? "\uffff";
          const bn = b.neighborhood ?? "\uffff";
          const cmp = an.localeCompare(bn, "pt-BR");
          return cmp !== 0 ? cmp : a.name.localeCompare(b.name, "pt-BR");
        });
        break;
      case "products":
        list.sort((a, b) => b.productsCount - a.productsCount);
        break;
      case "name":
      default:
        list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    return list;
  }, [data, q, neighborhood, sort, kindFilter]);

  const kindsPresent = useMemo(() => {
    if (!data) return new Set<string>();
    const s = new Set<string>();
    for (const it of data.items) s.add(it.kind ?? "outro");
    return s;
  }, [data]);

  const featured = useMemo(() => {
    if (!data) return [] as EstablishmentsOverview["items"];
    return data.items.slice().sort((a, b) => b.productsCount - a.productsCount).slice(0, 8);
  }, [data]);

  const KIND_META: Record<string, { label: string; icon: typeof Store; tagline: string }> = {
    mercado: { label: "Supermercados", icon: ShoppingBasket, tagline: "Compare a cesta básica entre os supermercados de Feijó" },
    farmacia: { label: "Farmácias", icon: Pill, tagline: "Preços de medicamentos e cuidados no seu bairro" },
    padaria: { label: "Padarias", icon: Croissant, tagline: "Pães, bolos e insumos com preço monitorado" },
    acougue: { label: "Açougues", icon: Beef, tagline: "Cortes bovinos, suínos e aves comparados no dia" },
    outro: { label: "Outros comércios", icon: Store, tagline: "Comércios parceiros com preços validados" },
  };
  const currentKind = kindFilter === "__all" ? null : (KIND_META[kindFilter] ?? KIND_META.outro);

  const scrollCarousel = (dir: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  // Drag-to-scroll + wheel horizontal para navegar com o mouse
  const dragState = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false, startX: 0, startScroll: 0, moved: false,
  });
  const onCarouselPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el || ev.pointerType === "touch") return;
    dragState.current = { active: true, startX: ev.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(ev.pointerId);
    el.style.cursor = "grabbing";
  };
  const onCarouselPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    const st = dragState.current;
    if (!el || !st.active) return;
    const dx = ev.clientX - st.startX;
    if (Math.abs(dx) > 4) st.moved = true;
    el.scrollLeft = st.startScroll - dx;
  };
  const onCarouselPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    dragState.current.active = false;
    try { el.releasePointerCapture(ev.pointerId); } catch {}
    el.style.cursor = "grab";
  };
  const onCarouselWheel = (ev: React.WheelEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
      el.scrollLeft += ev.deltaY;
    }
  };
  const onCarouselLinkClickCapture = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      ev.preventDefault();
      ev.stopPropagation();
      dragState.current.moved = false;
    }
  };


  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-8">
      <SiteHeader variant="solid" />

      {/* Hero editorial — imagem de supermercado, contraste WCAG, dados ao vivo, carrossel de mercados */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div aria-hidden className="absolute inset-0 -z-40" style={{ background: "var(--brand-navy)" }} />
        <img
          aria-hidden
          src={mercadosHero.url}
          alt=""
          className="absolute inset-0 -z-30 h-full w-full object-cover scale-[1.02] blur-[1px]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        {/* Véu escuro adaptativo — opacidade calculada pela luminância da foto */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20 transition-[background] duration-500"
          style={{
            background: `linear-gradient(90deg,
              color-mix(in oklab, var(--brand-navy) ${Math.round(heroOverlayOpacity * 100)}%, transparent) 0%,
              color-mix(in oklab, var(--brand-navy) ${Math.round(Math.max(0, heroOverlayOpacity - 0.06) * 100)}%, transparent) 55%,
              color-mix(in oklab, var(--brand-navy) ${Math.round(Math.max(0, heroOverlayOpacity - 0.2) * 100)}%, transparent) 100%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(700px 260px at 6% -20%, color-mix(in oklab, var(--brand-gold) 22%, transparent) 0%, transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 85%, transparent) 50%, transparent)",
          }}
        />

        <div className="mx-auto w-full max-w-6xl px-4 md:px-8 pt-4 md:pt-5 pb-4 md:pb-5">
          <nav aria-label="Trilha" className="mb-2 flex items-center gap-1 text-[12px] font-semibold text-white">
            <Link to="/" className="text-white hover:text-brand-gold">Início</Link>
            <ChevronRight aria-hidden className="h-3 w-3 text-white/80" />
            <span className="text-brand-gold">Mercados</span>
          </nav>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-navy">
              {currentKind ? <currentKind.icon className="h-3 w-3" aria-hidden /> : <Store className="h-3 w-3" aria-hidden />}
              {currentKind ? currentKind.label : "Comércios parceiros"}
            </div>
            <h1 className="text-[20px] md:text-[24px] font-bold leading-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.65)]">
              {currentKind ? currentKind.label : "Comércios"} de Feijó
            </h1>

          </div>
          <p className="mt-2 inline-block max-w-2xl rounded-md bg-brand-navy/75 px-2.5 py-1 text-[12.5px] md:text-[13.5px] font-medium leading-snug text-white ring-1 ring-white/10 backdrop-blur-[2px] [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]">
            {currentKind ? currentKind.tagline : "Cobertura de produtos, categorias e comparativo entre estabelecimentos monitorados pela comunidade."}
          </p>

          {/* Chips de categoria */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["__all", ...Object.keys(KIND_META)] as const).map((k) => {
              if (k !== "__all" && !kindsPresent.has(k)) return null;
              const meta = k === "__all" ? { label: "Todos", icon: Store } : KIND_META[k];
              const active = kindFilter === k;
              const Icon = meta.icon;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindFilter(k)}
                  aria-pressed={active}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)]",
                    active
                      ? "border-brand-gold bg-brand-gold text-brand-navy"
                      : "border-brand-gold/60 bg-brand-navy/90 text-white hover:bg-brand-navy hover:border-brand-gold",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Métricas ao vivo — botões acessíveis, abrem detalhes */}
          {data && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4">
              <HeroMetric
                icon={Store}
                label="Estabelecimentos"
                value={String(data.totalEstablishments)}
                hint="Ver rede"
                onClick={() => setMetricDetail("establishments")}
              />
              <HeroMetric
                icon={Package}
                label="Produtos"
                value={data.totalProducts.toLocaleString("pt-BR")}
                hint="Ver categorias"
                onClick={() => setMetricDetail("products")}
              />
              <HeroMetric
                icon={PiggyBank}
                label="Maior economia"
                value={data.totalMaxSavings > 0 ? `R$ ${data.totalMaxSavings.toFixed(2).replace(".", ",")}` : "—"}
                hint="Onde economizar"
                onClick={() => setMetricDetail("savings")}
              />
              <HeroMetric
                icon={Radio}
                label="Atualização"
                value="ao vivo"
                live
                hint="Como funciona"
                onClick={() => setMetricDetail("live")}
              />
            </div>
          )}
        </div>
      </section>

      {/* Faixa de mercados em destaque — fora do hero, mais compacta e legível */}
      {featured.length > 0 && (
        <section className="border-b border-border/60 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">Em destaque</span>
                <span className="text-[13px] font-medium text-foreground">Mercados com mais produtos</span>
              </div>
              <div className="hidden gap-1.5 md:flex">
                <button
                  type="button"
                  aria-label="Rolar para a esquerda"
                  onClick={() => scrollCarousel(-1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Rolar para a direita"
                  onClick={() => scrollCarousel(1)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              onPointerDown={onCarouselPointerDown}
              onPointerMove={onCarouselPointerMove}
              onPointerUp={onCarouselPointerUp}
              onPointerCancel={onCarouselPointerUp}
              onPointerLeave={onCarouselPointerUp}
              onWheel={onCarouselWheel}
              onClickCapture={onCarouselLinkClickCapture}
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 cursor-grab select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {featured.map((e) => (
                <Link
                  key={e.id}
                  to="/estabelecimento/$slug"
                  params={{ slug: slugifyEstablishment(e.name) }}
                  className="group relative flex w-[210px] shrink-0 snap-start items-center gap-2.5 rounded-lg border border-border bg-background p-2 transition-colors hover:border-primary/60 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  style={e.brandColor ? { boxShadow: `inset 3px 0 0 ${e.brandColor}` } : undefined}
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
                    {e.logoUrl ? (
                      <img src={e.logoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[12px] font-bold text-brand-navy">{e.name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-foreground">{e.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      <span className="font-semibold text-primary">{e.productsCount}</span> produtos
                      {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 md:px-6 pt-6 md:pt-8">


        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[14px] text-destructive">
            Erro: {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <StatGrid
              stats={[
                { label: "Estabelecimentos", value: data.totalEstablishments, icon: MapPin, tone: "primary" },
                { label: "Produtos monitorados", value: data.totalProducts, icon: Package, tone: "success" },
                { label: "Categorias mapeadas", value: data.totalCategories, icon: Sparkles },
              ]}
              className="lg:grid-cols-3"
            />

            {data.topGlobalCategories.length > 0 && (
              <SectionCard
                title={
                  <span className="inline-flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
                    Categorias mais populares
                  </span>
                }
                description="Distribuição por número de produtos cadastrados na rede."
              >
                <div className="flex flex-wrap gap-2">
                  {data.topGlobalCategories.map((c) => (
                    <span
                      key={c.category}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[13px] font-medium text-primary-foreground shadow-sm ring-1 ring-brand-gold/30"
                    >
                      {humanizeCategory(c.category)}
                      <span className="rounded-full bg-brand-gold px-1.5 py-0.5 text-[13px] font-bold text-brand-navy">
                        {c.count}
                      </span>
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {data.items.length === 0 ? (
              <EmptyState
                icon={Store}
                title="Ainda não há estabelecimentos cadastrados"
                description="Assim que houver mercados na sua região, eles aparecerão aqui."
              />
            ) : (
              <SectionCard
                title="Rede de mercados"
                description={`${visibleItems.length} de ${data.items.length} ${data.items.length === 1 ? "estabelecimento" : "estabelecimentos"} monitorados.`}
                bodyClassName="p-0"
              >
                <div className="flex flex-col gap-3 border-b border-border/60 p-4 md:flex-row md:items-center md:p-5">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(ev) => setQ(ev.target.value)}
                      placeholder="Buscar mercado, bairro ou cidade"
                      className="pl-9"
                      inputMode="search"
                    />
                  </div>
                  <Select value={neighborhood} onValueChange={setNeighborhood}>
                    <SelectTrigger
                      aria-label="Filtrar por bairro"
                      className="h-10 w-full md:w-[200px]"
                    >
                      <SelectValue placeholder="Bairro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Todos os bairros</SelectItem>
                      {neighborhoods.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={sort}
                    onValueChange={(v) => setSort(v as typeof sort)}
                  >
                    <SelectTrigger
                      aria-label="Ordenar por"
                      className="h-10 w-full md:w-[220px]"
                    >
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neighborhood">Ordenar: bairro (A→Z)</SelectItem>
                      <SelectItem value="name">Ordenar: nome (A→Z)</SelectItem>
                      <SelectItem value="products">Ordenar: mais produtos</SelectItem>
                    </SelectContent>
                  </Select>

                </div>

                {visibleItems.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum estabelecimento encontrado com esse filtro.
                  </div>
                ) : (
                <ul
                  className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-5"
                  aria-label="Lista de estabelecimentos"
                >
                  {visibleItems.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
                    >
                      <Link
                        to="/estabelecimento/$slug"
                        params={{ slug: slugifyEstablishment(e.name) }}
                        className="block rounded-xl p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Ver catálogo de ${e.name}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted"
                            style={e.brandColor ? { borderColor: e.brandColor } : undefined}
                          >
                            {e.logoUrl ? (
                              <img
                                src={e.logoUrl}
                                alt={`Logo ${e.name}`}
                                className="h-full w-full object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <span aria-hidden className="text-[16px] font-bold text-muted-foreground">
                                {e.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[15px] font-semibold text-foreground">{e.name}</h3>
                            {e.neighborhood && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary">
                                <MapPin className="h-3 w-3" aria-hidden />
                                {e.neighborhood}
                              </span>
                            )}
                            <p className="mt-1 text-[13px] text-muted-foreground">
                              {[e.city, e.state].filter(Boolean).join(" · ") || "Localização não informada"}
                            </p>
                            <p className="mt-2 text-[13.5px] font-medium text-foreground">
                              <span className="text-primary">{e.productsCount}</span>{" "}
                              <span className="text-muted-foreground">produtos cadastrados</span>
                            </p>
                          </div>
                        </div>
                        {e.topCategories.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                            {e.topCategories.map((c) => (
                              <span
                                key={c.category}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[13px] text-foreground"
                              >
                                {humanizeCategory(c.category)}
                                <span className="text-muted-foreground">({c.count})</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 text-[12px] font-medium text-primary">
                          Ver catálogo completo →
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                )}
              </SectionCard>
            )}

          </div>
        )}
      </main>

      <SiteFooter />
      <MobileNav />
      {/* silence unused import */}
      <LoadingSkeleton className="hidden" rows={0} />
      <MetricDetailDialog
        open={metricDetail !== null}
        which={metricDetail}
        onClose={() => setMetricDetail(null)}
        data={data ?? null}
      />
    </div>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  live,
  hint,
  onClick,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  live?: boolean;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. ${hint ?? "Abrir detalhes"}`}
      className="group relative flex w-full items-center gap-2.5 sm:gap-3 overflow-hidden rounded-lg px-2.5 py-2 sm:px-3.5 sm:py-2.5 text-left ring-1 ring-brand-gold/70 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:ring-brand-gold hover:shadow-[0_12px_28px_-8px_rgba(212,175,55,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy active:translate-y-0 bg-brand-navy"
      style={{
        backgroundImage:
          "linear-gradient(135deg, color-mix(in oklab, var(--brand-navy) 96%, black) 0%, color-mix(in oklab, var(--brand-navy) 78%, black) 100%)",
      }}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brand-gold transition-all group-hover:w-[4px]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />
      {/* halo hover */}
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "radial-gradient(120% 80% at 100% 0%, color-mix(in oklab, var(--brand-gold) 18%, transparent), transparent 60%)" }} />

      <div className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-md bg-brand-gold text-brand-navy shadow-inner ring-1 ring-brand-gold/80">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} aria-hidden />
      </div>
      <div className="relative z-[1] min-w-0 flex-1">
        <div className="truncate text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] text-white/90">
          {label}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13.5px] sm:text-[15px] font-extrabold leading-tight text-white tabular-nums">
          {live && (
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-gold" />
            </span>
          )}
          <span className="truncate">{value}</span>
        </div>
        {hint && (
          <div className="mt-0.5 hidden sm:flex items-center gap-1 text-[10.5px] font-medium text-white/70 group-hover:text-brand-gold transition-colors">
            <span className="truncate">{hint}</span>
            <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </div>
        )}
      </div>
    </button>
  );
}

function MetricDetailDialog({
  open,
  which,
  onClose,
  data,
}: {
  open: boolean;
  which: null | "establishments" | "products" | "savings" | "live";
  onClose: () => void;
  data: EstablishmentsOverview | null;
}) {
  const cfg = which ? METRIC_DETAIL_META[which] : null;
  const Icon = cfg?.icon ?? Store;

  const savingsRanked = useMemo(() => {
    if (!data) return [];
    return [...data.items]
      .filter((i) => i.maxSavings > 0)
      .sort((a, b) => b.maxSavings - a.maxSavings)
      .slice(0, 6);
  }, [data]);

  const topByProducts = useMemo(() => {
    if (!data) return [];
    return [...data.items].sort((a, b) => b.productsCount - a.productsCount).slice(0, 6);
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div
          className="relative px-5 py-4 text-white"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--brand-navy) 96%, black), color-mix(in oklab, var(--brand-navy) 78%, black))",
          }}
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent" />
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brand-gold" />
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-gold text-brand-navy shadow-inner">
                <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </div>
              <DialogTitle className="text-[15px] font-extrabold uppercase tracking-[0.14em] text-brand-gold">
                {cfg?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-[13px] leading-snug text-white/85">
              {cfg?.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {which === "establishments" && data && (
            <ul className="space-y-2" aria-label="Estabelecimentos monitorados">
              {topByProducts.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-md border border-border/60 bg-card p-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
                    {e.logoUrl ? (
                      <img src={e.logoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[11px] font-bold text-brand-navy">{e.name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-foreground">{e.name}</div>
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      <span className="font-semibold text-primary">{e.productsCount}</span> produtos
                      {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                    </div>
                  </div>
                </li>
              ))}
              <li className="pt-1 text-center text-[12px] text-muted-foreground">
                Total: <strong className="text-foreground">{data.totalEstablishments}</strong> estabelecimentos
              </li>
            </ul>
          )}

          {which === "products" && data && (
            <div className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-center">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary">Total monitorado</div>
                <div className="mt-1 text-[24px] font-extrabold tabular-nums text-foreground">
                  {data.totalProducts.toLocaleString("pt-BR")}
                </div>
                <div className="text-[11.5px] text-muted-foreground">produtos em {data.totalCategories} categorias</div>
              </div>
              {data.topGlobalCategories.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Categorias mais populares
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.topGlobalCategories.slice(0, 10).map((c) => (
                      <span
                        key={c.category}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
                      >
                        {humanizeCategory(c.category)}
                        <span className="rounded-full bg-primary/20 px-1.5 text-[11.5px] font-bold">{c.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {which === "savings" && data && (
            <div className="space-y-2.5">
              <div className="rounded-md border border-brand-gold/50 bg-brand-gold/10 p-3">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-navy dark:text-brand-gold">
                  Diferença máxima na rede
                </div>
                <div className="mt-0.5 text-[22px] font-extrabold tabular-nums text-brand-navy dark:text-brand-gold">
                  R$ {data.totalMaxSavings.toFixed(2).replace(".", ",")}
                </div>
                <div className="text-[11.5px] text-muted-foreground">
                  entre o mesmo produto no mercado mais caro vs. o mais barato
                </div>
              </div>
              {savingsRanked.length > 0 ? (
                <ul className="space-y-1.5">
                  {savingsRanked.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card p-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-foreground">{e.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{e.neighborhood || e.city || "—"}</div>
                      </div>
                      <div className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[12.5px] font-bold tabular-nums text-primary">
                        até R$ {e.maxSavings.toFixed(2).replace(".", ",")}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-[12.5px] text-muted-foreground">Sem comparativos disponíveis ainda.</p>
              )}
            </div>
          )}

          {which === "live" && (
            <div className="space-y-3 text-[13px] leading-relaxed text-foreground">
              <p>
                Os preços aqui exibidos são atualizados <strong>continuamente</strong> pela comunidade e por integrações com os mercados parceiros — sem intervalo fixo.
              </p>
              <ul className="space-y-1.5 text-[12.5px]">
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  Novos preços entram no ar em segundos após a leitura.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  Cada card do mercado mostra o carimbo da última atualização.
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                  Você pode ativar alertas para acompanhar variações do seu bairro.
                </li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const METRIC_DETAIL_META: Record<
  "establishments" | "products" | "savings" | "live",
  { title: string; description: string; icon: typeof Store }
> = {
  establishments: {
    title: "Estabelecimentos",
    description: "Mercados monitorados na região — ordenados pelos que têm mais produtos publicados.",
    icon: Store,
  },
  products: {
    title: "Produtos monitorados",
    description: "Total de itens catalogados e as categorias mais presentes na rede.",
    icon: Package,
  },
  savings: {
    title: "Maior economia possível",
    description: "Quanto você pode poupar comprando o mesmo produto no mercado mais barato.",
    icon: PiggyBank,
  },
  live: {
    title: "Atualização ao vivo",
    description: "Como e quando os preços são renovados nesta plataforma.",
    icon: Radio,
  },
};
