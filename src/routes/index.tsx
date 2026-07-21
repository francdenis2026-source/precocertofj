import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MobileNav } from "@/components/nav/MobileNav";
import { BackToDashboardFab } from "@/components/nav/BackToDashboardFab";
import { SwipeRow } from "@/components/SwipeRow";
import { HomeShowcaseSection } from "@/components/home/HomeShowcase";
import { CollaborativeCTA } from "@/components/collab/CollaborativeCTA";
import { SocialProofStrip } from "@/components/collab/SocialProofStrip";
import { RecentProductsCarousel } from "@/components/home/RecentProductsCarousel";
import { ProductQuickModal } from "@/components/home/ProductQuickModal";
import { CategoryIcon } from "@/components/home/CategoryIcon";
import { ProductQuickActions } from "@/components/product/ProductQuickActions";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { MatchReasonBadges } from "@/components/search/MatchReasonBadges";
import { tokenizeQuery } from "@/lib/search-tokens";
import {
  SearchHero,
  Badge as DSBadge,
  MarketCard,
  ComparisonCard,
  type ComparisonRow,
  formatBRL,
} from "@/components/ds";
// LCP hero: responsive AVIF/WebP variants generated at build time by vite-imagetools.
// `as=picture` returns { sources: { avif, webp }, img: { src, w, h } } with srcset strings.
import heroPicture from "@/assets/home-hero.jpg?w=640;960;1280;1600;1920&format=avif;webp;jpg&as=picture";


import { supabase } from "@/integrations/supabase/client";
import {
  searchProductPrice,
  type PriceSearchResult,
} from "@/lib/price-search.functions";
import { getPublicProduct, type PublicProduct } from "@/lib/public-product.functions";
import { addToCart } from "@/lib/cart.functions";
import { readPendingCartItem, clearPendingCartItem } from "@/lib/pending-cart";
import {
  listPublicStores,
  getPlatformStats,
  getCheapestStoresRanking,
  type PublicStore,
} from "@/lib/stores-public.functions";
import { StoreDetailsDrawer } from "@/components/stores/StoreDetailsDrawer";

import { toast } from "sonner";
import {
  Search,
  ArrowUpRight,
  Store as StoreIcon,
  X,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Sparkles,
  MapPin,
  User,
  Trophy,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PreçoCerto — Consulte o preço antes de comprar" },
      {
        name: "description",
        content:
          "Busca em tempo real de preços por nome do produto em mercados perto de você. Escaneie códigos e economize a cada compra.",
      },
      { property: "og:title", content: "PreçoCerto — Consulte o preço antes de comprar" },
      {
        property: "og:description",
        content: "Busca em tempo real de preços por nome do produto em mercados perto de você. Escaneie códigos e economize a cada compra.",
      },
    ],
    links: [
      // Preload LCP hero (AVIF preferred, with WebP as srcset fallback the browser
      // can pick via imagesrcset). Browsers that don't support AVIF ignore this hint
      // and fetch the <picture>'s WebP/JPEG source instead.
      {
        rel: "preload",
        as: "image",
        href: heroPicture.img.src,
        imagesrcset: heroPicture.sources.avif,
        imagesizes: "(min-width: 768px) 1152px, 100vw",
        type: "image/avif",
        fetchpriority: "high",
      },
    ],
  }),
  component: HomePage,
});

/* ================================================================== */
/* HOME PAGE — delivery-app layout                                     */
/* ================================================================== */

function HomePage() {
  const [authed, setAuthed] = useState(false);
  const qc = useQueryClient();
  const addCartFn = useServerFn(addToCart);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setAuthed(!!s?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) return;
    const pending = readPendingCartItem();
    if (!pending) return;
    clearPendingCartItem();
    addCartFn({
      data: {
        catalogId: pending.catalogId,
        slug: pending.slug,
        quantity: pending.quantity ?? 1,
      },
    })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["cart"] });
        toast.success(
          pending.label
            ? `${pending.label} adicionado à cesta`
            : "Produto adicionado à cesta",
        );
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Falha ao adicionar";
        toast.error(msg);
      });
  }, [authed, addCartFn, qc]);

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground md:pb-6">
      <TopBar authed={authed} />
      <HeroSearch authed={authed} />
      <LiveStatsBar />
      <CategoriesCarousel />

      <div className="mx-auto max-w-md space-y-3 px-4 pt-2.5 md:max-w-6xl md:space-y-4 md:px-8 md:pt-3">
        <RecentProductsCarousel />
        <HomeShowcaseSection />
        <CollaborativeCTA />
        <SocialProofStrip />
        <MarketsHub />
        <TrialCTA authed={authed} />
        <FooterLine />
      </div>

      <MobileNav />
      <BackToDashboardFab />
    </div>
  );
}


/* ================================================================== */
/* TOP BAR — location + account                                        */
/* ================================================================== */

function TopBar({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-11 max-w-md items-center justify-between gap-3 px-4 md:h-12 md:max-w-6xl md:px-8">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left"
          aria-label="Alterar localização"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
            <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Entregando em
            </p>
            <p className="flex items-center gap-1 truncate text-[12.5px] font-bold text-foreground">
              Feijó · AC
              <ChevronRight className="h-3 w-3 rotate-90 text-muted-foreground" />
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle size="sm" />
          {authed ? (
            <Link
              to="/perfil"
              aria-label="Minha conta"
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:border-accent/50 hover:text-accent"
            >
              <User className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          ) : (
            <Link
              to="/login"
              aria-label="Entrar na conta"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <User className="h-3.5 w-3.5" strokeWidth={2.4} />
              Entrar
            </Link>
          )}
        </div>
      </div>

    </header>
  );
}

/* ================================================================== */
/* HERO SEARCH — modern aurora, editorial headline, floating stat pills */
/* ================================================================== */

