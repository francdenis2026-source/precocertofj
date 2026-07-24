import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
// Responsive picture: modern formats (AVIF/WebP) with JPG fallback, tuned quality.
import heroMarket from "@/assets/home-hero.jpg?w=480;640;896&format=avif;webp;jpg&quality=68&as=picture";
import heroMarketDark from "@/assets/home-hero-dark.jpg?w=480;640;896&format=avif;webp;jpg&quality=68&as=picture";
import heroPreloadAvif from "@/assets/home-hero.jpg?w=640&format=avif&quality=62&url";
import {
  Search,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Clock,
  Package,
  
} from "lucide-react";

import { ds, dsx } from "@/lib/ds";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { RecentProducts } from "@/components/home/RecentProducts";
import { StartFreeDialog } from "@/components/home/StartFreeDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/hooks/useSession";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PreçoCerto — Comparador inteligente de mercados em Feijó/AC" },
      {
        name: "description",
        content:
          "Compare preços de supermercados em Feijó em tempo real. Cesta básica, quedas do dia e economia real por família — direto no seu celular.",
      },
      { property: "og:title", content: "PreçoCerto — Comparador inteligente de mercados" },
      {
        property: "og:description",
        content:
          "Compare mercados de Feijó/AC. Economize a cada compra com dados atualizados pela comunidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "preload",
        as: "image",
        href: heroPreloadAvif,
        type: "image/avif",
        fetchpriority: "high",
      },
    ],
  }),
  component: HomePage,
});

/* ------- Tokens ------- */
const P = {
  paper: "var(--pc-home-paper)",
  ink: "var(--pc-home-ink)",
  card: "var(--pc-home-card)",
  navy: "var(--pc-home-navy)",
  gold: "var(--pc-home-gold)",
  goldSoft: "var(--pc-home-gold-soft)",
  line: "var(--pc-home-line)",
  heading: "var(--pc-home-heading)",
  onNavy: "var(--pc-home-on-navy)",
};
const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

// Padrão único para citações e trechos serifados em destaque.
// Mantém tamanhos fluidos, leading, letter-spacing e kerning consistentes
// em qualquer bloco de citação/destaque na página.
const quoteTypography = {
  fontSize: "clamp(1.1875rem, 1.05rem + 0.6vw, 1.4375rem)", // 19 → 23px
  lineHeight: 1.35,
  letterSpacing: "-0.005em",
  wordSpacing: "0.01em",
  textWrap: "balance" as const,
  WebkitFontSmoothing: "antialiased" as const,
  MozOsxFontSmoothing: "grayscale" as const,
  fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1, "dlig" 1',
  textRendering: "optimizeLegibility" as const,
  fontKerning: "normal" as const,
};
const captionTypography = {
  letterSpacing: "0.22em",
  WebkitFontSmoothing: "antialiased" as const,
  MozOsxFontSmoothing: "grayscale" as const,
  textRendering: "optimizeLegibility" as const,
};

