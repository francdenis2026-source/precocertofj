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
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { ds, dsx } from "@/lib/ds";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { StartFreeDialog } from "@/components/home/StartFreeDialog";
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
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    if (!isLoggedOut) {
      setShowStickyCta(false);
      return;
    }
    const onScroll = () => setShowStickyCta(window.scrollY > 720);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLoggedOut]);

  

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



      {/* ============== EDITORIAL CARD ============== */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 pb-4 sm:px-6 sm:pt-4 lg:px-8 lg:pt-5">
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
            <div className="flex-[1.2] p-5 sm:p-6 lg:p-8 xl:p-10 flex flex-col justify-center">
              {/* Badge EM BREVE */}
              <div
                className="mb-3 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] sm:mb-5 sm:gap-2.5 sm:px-3.5 sm:py-1.5 sm:text-[11px]"
                style={{ background: P.navy, color: "#F5F6FA" }}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: P.gold }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ background: P.gold }}
                  />
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] sm:text-[10px]"
                  style={{ background: P.gold, color: P.navy }}
                >
                  EM BREVE
                </span>
                <span className="hidden sm:inline">Inteligência artificial integrada</span>
                <span className="sm:hidden">IA integrada</span>
              </div>

              {today && (
                <div
                  className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] sm:mb-3 sm:text-[10.5px] sm:tracking-[0.24em]"
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
                  fontSize: "clamp(1.75rem, 4.6vw, 3.75rem)",
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
                className="mt-3 max-w-xl text-[13.5px] leading-relaxed sm:text-[14.5px]"
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
                    placeholder="Qual item você busca hoje?"
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="mr-1 text-[10px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: "color-mix(in oklab, var(--pc-home-ink) 45%, transparent)" }}
                >
                  Populares:
                </span>
                {["arroz", "feijão", "leite", "óleo", "café", "açúcar"].map((t) => (
                  <button
                    key={t}
                    onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
                    className="inline-flex items-center rounded-full border px-4 py-1.5 text-[12px] font-semibold capitalize transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    style={{
                      background: P.card,
                      borderColor: P.line,
                      color: P.heading,
                      // @ts-expect-error css var
                      "--tw-ring-color": P.gold,
                      "--tw-ring-offset-color": P.card,
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
                    l: "Estabelecimentos",
                  },
                  {
                    k:
                      stats.products != null
                        ? `${stats.products.toLocaleString("pt-BR")}+`
                        : "1.000+",
                    l: "Produtos catalogados",
                  },
                  { k: "24h", l: "Preços atualizados" },
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

          {/* -------- EXPLORE (dark navy band inside card) -------- */}
          <div
            className="p-3.5 sm:p-5 lg:p-6 xl:p-7"
            style={{ background: P.navy, color: "#F5F6FA" }}
          >
            <div className="mb-3 flex flex-col gap-1.5 sm:mb-4 md:flex-row md:items-end md:justify-between md:gap-6">
              <div className="max-w-xl">
                <div
                  className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.28em] sm:text-[10px]"
                  style={{ color: P.gold }}
                >
                  Explore a plataforma
                </div>
                <h2
                  className={`${serif} font-normal`}
                  style={{
                    fontSize: "clamp(1.15rem, 2.4vw, 1.85rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.025em",
                    color: "#F5F6FA",
                  }}
                >
                  Tudo em três passos,{" "}
                  <span className="italic" style={{ color: P.gold }}>
                    sem esforço.
                  </span>
                </h2>
                <p className="mt-1.5 hidden max-w-md text-[13px] leading-snug text-white/80 sm:block sm:text-[13.5px]">
                  Ferramentas exclusivas para você nunca mais pagar caro em itens essenciais.
                </p>
              </div>
              <div className="hidden h-px flex-1 md:mx-8 md:mb-3 md:block" style={{ background: "rgb(255 255 255 / 0.08)" }} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-3">
              <ExploreCard
                to="/melhores-precos"
                number="01"
                title="Ranking Geral"
                desc="Compare a cesta básica entre todos os mercados locais."
                cta="Ver rankings"
              />
              <ExploreCard
                to="/estabelecimentos"
                number="02"
                title="Todos os mercados"
                desc="Bairros, categorias e produtos de cada estabelecimento."
                cta="Ver mercados"
              />
              <ExploreCard
                to="/planos"
                number="03"
                title="Planos & Alertas"
                desc="Assine e desbloqueie alertas e histórico completo."
                cta="Ver planos"
              />
            </div>
          </div>


        </div>
      </div>

      {/* -------- SOCIAL PROOF (compact) -------- */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { k: "7", l: "mercados ativos", icon: <ShieldCheck className="h-4 w-4" /> },
            { k: "500+", l: "preços por semana", icon: <TrendingDown className="h-4 w-4" /> },
            { k: "100%", l: "notas fiscais", icon: <Sparkles className="h-4 w-4" /> },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border px-4 py-3 text-center sm:py-4"
              style={{ borderColor: P.line, background: P.card, color: P.heading }}
            >
              <div className="mb-1 flex items-center justify-center" style={{ color: P.goldSoft }}>
                {s.icon}
              </div>
              <div
                className={`${serif} tabular-nums`}
                style={{
                  fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.k}
              </div>
              <div
                className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)" }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

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

      {/* Sticky floating CTA — logged-out only, appears after scroll */}
      {isLoggedOut && (
        <div
          aria-hidden={!showStickyCta}
          className={`pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-300 sm:bottom-6 sm:justify-end sm:pr-6 ${
            showStickyCta
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <StartFreeDialog>
            <button
              type="button"
              tabIndex={showStickyCta ? 0 : -1}
              aria-label="Começar grátis — abrir opções de cadastro e login"
              aria-haspopup="dialog"
              className="group pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-full px-5 py-3 text-[14.5px] font-semibold tracking-[-0.005em] antialiased shadow-md transition-[transform,box-shadow] duration-150 hover:-translate-y-[1px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0 sm:text-[15px]"
              style={{
                background: P.gold,
                color: P.navy,
                // @ts-expect-error css var
                "--tw-ring-color": P.gold,
                "--tw-ring-offset-color": P.paper,
              }}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.6} />
              <span>Começar grátis</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </button>
          </StartFreeDialog>
        </div>
      )}

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
      className="group block rounded-2xl border p-3.5 shadow-elev-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pc-home-gold)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pc-home-navy)] sm:p-4"
      style={{
        background: "rgb(255 255 255 / 0.05)",
        borderColor: "rgb(255 255 255 / 0.10)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgb(255 255 255 / 0.10)";
        (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in oklab, var(--pc-home-gold) 40%, transparent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgb(255 255 255 / 0.05)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgb(255 255 255 / 0.10)";
      }}
    >
      {/* Mobile: horizontal compact row · Tablet+Desktop: stacked */}
      <div className="flex items-start gap-3 sm:block">
        <div
          className={`${serif} shrink-0 tabular-nums leading-none sm:mb-2`}
          style={{
            color: P.gold,
            fontSize: "clamp(1.4rem, 2.4vw, 1.75rem)",
            letterSpacing: "-0.02em",
          }}
        >
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-0.5 text-[14.5px] font-semibold leading-tight text-white sm:mb-1 sm:text-[15.5px] lg:text-[17px]">
            {title}
          </h3>
          <p className="text-[12.5px] leading-snug text-white/70 sm:text-[13px]">{desc}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 transition-colors group-hover:text-[color:var(--pc-home-gold)] sm:mt-2.5 sm:text-[10.5px] sm:tracking-[0.18em]">
            {cta}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1 sm:h-3.5 sm:w-3.5" />
          </div>
        </div>
        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-[color:var(--pc-home-gold)] sm:hidden"
          aria-hidden
        />
      </div>
    </Link>
  );
}