function HeroSearch({ authed }: { authed: boolean }) {
  const fetchStats = useServerFn(getPlatformStats);
  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0", "")}k` : String(n);

  const pills = [
    { label: "produtos", value: stats ? fmt(stats.products) : "—" },
    { label: "mercados", value: stats ? String(stats.establishments) : "—" },
    { label: "quedas · 7d", value: stats ? fmt(stats.priceDrops7d) : "—" },
  ];

  return (
    <section aria-label="Destaque principal" className="mx-auto w-full max-w-md px-4 pt-4 md:max-w-6xl md:px-8 md:pt-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface shadow-elegant">
        {/* Background editorial image */}
        <div className="absolute inset-0">
          <picture>
            <source type="image/avif" srcSet={heroPicture.sources.avif} sizes="(min-width: 768px) 1152px, 100vw" />
            <source type="image/webp" srcSet={heroPicture.sources.webp} sizes="(min-width: 768px) 1152px, 100vw" />
            <img
              src={heroPicture.img.src}
              srcSet={heroPicture.sources.jpg}
              sizes="(min-width: 768px) 1152px, 100vw"
              alt=""
              aria-hidden="true"
              width={heroPicture.img.w}
              height={heroPicture.img.h}
              fetchPriority="high"
              decoding="async"
              loading="eager"
              className="h-full w-full object-cover"
            />
          </picture>
          {/* Scrims — stronger where text sits to guarantee WCAG AA over any photo region */}
          <div
            className="absolute inset-0 md:hidden"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklch, var(--background) 88%, transparent) 0%, color-mix(in oklch, var(--background) 70%, transparent) 55%, color-mix(in oklch, var(--background) 30%, transparent) 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(90deg, color-mix(in oklch, var(--background) 96%, transparent) 0%, color-mix(in oklch, var(--background) 90%, transparent) 45%, color-mix(in oklch, var(--background) 55%, transparent) 68%, transparent 88%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative grid gap-4 px-5 py-5 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-8 md:px-10 md:py-8">
          <div className="space-y-5">
            <DSBadge variant="primary" size="sm">
              <span className="live-dot mr-1.5" aria-hidden />
              Preços ao vivo · Feijó · AC
            </DSBadge>

            <h1 className="font-display text-[34px] font-extrabold leading-[0.98] tracking-[-0.02em] text-foreground sm:text-[42px] md:text-[50px] lg:text-[58px]">
              O <span className="text-signal-gradient">menor preço</span>,
              <br className="hidden sm:inline" /> na hora certa.
            </h1>

            <p className="max-w-lg text-[15px] font-medium leading-[1.55] tracking-[-0.005em] text-foreground md:text-[17px] md:leading-[1.5] lg:text-[18px]">
              Compare mercados da sua cidade em tempo real, receba alertas de queda
              e monte a cesta ideal para o seu orçamento.
            </p>


            <div className="pt-1">
              <LiveSearch authed={authed} />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 md:gap-3">
              {pills.map((p) => (
                <div
                  key={p.label}
                  className="group/pill relative overflow-hidden rounded-xl border border-white/30 bg-background/45 px-3 py-2 text-left shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl backdrop-saturate-150 transition duration-500 hover:-translate-y-0.5 hover:border-white/50 hover:bg-background/55 md:px-4 md:py-2.5 dark:border-white/10 dark:bg-background/35"
                >
                  {/* highlight sheen */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/25"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-4 -top-8 h-16 rotate-6 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-700 group-hover/pill:opacity-100"
                  />
                  <p className="relative font-mono text-lg font-bold leading-none tabular-nums text-foreground sm:text-xl md:text-[22px]">
                    {p.value}
                  </p>
                  <p className="relative mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground md:text-[11px]">
                    {p.label}
                  </p>
                </div>
              ))}
            </div>

          </div>

          {/* Right visual accent — floating card on desktop only */}
          <div className="hidden md:block">
            <div className="relative ml-auto max-w-sm">
              <div className="group/glass relative overflow-hidden rounded-2xl border border-white/40 bg-background/40 p-5 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.4)] backdrop-blur-2xl backdrop-saturate-150 transition duration-500 hover:-translate-y-1 hover:border-white/60 dark:border-white/10 dark:bg-background/30">
                {/* top edge highlight */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/30"
                />
                {/* corner glow */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/25 blur-3xl"
                />
                {/* sheen sweep on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-8 -top-12 h-24 rotate-6 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-700 group-hover/glass:opacity-100"
                />
                <p className="relative text-[10.5px] font-bold uppercase tracking-[0.18em] text-accent-strong">
                  Destaque da semana
                </p>
                <p className="relative mt-2 font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.015em] text-foreground">
                  Cesta básica <span className="text-signal-gradient">–12,4%</span>
                </p>
                <p className="relative mt-2 text-[13.5px] leading-[1.55] text-foreground/85">
                  Consumidores de Feijó economizaram em média R$ 47 comparando 3 mercados antes de comprar.
                </p>
                <Link
                  to="/cesta-basica"
                  className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-background shadow-sm transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Montar minha cesta
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </Link>


              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}



/* ================================================================== */
/* CATEGORIES CAROUSEL — gradient orb tiles, one hue per category      */
/* ================================================================== */

type CategoryMeta = {
  slug: string;
  label: string;
  hue: string; // OKLCH color for the gradient orb
};

const CATEGORY_META: CategoryMeta[] = [
  { slug: "hortifruti", label: "Hortifruti", hue: "oklch(0.72 0.18 145)" },
  { slug: "carnes", label: "Carnes", hue: "oklch(0.62 0.20 25)" },
  { slug: "mercearia", label: "Mercearia", hue: "oklch(0.72 0.15 65)" },
  { slug: "laticinios", label: "Laticínios", hue: "oklch(0.85 0.08 90)" },
  { slug: "padaria", label: "Padaria", hue: "oklch(0.75 0.14 55)" },
  { slug: "bebidas", label: "Bebidas", hue: "oklch(0.65 0.18 235)" },
  { slug: "bebidas_em_po", label: "Bebidas em pó", hue: "oklch(0.60 0.16 30)" },
  { slug: "biscoitos", label: "Biscoitos", hue: "oklch(0.70 0.14 70)" },
  { slug: "doces", label: "Doces", hue: "oklch(0.72 0.20 350)" },
  { slug: "congelados", label: "Congelados", hue: "oklch(0.75 0.14 220)" },
  { slug: "higiene", label: "Higiene", hue: "oklch(0.72 0.13 195)" },
  { slug: "limpeza", label: "Limpeza", hue: "oklch(0.70 0.16 165)" },
];

function useCategoryCounts() {
  return useQuery({
    queryKey: ["category-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_catalog")
        .select("category")
        .not("category", "is", null);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ category: string | null }>) {
        if (!row.category) continue;
        counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
      }
      return counts;
    },
    staleTime: 5 * 60_000,
  });
}

function CategoriesCarousel() {
  const { data, isLoading } = useCategoryCounts();
  const counts = data ?? new Map<string, number>();
  const cats = CATEGORY_META.filter((c) => (counts.get(c.slug) ?? 0) > 0);
  const list = cats.length > 0 ? cats : CATEGORY_META.slice(0, 8);

  return (
    <section
      aria-label="Categorias"
      className="mx-auto max-w-md px-4 pt-3 md:max-w-6xl md:px-8 md:pt-4"
    >
      <header className="mb-4 flex items-end justify-between gap-4 md:mb-6">
        <div className="min-w-0">
          <p className="section-eyebrow text-[10px] md:text-[11px]">Explore</p>
          <h2
            className="section-title mt-1 text-[22px] md:text-[30px]"
            dangerouslySetInnerHTML={{ __html: 'Por <em>categorias</em>' }}
          />
        </div>
        <Link
          to="/melhores-precos"
          className="group inline-flex shrink-0 items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-accent-strong hover:text-accent-strong/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          Ver todas
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
        </Link>
      </header>

      {/* Desktop: bigger icon grid, centered */}
      <ul
        className="hidden md:grid md:grid-cols-6 md:gap-x-3 md:gap-y-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 justify-items-center"
      >
        {isLoading && cats.length === 0
          ? Array.from({ length: 12 }).map((_, i) => (
              <li key={i} className="flex w-full flex-col items-center gap-2.5">
                <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted/50" />
                <div className="h-2.5 w-14 animate-pulse rounded-full bg-muted/50" />
              </li>
            ))
          : list.map((c) => {
              const count = counts.get(c.slug) ?? 0;
              return (
                <li key={c.slug} className="flex w-full justify-center">
                  <Link
                    to="/melhores-precos"
                    search={{ cat: c.slug }}
                    className="group flex w-[104px] flex-col items-center gap-2 rounded-2xl p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    style={{ ["--cat-hue" as string]: c.hue }}
                    aria-label={`${c.label}${count ? ` — ${count} ${count === 1 ? "item" : "itens"}` : ""}`}
                  >
                    <CategoryIcon slug={c.slug} size="lg" />
                    <span className="w-full text-center text-[12px] font-semibold leading-tight text-foreground/85 group-hover:text-foreground break-words hyphens-auto">
                      {c.label}
                    </span>
                    {count > 0 ? (
                      <span className="text-[9.5px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {count > 999 ? "999+" : count} {count === 1 ? "item" : "itens"}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
      </ul>

      {/* Mobile: bigger icon swipe row */}
      <div className="md:hidden -mx-4">
        <SwipeRow ariaLabel="Categorias em destaque" className="px-4">
          {isLoading && cats.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex w-[84px] shrink-0 snap-start flex-col items-center gap-2">
                  <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted/50" />
                  <div className="h-2 w-12 animate-pulse rounded-full bg-muted/50" />
                </div>
              ))
            : list.map((c) => {
                const count = counts.get(c.slug) ?? 0;
                return (
                  <Link
                    key={c.slug}
                    to="/melhores-precos"
                    search={{ cat: c.slug }}
                    className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ ["--cat-hue" as string]: c.hue }}
                    aria-label={`${c.label}${count ? ` — ${count} ${count === 1 ? "item" : "itens"}` : ""}`}
                  >
                    <CategoryIcon slug={c.slug} size="lg" />
                    <span className="w-full text-center text-[11.5px] font-semibold leading-tight text-foreground/85 break-words hyphens-auto">
                      {c.label}
                    </span>
                    {count > 0 ? (
                      <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {count > 999 ? "999+" : count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
        </SwipeRow>
      </div>


    </section>
  );
}



/* ================================================================== */
/* LIVE STATS BAR — unified glass bento with hairline dividers         */
/* ================================================================== */

function LiveStatsBar() {
  const fetchStats = useServerFn(getPlatformStats);
  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });
  const fmt = (n: number) =>
    n >= 1000
      ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0", "")}k`
      : String(n);
  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  type KPI = {
    label: string;
    value: string;
    hint: string;
    tone: "primary" | "accent" | "savings";
  };

  const items: KPI[] = [
    {
      label: "Itens cadastrados",
      value: stats ? fmt(stats.products) : "—",
      hint: "produtos únicos monitorados",
      tone: "primary",
    },
    {
      label: "Economia média",
      value: stats && stats.estimatedSavings > 0 ? fmtBRL(stats.estimatedSavings) : "—",
      hint: "nas comparações ativas",
      tone: "accent",
    },
    {
      label: "Mercados",
      value: stats ? fmt(stats.establishments) : "—",
      hint: "atualizados em tempo real",
      tone: "primary",
    },
    {
      label: "Quedas · 7d",
      value: stats ? fmt(stats.priceDrops7d) : "—",
      hint: "oportunidades detectadas",
      tone: "savings",
    },
  ];

  const toneClass: Record<KPI["tone"], string> = {
    primary: "text-foreground",
    accent: "text-accent-strong",
    savings: "text-savings",
  };

  return (
    <section
      aria-label="Cobertura ao vivo"
      className="mx-auto max-w-md px-4 pt-2.5 md:max-w-6xl md:px-8 md:pt-3"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-card/70 backdrop-blur md:grid-cols-4"
      >
        {items.map((it, i) => (
          <div
            key={it.label}
            className="relative bg-card/40 px-2.5 py-2 md:px-3.5 md:py-2.5"
            style={{
              boxShadow:
                i > 0
                  ? "inset 1px 0 0 color-mix(in oklab, var(--color-foreground) 8%, transparent)"
                  : undefined,
            }}
          >
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {it.label}
            </p>
            <p
              className={cn(
                "num mt-0.5 text-[15px] font-bold leading-none md:text-[19px]",
                toneClass[it.tone],
              )}
            >
              {it.value}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[9px] font-medium text-muted-foreground">
              {it.hint}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}



/* ================================================================== */
/* MARKETS HUB — unified stores section with tabs                      */
/* ================================================================== */

function MarketsHub() {
  const [tab, setTab] = useState<"perto" | "campeoes">("perto");
  const [showAllStores, setShowAllStores] = useState(false);


  const { data: stores, isLoading: loadingStores } = useQuery({
    queryKey: ["public-stores"],
    queryFn: () => listPublicStores(),
    staleTime: 60_000,
  });
  const fetchRanking = useServerFn(getCheapestStoresRanking);
  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey: ["cheapest-stores-7d"],
    queryFn: () => fetchRanking(),
    staleTime: 5 * 60_000,
  });

  const [selected, setSelected] = useState<PublicStore | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openStore = (s: PublicStore) => {
    setSelected(s);
    setDrawerOpen(true);
  };

  const openFromRanking = (
    establishmentId: string,
    storeName: string,
    city: string,
    state: string,
  ) => {
    const match = (stores ?? []).find((s) => s.id === establishmentId);
    const store: PublicStore = match ?? {
      id: establishmentId,
      name: storeName,
      city,
      state,
      neighborhood: null,
      address: null,
      logoUrl: null,
      productCount: 0,
      lastUpdate: null,
    };
    openStore(store);
  };

  const rankingRows = ranking?.rows ?? [];
  const rankRows = rankingRows.slice(0, 5);
  const winsByStore = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rankingRows) m.set(r.establishmentId, r.wins);
    return m;
  }, [rankingRows]);
  const topStoreId = rankingRows[0]?.establishmentId ?? null;

  return (
    <section aria-label="Mercados">
      <header className="mb-2 flex items-end justify-between gap-4 md:mb-2.5">
        <div className="min-w-0">
          <p className="section-eyebrow text-[9px]">Onde comprar</p>
          <h2
            className="section-title mt-0.5 text-[15px] md:text-[19px]"
            dangerouslySetInnerHTML={{ __html: 'Os <em>mercados</em>' }}
          />
        </div>
        <Link
          to="/melhores-precos"
          className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent-strong hover:underline"
        >
          Ver todos
        </Link>
      </header>


      <div
        role="tablist"
        aria-label="Filtrar mercados"
        className="mb-2.5 inline-flex rounded-full border border-border bg-surface p-0.5 text-[11.5px] font-bold"
      >
        {[
          { id: "perto" as const, label: "Perto de você" },
          { id: "campeoes" as const, label: "Campeões 7d" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-7 rounded-full px-3 transition",
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>


      {tab === "perto" && (
        <>
          {loadingStores && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-muted/40"
                />
              ))}
            </div>
          )}
          {!loadingStores && (stores ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-[13px] text-muted-foreground">
              Nenhuma loja cadastrada ainda.
            </div>
          )}
          {!loadingStores && (stores ?? []).length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {(stores ?? [])
                  .slice(0, showAllStores ? undefined : 12)
                  .map((s) => {
                    const wins = winsByStore.get(s.id) ?? 0;
                    const isTop = topStoreId === s.id;
                    return (
                      <MarketCard
                        key={s.id}
                        variant="tile"
                        name={s.name}
                        logoUrl={s.logoUrl}
                        neighborhood={s.neighborhood ?? s.city ?? null}
                        productCount={s.productCount}
                        onClick={() => openStore(s)}
                        badge={
                          isTop ? (
                            <DSBadge variant="savings" size="sm">
                              <Trophy className="mr-0.5 h-3 w-3" aria-hidden />
                              Top {wins > 0 ? `· ${wins}` : ""}
                            </DSBadge>
                          ) : wins > 0 ? (
                            <DSBadge variant="savingsSoft" size="sm">
                              {wins}
                            </DSBadge>
                          ) : null
                        }
                      />
                    );
                  })}
              </div>
              {(stores ?? []).length > 12 && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllStores((v) => !v)}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    {showAllStores ? "Ver menos" : `Ver mais (${(stores ?? []).length - 12})`}
                  </button>
                </div>
              )}
            </>
          )}

        </>
      )}


      {tab === "campeoes" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {loadingRanking && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              Calculando ranking…
            </p>
          )}
          {!loadingRanking && rankRows.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              Sem comparações suficientes ainda.
            </p>
          )}
          {!loadingRanking && rankRows.length > 0 && (
            <ol>
              {rankRows.map((r, idx) => (
                <li key={r.establishmentId} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() =>
                      openFromRanking(r.establishmentId, r.storeName, r.city, r.state)
                    }
                    className="hairline-gold relative flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary/5"
                    aria-label={`Ver detalhes de ${r.storeName}`}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[12px] font-black",
                        idx === 0 && "bg-accent text-accent-foreground",
                        idx === 1 && "bg-savings text-savings-foreground",
                        idx === 2 && "bg-primary/15 text-primary",
                        idx > 2 && "bg-muted text-foreground",
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[13.5px] font-bold text-foreground">
                        {r.storeName}
                      </p>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {r.city} · {r.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num font-display text-[14px] font-black text-savings">
                        {r.wins}
                      </p>
                      <p className="text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {r.wins === 1 ? "vitória" : "vitórias"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <StoreDetailsDrawer
        store={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </section>
  );
}



/* ================================================================== */
/* TRIAL CTA                                                           */
/* ================================================================== */

function TrialCTA({ authed }: { authed: boolean }) {
  if (authed) return null;
  return (
    <section aria-label="Ver planos">
      <div className="relative isolate overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:px-5 md:py-4">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-accent/20 blur-[80px]"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-accent-strong/40 bg-accent-strong/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-accent-strong">
              <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
              Planos flexíveis
            </span>
            <h3 className="font-display mt-1.5 text-[15px] font-bold leading-tight text-sidebar-foreground md:text-[17px]">
              Escolha o plano ideal e economize
            </h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-sidebar-foreground/90">
              Teste grátis, mensal, semestral ou anual — cancele quando quiser.
            </p>
          </div>
          <Link
            to="/planos"
            className="group inline-flex h-9 items-center justify-center gap-1.5 shrink-0 rounded-full bg-sidebar-primary px-4 text-[12.5px] font-semibold text-sidebar-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            Ver planos
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </section>
  );
}





function FooterLine() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-4 text-[10.5px] text-muted-foreground">
      <p>Feito em Feijó · AC · para quem gosta de pagar o preço certo</p>
      <span aria-hidden className="text-muted-foreground">·</span>
      <p className="font-mono tracking-wide">
        <span className="text-muted-foreground">dev</span>{" "}
        <span className="text-foreground/90">&lt;FrancD&apos;nis&gt;</span>
      </p>
    </div>
  );
}



function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Damerau-Levenshtein (limitado) para tolerar typos curtos. */
function editDistance(a: string, b: string, cap = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (
        i > 1 && j > 1 &&
        a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]
      ) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
      if (dp[i][j] < rowMin) rowMin = dp[i][j];
    }
    if (rowMin > cap) return cap + 1;
  }
  return dp[a.length][b.length];
}

/** Score: menor é melhor. Combina prefixo, substring e edição por token. */
function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 999;
  if (t === q) return -100;
  if (t.startsWith(q)) return -50 + (t.length - q.length) * 0.1;
  const idx = t.indexOf(q);
  if (idx >= 0) return -20 + idx * 0.5;
  // por token
  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);
  let total = 0;
  let matched = 0;
  for (const qt of qTokens) {
    let best = Infinity;
    for (const tt of tTokens) {
      if (tt.startsWith(qt)) { best = Math.min(best, 0); continue; }
      if (tt.includes(qt)) { best = Math.min(best, 1); continue; }
      const d = editDistance(qt, tt, Math.max(1, Math.floor(qt.length / 3)));
      if (d <= Math.max(1, Math.floor(qt.length / 3))) {
        best = Math.min(best, d + 1);
      }
    }
    if (best === Infinity) return 999; // token não achou nada aceitável
    total += best;
    matched++;
  }
  if (matched === 0) return 999;
  return 5 + total / matched;
}

function LiveSearch({ authed }: { authed: boolean }) {
  const runSearch = useServerFn(searchProductPrice);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<PriceSearchResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const listboxId = "live-search-listbox";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2 || !authed) {
      setResult(null);
      setErr(null);
      setActiveIndex(-1);
      return;
    }
    const mine = ++seqRef.current;
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        runSearch({ data: { query: q, pureOnly: true } })
          .then((r) => {
            if (mine === seqRef.current) {
              setResult(r);
              setErr(null);
              setActiveIndex(-1);
            }
          })
          .catch((e: unknown) => {
            if (mine === seqRef.current) {
              setErr(e instanceof Error ? e.message : String(e));
              setResult(null);
            }
          });
      });
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, authed]);

  const q = query.trim();

  // Ranking fuzzy sobre as sugestões
  const rankedSuggestions = useMemo(() => {
    if (!result || result.suggestions.length === 0 || q.length < 2) return [];
    return result.suggestions
      .map((s) => {
        const scoreName = fuzzyScore(q, s.displayName);
        const scoreBrand = s.brand ? fuzzyScore(q, s.brand) : 999;
        return { s, score: Math.min(scoreName, scoreBrand) };
      })
      .filter((x) => x.score < 900)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((x) => x.s);
  }, [result, q]);

  const showDropdown = authed && open && q.length >= 2 && rankedSuggestions.length > 0;

  const goToSuggestion = (id: string) => {
    setOpen(false);
    navigate({ to: "/produto-publico/$slug", params: { slug: id } });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" && rankedSuggestions.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % rankedSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? rankedSuggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < rankedSuggestions.length) {
        e.preventDefault();
        goToSuggestion(rankedSuggestions[activeIndex].id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Home") {
      setActiveIndex(0);
    } else if (e.key === "End") {
      setActiveIndex(rankedSuggestions.length - 1);
    }
  };

  return (
    <div>
      <div className="search-glow">
        <div className="relative flex items-center rounded-xl border border-border/60 bg-card p-1.5 shadow-[0_10px_40px_-20px_oklch(0.72_0.13_210_/_0.4)]">
          <Search
            className="pointer-events-none ml-3 h-5 w-5 shrink-0 text-primary"
            strokeWidth={2}
          />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.slice(0, 80));
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="Cole o link ou digite o nome do produto..."
            maxLength={80}
            aria-label="Nome do produto"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              showDropdown && activeIndex >= 0
                ? `${listboxId}-opt-${activeIndex}`
                : undefined
            }
            className="h-9 w-full min-w-0 flex-1 rounded-lg border-0 bg-transparent px-3 text-left text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none md:h-10 md:text-[15px]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar"
              className="mr-1 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>

          ) : null}
          <Link
            to="/login"
            aria-label="Comparar agora"
            className="btn-signal inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-[13px] md:h-10 md:px-5"
          >
            <Search className="h-3.5 w-3.5 md:hidden" strokeWidth={2.4} />
            <span className="hidden md:inline">Comparar agora</span>
            <span className="md:hidden">Buscar</span>

          </Link>
        </div>
      </div>


      {err && (
        <p className="mt-3 rounded-xl bg-destructive/90 px-3 py-2 text-xs font-medium text-white">
          {err}
        </p>
      )}

      {showDropdown && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <p className="border-b border-border/60 bg-muted/30 px-3.5 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sugestões · use ↑ ↓ Enter · Esc para fechar
          </p>
          <ul id={listboxId} role="listbox">
            {rankedSuggestions.map((s, idx) => {
              const isActive = idx === activeIndex;
              return (
                <li
                  key={s.id}
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goToSuggestion(s.id)}
                    className={
                      "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] transition " +
                      (isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted/50")
                    }
                  >
                    <Search
                      className={
                        "h-3.5 w-3.5 " +
                        (isActive ? "text-primary" : "text-muted-foreground")
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{s.displayName}</span>
                    {s.brand && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {s.brand}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!authed && q.length >= 2 ? (
        <VisitorSearchLock query={q} />
      ) : (
        <LiveResult
          query={q}
          pending={pending}
          result={result}
          onBack={() => {
            setQuery("");
            setResult(null);
          }}
        />
      )}
    </div>
  );
}

function VisitorSearchLock({ query }: { query: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-savings/10 p-5 shadow-[0_20px_50px_-30px_oklch(0.55_0.15_210_/_0.45)]">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-primary/15 text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Preços protegidos
          </p>
          <h3 className="mt-0.5 font-display text-[15px] font-bold text-foreground md:text-base">
            Crie sua conta para ver os preços de{" "}
            <span className="text-primary">"{query}"</span>
          </h3>
          <p className="mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
            Comparamos mercados em tempo real. É rápido, gratuito e sem cartão —
            só CPF, nome e um PIN de 6 dígitos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/cadastro"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-[12.5px] font-semibold text-foreground hover:bg-muted"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



function LiveResult({
  query,
  pending,
  result,
  onBack,
}: {
  query: string;
  pending: boolean;
  result: PriceSearchResult | null;
  onBack?: () => void;
}) {
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [modalName, setModalName] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const highlightTokens = useMemo(() => tokenizeQuery(query), [query]);


  const openModal = (slug: string, name?: string) => {
    setModalSlug(slug);
    setModalName(name);
    setModalOpen(true);
  };

  const fmt = (n: number | null | undefined) =>
    typeof n === "number"
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  if (query.length < 2) return null;

  if (pending && !result) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-[13px] text-foreground">
        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        Procurando "<span className="text-foreground">{query}</span>"…
      </div>
    );
  }

  if (!result) return null;

  if (result.samples === 0 && result.suggestions.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
        <p className="text-[13px] font-medium text-foreground">
          Ninguém consultou "{query}" ainda.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Nosso catálogo está crescendo — volte em breve.
        </p>
      </div>
    );
  }

  const markets = result.markets.slice(0, 6);

  // Fonte 1: sugestões do catálogo (produtos oficiais)
  const suggestions = result.suggestions;
  // Fonte 2: grupos de scans (não duplicar sugestões pelo nome)
  const suggestionNames = new Set(
    suggestions.map((s) => s.displayName.trim().toLowerCase()),
  );
  const extraGroups = result.groups.filter(
    (g) => !suggestionNames.has(g.productName.trim().toLowerCase()),
  );

  // Index de grupos por catalogId e por nome (para preço/mercado por sugestão)
  const groupByCatalogId = new Map<string, (typeof result.groups)[number]>();
  const groupByName = new Map<string, (typeof result.groups)[number]>();
  for (const g of result.groups) {
    if (g.catalogId) groupByCatalogId.set(g.catalogId, g);
    groupByName.set(g.productName.trim().toLowerCase(), g);
  }

  type UnifiedRow = {
    key: string;
    catalogId: string | null;
    displayName: string;
    slug: string;
    brand: string | null;
    category: string | null;
    imageUrl: string | null;
    price: number | null;
    marketName: string | null;
    marketLogoUrl: string | null;
    samples: number;
    matchReasons: (typeof result.suggestions)[number]["matchReasons"];
  };

  const cheapestFromGroup = (
    g: (typeof result.groups)[number] | undefined,
  ): { price: number | null; marketName: string | null; marketLogoUrl: string | null } => {
    if (!g || g.prices.length === 0) return { price: null, marketName: null, marketLogoUrl: null };
    const cheap = g.prices.reduce((a, b) => (a.price <= b.price ? a : b));
    return { price: cheap.price, marketName: cheap.marketName, marketLogoUrl: cheap.marketLogoUrl };
  };

  const rows: UnifiedRow[] = [
    ...suggestions.map<UnifiedRow>((s) => {
      const g =
        groupByCatalogId.get(s.id) ??
        groupByName.get(s.displayName.trim().toLowerCase());
      const c = cheapestFromGroup(g);
      return {
        key: `s:${s.id}`,
        catalogId: s.id,
        displayName: s.displayName,
        slug: s.id,
        brand: s.brand,
        category: s.category,
        imageUrl: s.imageUrl,
        price: c.price ?? g?.min ?? null,
        marketName: c.marketName,
        marketLogoUrl: c.marketLogoUrl,
        samples: g?.samples ?? 0,
        matchReasons: s.matchReasons,
      };
    }),
    ...extraGroups.map<UnifiedRow>((g) => {
      const c = cheapestFromGroup(g);
      return {
        key: `g:${g.productName}`,
        catalogId: g.catalogId,
        displayName: g.productName,
        slug: g.catalogId ?? g.productName,
        brand: null,
        category: null,
        imageUrl: null,
        price: c.price ?? g.min,
        marketName: c.marketName,
        marketLogoUrl: c.marketLogoUrl,
        samples: g.samples,
        matchReasons: g.matchReasons,
      };
    }),
  ]
    .sort((a, b) => {
      // Sem preço vai pro fim; menor preço primeiro
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return a.price - b.price;
    })
    .slice(0, 12);

  return (
    <motion.div
      key={query}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 space-y-3"
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
          Voltar
        </button>
      )}

      {result.didYouMean && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 px-3.5 py-2.5 text-[12px] text-foreground">
          Você quis dizer{" "}
          <span className="font-semibold text-accent">{result.didYouMean}</span>? Mostrando
          resultados aproximados.
        </div>
      )}

      {/* Resumo geral — compacto */}
      {result.samples > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-sm">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-foreground">
              {result.query}
              {pending && (
                <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" />
              )}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span>
                <strong className="text-foreground">{rows.length}</strong>{" "}
                produto{rows.length !== 1 ? "s" : ""}
              </span>
              <span aria-hidden>·</span>
              <span>
                <strong className="text-foreground">{result.markets.length}</strong>{" "}
                mercado{result.markets.length !== 1 ? "s" : ""}
              </span>
              <span aria-hidden>·</span>
              <span>
                méd <span className="num text-foreground">{fmt(result.avg)}</span>
              </span>
              {result.max != null && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    máx <span className="num text-foreground">{fmt(result.max)}</span>
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              menor
            </p>
            <p className="num font-display text-[20px] font-extrabold leading-none text-primary">
              {fmt(result.min)}
            </p>
            {result.cheapest && (
              <p className="mt-0.5 truncate text-[10.5px] font-medium text-muted-foreground">
                {result.cheapest.marketName}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lista unificada — todos os produtos com preço + estabelecimento */}
      {rows.length > 0 && (
        <section aria-label={`Produtos encontrados para ${result.query}`} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <header className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5">
            <p className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-[0.14em] text-foreground">
              <Sparkles className="h-2.5 w-2.5 text-accent" strokeWidth={2.6} />
              Produtos encontrados ({rows.length})
            </p>
            <Link
              to="/buscar"
              search={{ q: result.query }}
              className="text-[10.5px] font-semibold text-primary hover:underline"
            >
              Ver todos
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <ExpandableProductRow
                key={r.key}
                row={r}
                highlightTokens={highlightTokens}
                onOpenModal={() => openModal(r.slug, r.displayName)}
                fmt={fmt}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Comparativo por mercado — agregado da busca */}
      {markets.length > 0 && (
        <MarketsCompareBlock
          query={result.query}
          markets={markets}
          totalCount={result.markets.length}
          resultMin={result.min}
          resultMax={result.max}
          resultAvg={result.avg}
        />
      )}

      <ProductQuickModal
        slug={modalSlug}
        open={modalOpen}
        onOpenChange={setModalOpen}
        fallbackName={modalName}
        queryTokens={highlightTokens}
      />

    </motion.div>

  );
}


/* ================================================================== */
/* EXPANDABLE PRODUCT ROW — lista todos estabelecimentos on-demand    */
/* ================================================================== */

type ExpandableRowData = {
  key: string;
  catalogId: string | null;
  displayName: string;
  slug: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  price: number | null;
  marketName: string | null;
  marketLogoUrl: string | null;
  samples: number;
  matchReasons: import("@/lib/price-search.functions").PriceSearchResult["suggestions"][number]["matchReasons"];
};

function ExpandableProductRow({
  row: r,
  highlightTokens,
  onOpenModal,
  fmt,
}: {
  row: ExpandableRowData;
  highlightTokens: string[];
  onOpenModal: () => void;
  fmt: (v: number | null | undefined) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const getProductFn = useServerFn(getPublicProduct);

  const detailQuery = useQuery({
    queryKey: ["public-product-quick", r.slug],
    queryFn: () => getProductFn({ data: { slug: r.slug } }),
    enabled: expanded,
    staleTime: 60_000,
  });

  const markets = useMemo(() => {
    const list = (detailQuery.data as PublicProduct | undefined)?.markets ?? [];
    return [...list].sort((a, b) => a.priceMin - b.priceMin);
  }, [detailQuery.data]);

  const dayLabel = (iso: string) => {
    const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
    if (d === 0) return "hoje";
    if (d === 1) return "ontem";
    if (d < 30) return `há ${d}d`;
    if (d < 365) return `há ${Math.floor(d / 30)}mês`;
    return `há ${Math.floor(d / 365)}a`;
  };

  return (
    <li>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition hover:bg-muted/40">
        <button
          type="button"
          onClick={onOpenModal}
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface"
          aria-label={`Abrir detalhes de ${r.displayName}`}
        >
          {r.imageUrl ? (
            <img
              src={r.imageUrl}
              alt={r.displayName}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          )}
        </button>

        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full max-w-full items-center gap-1.5 text-left text-[13.5px] font-semibold leading-tight text-foreground hover:text-primary"
            aria-expanded={expanded}
          >
            <span className="truncate">
              <HighlightMatch text={r.displayName} tokens={highlightTokens} />
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180 text-primary",
              )}
              strokeWidth={2.4}
              aria-hidden
            />
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
            {r.brand && (
              <span className="font-semibold text-foreground">
                <HighlightMatch text={r.brand} tokens={highlightTokens} />
              </span>
            )}
            {r.marketName ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-1.5 py-0.5 font-medium text-primary">
                {r.marketLogoUrl ? (
                  <img
                    src={r.marketLogoUrl}
                    alt=""
                    className="h-3 w-3 rounded-full object-cover"
                  />
                ) : (
                  <StoreIcon className="h-3 w-3" strokeWidth={2} aria-hidden />
                )}
                <span className="max-w-[140px] truncate">{r.marketName}</span>
              </span>
            ) : r.samples === 0 ? (
              <span className="italic">sem cotação ainda</span>
            ) : null}
            {r.samples > 0 && (
              <span>
                {r.samples} leitura{r.samples !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {r.matchReasons && r.matchReasons.length > 0 && (
            <MatchReasonBadges reasons={r.matchReasons} className="mt-1" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            {r.price != null ? (
              <p className="num font-display text-[15px] font-extrabold leading-none text-primary">
                {fmt(r.price)}
              </p>
            ) : (
              <p className="text-[11px] font-medium text-muted-foreground">—</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Recolher mercados" : "Ver todos os mercados"}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:border-primary/40 hover:text-primary",
              expanded && "border-primary/40 bg-primary/5 text-primary",
            )}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              strokeWidth={2.4}
            />
          </button>
          <ProductQuickActions
            catalogId={r.catalogId ?? r.slug}
            slug={r.slug}
            label={r.displayName}
            onCompare={onOpenModal}
          />
        </div>
      </div>

      {/* Expansão: todos os mercados */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-t border-border/60 bg-muted/25"
        >
          <div className="px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[9.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Vendido em{" "}
                <span className="text-foreground">
                  {markets.length || (detailQuery.isFetching ? "…" : "0")}
                </span>{" "}
                {markets.length === 1 ? "mercado" : "mercados"}
              </p>
              {markets.length > 0 && (
                <p className="text-[9.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Ordenado: menor preço
                </p>
              )}
            </div>

            {detailQuery.isFetching && markets.length === 0 && (
              <div className="flex items-center gap-2 py-3 text-[11.5px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                Carregando estabelecimentos…
              </div>
            )}

            {detailQuery.isError && (
              <p className="py-3 text-[11.5px] text-destructive">
                Não foi possível carregar os mercados. Tente novamente.
              </p>
            )}

            {!detailQuery.isFetching && !detailQuery.isError && markets.length === 0 && (
              <p className="py-3 text-[11.5px] italic text-muted-foreground">
                Nenhum estabelecimento com cotação registrada para este item.
              </p>
            )}

            {markets.length > 0 && (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-surface">
                {markets.map((m, idx) => {
                  const cheapest = idx === 0;
                  const location = [m.neighborhood, m.city, m.state]
                    .filter(Boolean)
                    .join(" · ");
                  const spread = m.priceMax > m.priceMin ? m.priceMax - m.priceMin : 0;
                  return (
                    <li
                      key={`${m.marketName}-${idx}`}
                      className={cn(
                        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2",
                        cheapest && "bg-primary/5",
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-md border text-[10px] font-black",
                          cheapest
                            ? "border-primary/40 bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {cheapest ? (
                          <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.6} />
                        ) : (
                          <span className="num">{idx + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold leading-tight text-foreground">
                          <StoreIcon
                            className="h-3 w-3 shrink-0 text-muted-foreground"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="truncate">{m.marketName}</span>
                          {cheapest && (
                            <span className="ml-1 shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-primary-foreground">
                              Menor
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          {location && <span className="truncate">{location}</span>}
                          <span>
                            {m.samples} leitura{m.samples !== 1 ? "s" : ""}
                          </span>
                          <span>· {dayLabel(m.lastSeen)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "num font-display text-[14px] font-extrabold leading-none",
                            cheapest ? "text-primary" : "text-foreground",
                          )}
                        >
                          {fmt(m.priceMin)}
                        </p>
                        {spread > 0 && (
                          <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                            até <span className="num">{fmt(m.priceMax)}</span>
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </li>
  );
}





/* ================================================================== */
/* MARKETS COMPARE BLOCK — filtros + ordenação (menor preço/economia/tendência) */
/* ================================================================== */

type SortMode = "menor-preco" | "economia" | "tendencia";

function MarketsCompareBlock({
  query,
  markets,
  totalCount,
  resultMin,
  resultMax,
  resultAvg,
}: {
  query: string;
  markets: import("@/lib/price-search.functions").PriceSearchMarket[];
  totalCount: number;
  resultMin: number | null;
  resultMax: number | null;
  resultAvg: number | null;
}) {
  const [sort, setSort] = useState<SortMode>("menor-preco");

  const rows: ComparisonRow[] = useMemo(() => {
    const worst = resultMax ?? Math.max(...markets.map((m) => m.priceMin));
    const decorated = markets.map((m) => {
      const savings = Math.max(0, (worst ?? m.priceMin) - m.priceMin);
      const trendDelta = m.priceAvg - m.priceMin; // quão abaixo da própria média
      return { m, savings, trendDelta };
    });

    decorated.sort((a, b) => {
      if (sort === "menor-preco") return a.m.priceMin - b.m.priceMin;
      if (sort === "economia") return b.savings - a.savings;
      return b.trendDelta - a.trendDelta;
    });

    return decorated.map(({ m, savings, trendDelta }) => ({
      marketId: m.marketName,
      marketName: m.marketName,
      logoUrl: m.marketLogoUrl,
      price: m.priceMin,
      lastSeenAt: m.lastSeen,
      meta:
        sort === "economia" && savings > 0.01
          ? `economia de ${formatBRL(savings)}`
          : sort === "tendencia" && trendDelta > 0.01
            ? `${formatBRL(trendDelta)} abaixo da média local`
            : `${m.samples} leitura${m.samples > 1 ? "s" : ""}${m.marketKind ? ` · ${m.marketKind}` : ""}`,
    }));
  }, [markets, sort, resultMax]);

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: "menor-preco", label: "Menor preço" },
    { id: "economia", label: "Maior economia" },
    { id: "tendencia", label: "Melhor tendência" },
  ];

  return (
    <section aria-label="Onde encontramos" className="space-y-1.5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 flex items-center gap-1.5">
          <StoreIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">
            Onde encontramos ({totalCount})
          </p>
        </div>
        <Link
          to="/buscar"
          search={{ q: query }}
          className="shrink-0 text-[10.5px] font-semibold text-primary hover:underline"
        >
          Ver tudo
        </Link>
      </header>

      <div
        role="tablist"
        aria-label="Ordenar comparativos"
        className="inline-flex rounded-full border border-border bg-background p-0.5 text-[10.5px] font-medium"
      >
        {sortOptions.map((opt) => (
          <button
            key={opt.id}
            role="tab"
            aria-selected={sort === opt.id}
            type="button"
            onClick={() => setSort(opt.id)}
            className={cn(
              "h-6 rounded-full px-2.5 transition",
              sort === opt.id
                ? "bg-primary text-primary-foreground shadow-elev-1"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ComparisonCard
        productName={query}
        rows={rows}
        bestMarketId={rows[0]?.marketId}
      />
    </section>
  );
}