function HomePage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const isLoggedOut = !sessionLoading && !user;
  const [q, setQ] = useState("");
  const [today, setToday] = useState("");


  

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    );
  }, []);

  const platformStats = useServerFn(getPlatformStats);
  const statsQ = useQuery({
    queryKey: ["home-stats"],
    queryFn: () => platformStats({} as any),
    staleTime: 60_000,
  });
  const stats: any = statsQ.data ?? {};

  const economyFn = useServerFn(getEconomyStat);
  const economyQ = useQuery({
    queryKey: ["home-economy"],
    queryFn: () => economyFn({} as any),
    staleTime: 5 * 60_000,
  });
  const economy = economyQ.data;


  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  return (
    <div
      className="min-h-screen w-full antialiased pc-home"
      style={{
        background: P.paper,
        color: P.ink,
        fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <SiteHeader variant="solid" showThemeToggle />

      {/* -------- MOBILE QUICK-NAV (abaixo do header, sticky) -------- */}
      <nav
        aria-label="Atalhos rápidos"
        className="sticky top-[56px] z-30 -mb-1 border-b sm:hidden"
        style={{
          background: `color-mix(in oklab, ${P.paper} 92%, transparent)`,
          borderColor: P.line,
          backdropFilter: "saturate(140%) blur(8px)",
          WebkitBackdropFilter: "saturate(140%) blur(8px)",
        }}
      >
        <div className="flex gap-2.5 overflow-x-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { to: "/melhores-precos", label: "Ranking" },
            { to: "/estabelecimentos", label: "Mercados" },
            { to: "/buscar", label: "Buscar" },
            { to: "/planos", label: "Alertas" },
            { to: "/cesta-basica", label: "Cesta básica" },
            { to: "/economia", label: "Economia" },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="inline-flex shrink-0 items-center rounded-full border px-5 py-2.5 text-[15px] font-semibold leading-none tracking-[-0.005em] shadow-sm transition-all active:scale-[0.97] hover:border-[color:var(--pc-home-gold)]"
              style={{ borderColor: P.line, background: P.card, color: P.heading }}
              activeProps={{
                style: {
                  background: P.heading,
                  color: P.paper,
                  borderColor: P.heading,
                },
              }}
            >
              {c.label}
            </Link>
          ))}
        </div>

      </nav>




      {/* ============== EDITORIAL CARD ============== */}
      <div className="mx-auto w-full max-w-6xl px-3 pt-2 pb-3 sm:px-6 sm:pt-4 sm:pb-4 lg:px-8 lg:pt-5">
        <div
          className="overflow-hidden rounded-[1.25rem] shadow-[0_20px_60px_-30px_rgb(11_29_58_/_0.22)] ring-1 lg:rounded-[1.75rem]"
          style={{
            background: P.card,
            borderColor: P.line,
            // @ts-expect-error css var
            "--tw-ring-color": P.line,
          }}
        >
          {/* -------- HERO SPLIT -------- */}
          <div className="flex flex-col lg:flex-row">
            {/* LEFT — content */}
            <div className="flex-[1.2] p-4 sm:p-6 lg:p-8 xl:p-10 flex flex-col justify-center">
              {/* Badge EM BREVE */}
              <div
                className="mb-4 inline-flex w-fit items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.18em] shadow-sm sm:mb-5 sm:gap-2.5 sm:px-3.5 sm:py-1.5 sm:text-[11px]"
                style={{ background: P.navy, color: "#F5F6FA" }}
              >
                <span className="relative flex h-2.5 w-2.5 sm:h-2 sm:w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: P.gold }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full sm:h-2 sm:w-2"
                    style={{ background: P.gold }}
                  />
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold tracking-[0.2em] sm:text-[10px]"
                  style={{ background: P.gold, color: P.navy }}
                >
                  EM BREVE
                </span>
                <span className="hidden sm:inline">Inteligência artificial integrada</span>
                <span className="sm:hidden">IA integrada</span>
              </div>

              {today && (
                <div
                  className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.22em] sm:mb-3 sm:text-[10.5px] sm:tracking-[0.24em]"
                  style={{ color: P.goldSoft }}
                >
                  {today} · edição diária
                </div>
              )}

              {/* H1 */}
              <h1
                className={`${serif} font-normal`}
                style={{
                  color: P.heading,
                  fontSize: "clamp(1.55rem, 4.6vw, 3.75rem)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.03em",
                }}
              >
                O preço certo,
                <br />
                <span className="italic" style={{ color: P.goldSoft }}>
                  onde você compra.
                </span>
              </h1>


              <p
                className="mt-3 max-w-xl text-[15px] leading-relaxed sm:text-[14.5px]"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 78%, transparent)" }}
              >
                Veja onde o arroz, o feijão e o café estão mais baratos hoje em Feijó.
                Preços conferidos por nota fiscal, atualizados pelos próprios moradores.
              </p>

              {/* Search */}
              <form onSubmit={submitSearch} className="mt-4 max-w-xl">
                <div
                  className="flex items-center gap-2 rounded-2xl border p-1.5 transition-all focus-within:ring-2 sm:p-2"
                  style={{
                    background: P.paper,
                    borderColor: P.line,
                    // @ts-expect-error css var
                    "--tw-ring-color": P.gold,
                  }}
                >
                  <span className="pl-3 sm:pl-4">
                    <Search
                      className="h-5 w-5"
                      style={{ color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)" }}
                      strokeWidth={2.2}
                    />
                  </span>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    type="search"
                    inputMode="search"
                    placeholder="Ex.: Arroz Tio João 5kg"
                    aria-label="Buscar produto"
                    className="flex-1 bg-transparent px-2 py-2.5 text-[14px] font-medium outline-none sm:text-[15px]"
                    style={{ color: P.ink }}
                  />
                  <button
                    type="submit"
                    aria-label="Buscar"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-transform active:scale-95 sm:px-6 sm:text-[15px]"
                    style={{ background: P.gold, color: P.navy }}
                  >
                    <span className="hidden sm:inline">Buscar</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Chips */}
              <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
                <span
                  className="mr-1 text-[10px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: "color-mix(in oklab, var(--pc-home-ink) 45%, transparent)" }}
                >
                  Buscas do dia:
                </span>
                {["arroz", "feijão", "leite", "óleo", "café", "açúcar"].map((t) => (
                  <button
                    key={t}
                    onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
                    className="group inline-flex items-center rounded-full border px-4 py-1.5 text-[12px] font-semibold capitalize transition-colors duration-150 hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{
                      background: P.card,
                      borderColor: P.line,
                      color: P.heading,
                      // @ts-expect-error css var
                      "--tw-ring-color": P.gold,
                      "--tw-ring-offset-color": P.card,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = P.gold;
                      e.currentTarget.style.color = P.navy;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = P.card;
                      e.currentTarget.style.color = P.heading;
                    }}
                  >
                    {t}
                  </button>
                ))}

              </div>

              {/* CTAs */}
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6 sm:gap-4">
                {isLoggedOut ? (
                  <StartFreeDialog>
                    <button
                      type="button"
                      aria-label="Começar grátis — abrir opções de cadastro e login"
                      aria-haspopup="dialog"
                      className="group inline-flex min-h-[48px] items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold tracking-[-0.005em] antialiased shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm sm:min-h-[52px] sm:rounded-2xl sm:px-7 sm:py-3.5 sm:text-[16px]"
                      style={{
                        background: P.gold,
                        color: P.navy,
                        // @ts-expect-error css var
                        "--tw-ring-color": P.gold,
                        "--tw-ring-offset-color": P.card,
                      }}
                    >
                      <span>Começar grátis</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2.5} />
                    </button>
                  </StartFreeDialog>
                ) : (
                  <Link
                    to="/app"
                    aria-label="Ir para o painel"
                    className="group inline-flex min-h-[48px] items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold tracking-[-0.005em] antialiased shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm sm:min-h-[52px] sm:rounded-2xl sm:px-7 sm:py-3.5 sm:text-[16px]"
                    style={{
                      background: P.gold,
                      color: P.navy,
                      // @ts-expect-error css var
                      "--tw-ring-color": P.gold,
                      "--tw-ring-offset-color": P.card,
                    }}
                  >
                    <span>Ir para o painel</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2.5} />
                  </Link>
                )}


                <Link
                  to="/melhores-precos"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border px-5 py-2.5 text-[14.5px] font-semibold transition-colors hover:text-[color:var(--pc-home-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:rounded-2xl sm:px-6 sm:py-3 sm:text-[15px]"
                  style={{
                    borderColor: P.heading,
                    color: P.heading,
                    // @ts-expect-error css var
                    "--tw-ring-color": P.gold,
                    "--tw-ring-offset-color": P.card,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = P.heading;
                    (e.currentTarget as HTMLElement).style.color = P.card;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = P.heading;
                  }}
                >
                  <TrendingDown className="h-4 w-4" />
                  Ver rankings
                </Link>
              </div>


              {/* Stats */}
              <div
                className="mt-5 grid grid-cols-3 gap-4 border-t pt-4 sm:mt-6 sm:gap-10 sm:pt-5"
                style={{ borderColor: P.line }}
              >

                {[
                  {
                    k: String(stats.establishments ?? 8).padStart(2, "0"),
                    l: "Mercados de Feijó",
                  },
                  {
                    k:
                      stats.products != null
                        ? `${stats.products.toLocaleString("pt-BR")}+`
                        : "1.000+",
                    l: "Produtos com preço",
                  },
                  { k: "24h", l: "Preços conferidos" },
                ].map((s) => (
                  <div key={s.l}>
                    <div
                      className={`${serif} tabular-nums`}
                      style={{
                        color: P.heading,
                        fontSize: "clamp(1.5rem, 3vw, 2.15rem)",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {s.k}
                    </div>
                    <div
                      className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] sm:text-[11px]"
                      style={{ color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)" }}
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — image + floating quote */}
            <div
              className="relative hidden flex-1 lg:block"
              style={{ background: P.paper, minHeight: 440 }}
            >
              {/* Light theme image */}
              <picture className="dark:hidden">
                {Object.entries(heroMarket.sources).map(([type, srcset]) => (
                  <source
                    key={type}
                    type={`image/${type}`}
                    srcSet={srcset}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                ))}
                <img
                  src={heroMarket.img.src}
                  width={heroMarket.img.w}
                  height={heroMarket.img.h}
                  alt="Cesta com produtos frescos do mercado"
                  fetchPriority="high"
                  decoding="async"
                  loading="eager"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </picture>
              {/* Dark theme image — moody market scene */}
              <picture className="hidden dark:block">
                {Object.entries(heroMarketDark.sources).map(([type, srcset]) => (
                  <source
                    key={type}
                    type={`image/${type}`}
                    srcSet={srcset}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                ))}
                <img
                  src={heroMarketDark.img.src}
                  width={heroMarketDark.img.w}
                  height={heroMarketDark.img.h}
                  alt="Mercado noturno com produtos em iluminação ambiente"
                  decoding="async"
                  loading="eager"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </picture>

              {/* Subtle left fade so the frame reads clean against the panel */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-24"
                style={{
                  background: `linear-gradient(90deg, ${P.card} 0%, transparent 100%)`,
                }}
              />
              {/* Quote card */}
              <div
                className="absolute inset-x-6 bottom-6 rounded-2xl p-5 shadow-2xl backdrop-blur-md xl:inset-x-8 xl:bottom-8 xl:p-6"
                style={{
                  background: "color-mix(in oklab, var(--pc-home-card) 96%, transparent)",
                  borderWidth: 1,
                  borderColor: "color-mix(in oklab, var(--pc-home-gold) 24%, var(--pc-home-line))",
                }}
              >
                <figure className="m-0">
                  <blockquote
                    className={`${serif} m-0 italic`}
                    style={{
                      color: "var(--pc-home-heading)",
                      ...quoteTypography,
                    }}
                  >
                    <span
                      aria-hidden
                      className={`${serif} mr-1 align-[-0.15em] text-[2.25em] leading-none not-italic`}
                      style={{ color: "var(--pc-home-gold)" }}
                    >
                      “
                    </span>
                    Comparar preços não é só gastar menos — é comprar com inteligência e liberdade.
                  </blockquote>
                  <figcaption
                    className="mt-3 text-[10.5px] font-bold uppercase"
                    style={{
                      color: "color-mix(in oklab, var(--pc-home-ink) 82%, transparent)",
                      ...captionTypography,
                    }}
                  >
                    — Equipe PreçoCerto Feijó
                  </figcaption>
                </figure>

              </div>
            </div>
          </div>

          {/* Chips mobile foram promovidos ao topo (sticky abaixo do header). */}


          {/* -------- EXPLORE (dark navy band inside card) — sm+ apenas -------- */}
          <div
            className="hidden sm:block sm:p-5 lg:p-6 xl:p-7"
            style={{ background: P.navy, color: "#F5F6FA" }}
          >
            <div className="mb-4">
              <div
                className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em]"
                style={{ color: P.goldSoft }}
              >
                Por onde começar
              </div>
              <h2
                className="font-semibold text-white"
                style={{
                  fontSize: "clamp(1.05rem, 2vw, 1.5rem)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                }}
              >
                Três caminhos, uma cesta mais barata.
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ExploreCard
                to="/melhores-precos"
                number="01"
                title="Ranking dos mercados"
                desc="Qual mercado tem a cesta mais barata hoje."
                cta="Ver ranking"
              />
              <ExploreCard
                to="/estabelecimentos"
                number="02"
                title="Mercados por bairro"
                desc="Endereço, horário e catálogo de cada mercado."
                cta="Explorar mercados"
              />
              <ExploreCard
                to="/planos"
                number="03"
                title="Alertas de preço"
                desc="Aviso quando o preço cair no seu bairro."
                cta="Ver planos"
              />
            </div>
          </div>




        </div>
      </div>


      {/* -------- SOCIAL PROOF (compact, with tooltips) -------- */}
      <section className="mx-auto w-full max-w-6xl px-3 pb-3 sm:px-6 sm:pb-4 lg:px-8">
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">

            {[
              {
                k: "8",
                l: "mercados",
                lFull: "mercados no ar",
                icon: <ShieldCheck className="h-4 w-4" />,
                tip: "Mercados de Feijó/AC ativos na plataforma com preços colaborativos.",
              },
              {
                k: "1.5k+",
                l: "produtos",
                lFull: "produtos catalogados",
                icon: <Package className="h-4 w-4" />,
                tip: "Mais de 1.500 produtos únicos cadastrados com preço, marca e categoria.",
              },
              {
                k: economy?.avgSavingsPct
                  ? `${economy.avgSavingsPct}%`
                  : "até 38%",
                l: "economia",
                lFull: "economia identificada",
                icon: <TrendingDown className="h-4 w-4" />,
                tip: economy?.productsWithComparison
                  ? `Diferença média entre o melhor e o pior preço do mesmo produto, medida em ${economy.productsWithComparison.toLocaleString("pt-BR")} produtos com pelo menos 2 mercados. Melhor caso: ${economy.bestSavingsPct}%.`
                  : "Diferença média entre o melhor e o pior preço encontrado para o mesmo produto em Feijó/AC nas últimas semanas.",
              },



            ].map((s) => (
              <Tooltip key={s.lFull}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${s.k} ${s.lFull}. ${s.tip}`}
                    className="rounded-2xl border px-3 py-3 text-center transition-colors hover:bg-[color-mix(in_oklab,var(--pc-home-card)_92%,var(--pc-home-gold)_8%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-4 sm:py-4"
                    style={{ borderColor: P.line, background: P.card, color: P.heading }}
                  >
                    <div className="mb-1 flex items-center justify-center" style={{ color: P.goldSoft }}>
                      {s.icon}
                    </div>
                    <div
                      className={`${serif} tabular-nums`}
                      style={{
                        fontSize: "clamp(1.15rem, 2.8vw, 1.75rem)",
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.k}
                    </div>
                    <div
                      className="mt-1.5 truncate text-[9.5px] font-bold uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.16em]"
                      style={{ color: "color-mix(in oklab, var(--pc-home-ink) 60%, transparent)" }}
                    >
                      <span className="sm:hidden">{s.l}</span>
                      <span className="hidden sm:inline">{s.lFull}</span>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] text-[12px] leading-snug">
                  {s.tip}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </section>

      {/* -------- RECENT PRODUCTS -------- */}
      <RecentProducts P={P} serif={serif} />




      {/* -------- FINAL CTA -------- */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-5 sm:px-9 sm:py-6"
          style={{ background: P.navy, color: "#F5F6FA" }}
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
            <div className="min-w-0">
              <h3
                className="font-semibold"
                style={{
                  color: "#F5F6FA",
                  fontSize: "clamp(1.25rem, 2.6vw, 2rem)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                }}
              >
                Já tem um código?{" "}
                <span className="font-bold" style={{ color: P.gold }}>
                  Resgate seus benefícios.
                </span>
              </h3>
              <p className="mt-1.5 text-[13.5px] text-white/85 sm:text-[14px]">
                Ative sua licença em segundos e desbloqueie os recursos exclusivos.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/resgatar"
                className={dsx(ds.btn.base, ds.btn.sizes.md)}
                style={{ background: P.gold, color: P.navy }}
              >
                Resgatar código <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />




    </div>
  );
}

/* -------- ExploreCard (dark on navy) -------- */
function ExploreCard({
  to,
  number,
  title,
  desc,
  cta,
}: {
  to: string;
  number: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-none border-0 bg-transparent px-3 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-gold)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pc-home-navy)] active:bg-white/[0.04] sm:rounded-xl sm:border sm:border-white/12 sm:bg-white/[0.06] sm:p-4 sm:shadow-elev-1 sm:hover:-translate-y-0.5 sm:hover:border-white/25 sm:hover:bg-white/[0.10] sm:hover:shadow-elev-2"
    >
      <div className="flex items-center gap-3 sm:block">
        <div
          className="shrink-0 font-bold tabular-nums leading-none sm:mb-2"
          style={{
            color: P.goldSoft,
            fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
            letterSpacing: "0.14em",
          }}
        >
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-semibold leading-tight text-white sm:whitespace-normal sm:text-[15.5px] lg:text-[16.5px]">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-white/70 sm:mt-1 sm:whitespace-normal sm:text-[13px] sm:text-white/85">
            {desc}
          </p>
          <div className="mt-2 hidden items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--pc-home-gold-soft)] transition-colors group-hover:text-[color:var(--pc-home-gold)] sm:mt-2.5 sm:inline-flex">
            {cta}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1 sm:h-3.5 sm:w-3.5" />
          </div>
        </div>
        <ArrowRight
          className="h-3.5 w-3.5 shrink-0 text-[color:var(--pc-home-gold-soft)] transition-transform group-active:translate-x-0.5 sm:hidden"
          aria-hidden
        />
      </div>
    </Link>
  );
}




