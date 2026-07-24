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
  const carouselRef = useRef<HTMLDivElement | null>(null);

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
          className="absolute inset-0 -z-30 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        {/* Véu forte para contraste WCAG AAA em toda a área do texto */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--brand-navy) 92%, transparent) 0%, color-mix(in oklab, var(--brand-navy) 82%, transparent) 55%, color-mix(in oklab, var(--brand-navy) 94%, transparent) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 340px at 12% -10%, color-mix(in oklab, var(--brand-gold) 22%, transparent) 0%, transparent 60%)",
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

        <div className="mx-auto w-full max-w-6xl px-4 md:px-8 pt-6 md:pt-10 pb-6 md:pb-8">
          <nav aria-label="Trilha" className="mb-3 flex items-center gap-1 text-[12px] font-medium text-white/85">
            <Link to="/" className="hover:text-brand-gold">Início</Link>
            <ChevronRight aria-hidden className="h-3 w-3 opacity-70" />
            <span className="text-white">Mercados</span>
          </nav>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-gold/50 bg-brand-gold/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold">
            {currentKind ? <currentKind.icon className="h-3.5 w-3.5" aria-hidden /> : <Store className="h-3.5 w-3.5" aria-hidden />}
            {currentKind ? currentKind.label : "Comércios parceiros"}
          </div>

          <h1 className="text-[26px] md:text-[36px] font-semibold leading-[1.15] text-white" style={{ textShadow: "0 2px 12px rgba(2,10,30,0.6)" }}>
            {currentKind ? currentKind.label : "Comércios"} de <span className="text-brand-gold">Feijó</span>{" "}
            <span className="text-white/90">com preço monitorado</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] md:text-[15px] leading-relaxed text-white/90">
            {currentKind ? currentKind.tagline : "Cobertura de produtos, categorias mais populares e comparativo entre estabelecimentos monitorados pela comunidade."}
          </p>

          {/* Chips de categoria */}
          <div className="mt-4 flex flex-wrap gap-2">
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
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold",
                    active
                      ? "border-brand-gold bg-brand-gold text-brand-navy shadow-[0_0_0_1px_var(--brand-gold)]"
                      : "border-white/25 bg-white/5 text-white/90 hover:bg-white/10",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Métricas ao vivo */}
          {data && (
            <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <HeroMetric icon={Store} label="Estabelecimentos" value={String(data.totalEstablishments)} />
              <HeroMetric icon={Package} label="Produtos monitorados" value={data.totalProducts.toLocaleString("pt-BR")} />
              <HeroMetric
                icon={PiggyBank}
                label="Maior economia encontrada"
                value={data.totalMaxSavings > 0 ? `R$ ${data.totalMaxSavings.toFixed(2).replace(".", ",")}` : "—"}
              />
              <HeroMetric icon={Radio} label="Atualização" value="ao vivo" live />
            </div>
          )}

          {/* Carrossel de mercados em destaque */}
          {featured.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold">Em destaque</div>
                  <div className="text-[14px] font-medium text-white/90">Mercados com mais produtos cadastrados</div>
                </div>
                <div className="hidden gap-1.5 md:flex">
                  <button
                    type="button"
                    aria-label="Rolar para a esquerda"
                    onClick={() => scrollCarousel(-1)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Rolar para a direita"
                    onClick={() => scrollCarousel(1)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div
                ref={carouselRef}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {featured.map((e) => (
                  <Link
                    key={e.id}
                    to="/estabelecimento/$slug"
                    params={{ slug: slugifyEstablishment(e.name) }}
                    className="group relative flex w-[220px] shrink-0 snap-start flex-col gap-2 rounded-xl border border-white/15 bg-white/[0.06] p-3 backdrop-blur-sm transition-colors hover:border-brand-gold/60 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    style={e.brandColor ? { boxShadow: `inset 3px 0 0 ${e.brandColor}` } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                        {e.logoUrl ? (
                          <img src={e.logoUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-[13px] font-bold text-brand-navy">{e.name.substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-white">{e.name}</div>
                        <div className="truncate text-[11.5px] text-white/70">{e.neighborhood ?? e.city ?? "Feijó"}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-white/70">
                        <span className="font-semibold text-brand-gold">{e.productsCount}</span> produtos
                      </span>
                      <span className="text-white/60 transition-colors group-hover:text-brand-gold">Ver →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

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
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-medium text-primary"
                    >
                      {humanizeCategory(c.category)}
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[13px] font-bold">
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
    </div>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  live,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 backdrop-blur-sm">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-gold/15 text-brand-gold">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/70">{label}</div>
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white">
          {live && <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold" />}
          {value}
        </div>
      </div>
    </div>
  );
}
