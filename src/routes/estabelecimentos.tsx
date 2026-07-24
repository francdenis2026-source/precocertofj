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
  }, [data, q, neighborhood, sort]);


  return (
    <div className="min-h-dvh bg-background pb-24 md:pb-8">
      <SiteHeader variant="solid" />

      {/* Hero editorial — foto de feira/mercado com véu navy para legibilidade */}
      <section className="relative isolate overflow-hidden border-b border-white/10 pc-hero-buscar">
        <div
          aria-hidden
          className="absolute inset-0 -z-40"
          style={{ background: "var(--brand-navy)" }}
        />
        <picture aria-hidden className="pc-hero-picture absolute inset-0 -z-30 h-full w-full">
          {Object.entries(mercadosHero.sources).map(([type, srcset]) => (
            <source key={type} type={type} srcSet={srcset as string} sizes="100vw" />
          ))}
          <img
            src={mercadosHero.img.src}
            alt=""
            className="h-full w-full object-cover opacity-0 transition-opacity duration-500 [.pc-hero-picture.is-loaded_&]:opacity-100"
            width={mercadosHero.img.w}
            height={mercadosHero.img.h}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onLoad={(ev) => ev.currentTarget.closest(".pc-hero-picture")?.classList.add("is-loaded")}
            ref={(el) => {
              if (el?.complete) el.closest(".pc-hero-picture")?.classList.add("is-loaded");
            }}
          />
        </picture>
        <div aria-hidden className="pc-hero-veil absolute inset-0 -z-20" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-20 h-1/2"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--brand-navy) 55%, transparent) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(700px 260px at 8% -10%, color-mix(in oklab, var(--brand-gold) 14%, transparent) 0%, transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--brand-gold) 60%, transparent) 20%, color-mix(in oklab, var(--brand-gold) 80%, transparent) 50%, color-mix(in oklab, var(--brand-gold) 60%, transparent) 80%, transparent 100%)",
          }}
        />

        <div className="mx-auto w-full max-w-6xl px-4 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8">
          <nav aria-label="Trilha" className="mb-3 flex items-center gap-1 text-[11px] font-medium text-white/70">
            <Link to="/" className="hover:text-brand-gold">Início</Link>
            <ChevronRight aria-hidden className="h-3 w-3 opacity-60" />
            <span className="text-white">Mercados</span>
          </nav>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
            Mercados parceiros
          </div>
          <h1 className="text-[24px] md:text-[32px] font-semibold leading-tight text-white">
            Mercados de <span className="text-brand-gold">Feijó</span> cadastrados
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] md:text-[13.5px] text-white/75">
            Cobertura de produtos, categorias mais comuns e comparativo entre estabelecimentos monitorados pela comunidade.
          </p>
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
