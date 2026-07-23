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

function HomePage() {
  const navigate = useNavigate();
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

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  return (
    <div
      className="min-h-screen w-full antialiased"
      style={{
        background: P.paper,
        color: P.ink,
        fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <SiteHeader variant="solid" showThemeToggle />

      {/* ============== EDITORIAL CARD ============== */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-10 sm:px-6 sm:pt-10 lg:px-8 lg:pt-14">
        <div
          className="overflow-hidden rounded-[1.75rem] shadow-[0_30px_80px_-30px_rgb(11_29_58_/_0.25)] ring-1 lg:rounded-[2.5rem]"
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
            <div className="flex-[1.2] p-5 sm:p-10 lg:p-16 xl:p-20 flex flex-col justify-center">
              {/* Badge EM BREVE */}
              <div
                className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] sm:mb-8 sm:gap-2.5 sm:px-4 sm:py-2 sm:text-[11px]"
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
                  className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] sm:mb-5 sm:text-[10.5px] sm:tracking-[0.24em]"
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
                  fontSize: "clamp(2.15rem, 7vw, 6.5rem)",
                  lineHeight: 0.92,
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
                className="mt-6 max-w-xl text-[15px] leading-relaxed sm:text-[17px]"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 75%, transparent)" }}
              >
                Compare mercados de Feijó em tempo real e descubra em qual mercado
                sua cesta sai mais barata — com dados atualizados pela própria
                comunidade.
              </p>

              {/* Search */}
              <form onSubmit={submitSearch} className="mt-8 max-w-xl">
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
                    className="flex-1 bg-transparent px-2 py-3 text-[15px] font-medium outline-none sm:text-base"
                    style={{ color: P.ink }}
                  />
                  <button
                    type="submit"
                    aria-label="Buscar"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform active:scale-95 sm:px-8 sm:text-base"
                    style={{ background: P.gold, color: P.navy }}
                  >
                    <span className="hidden sm:inline">Buscar</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Chips */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
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
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/cadastro"
                  className="group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl sm:px-10 sm:py-5 sm:text-lg"
                  style={{ background: P.navy, color: "#F5F6FA" }}
                >
                  Começar grátis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/melhores-precos"
                  className="inline-flex items-center gap-2 rounded-2xl border-2 px-8 py-4 text-base font-bold transition-colors hover:text-[color:var(--pc-home-card)] sm:px-10 sm:py-5 sm:text-lg"
                  style={{
                    borderColor: P.heading,
                    color: P.heading,
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
                className="mt-14 grid grid-cols-3 gap-6 border-t pt-8 sm:gap-12"
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
                        fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)",
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
              style={{ background: P.paper, minHeight: 720 }}
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
                className="absolute inset-x-8 bottom-8 rounded-3xl p-7 shadow-2xl backdrop-blur-md xl:inset-x-12 xl:bottom-12 xl:p-8"
                style={{
                  background: "color-mix(in oklab, var(--pc-home-card) 92%, transparent)",
                  borderWidth: 1,
                  borderColor: P.line,
                }}
              >
                <span
                  className={`${serif} mb-2 block text-5xl leading-none`}
                  style={{ color: P.gold }}
                >
                  “
                </span>
                <p
                  className={`${serif} mb-4 text-xl italic leading-snug`}
                  style={{ color: P.heading }}
                >
                  Comparar preços não é só gastar menos — é comprar com
                  inteligência e liberdade.
                </p>
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)" }}
                >
                  — Equipe PreçoCerto Feijó
                </div>
              </div>
            </div>
          </div>

          {/* -------- EXPLORE (dark navy band inside card) -------- */}
          <div
            className="p-6 sm:p-10 lg:p-16 xl:p-20"
            style={{ background: P.navy, color: "#F5F6FA" }}
          >
            <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <div
                  className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em]"
                  style={{ color: P.gold }}
                >
                  Explore a plataforma
                </div>
                <h2
                  className={`${serif} font-normal`}
                  style={{
                    fontSize: "clamp(2rem, 4.8vw, 3.75rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.025em",
                    color: "#F5F6FA",
                  }}
                >
                  Tudo em três passos,
                  <br />
                  <span className="italic" style={{ color: P.gold }}>
                    sem esforço.
                  </span>
                </h2>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
                  Ferramentas exclusivas para que você nunca mais pague caro em
                  itens essenciais.
                </p>
              </div>
              <div className="hidden h-px flex-1 md:mx-10 md:mb-3 md:block" style={{ background: "rgb(255 255 255 / 0.08)" }} />
            </div>

            <div className="grid gap-5 md:grid-cols-3 md:gap-8">
              <ExploreCard
                to="/melhores-precos"
                number="01"
                title="Ranking Geral"
                desc="Compare o valor total da cesta básica entre todos os estabelecimentos locais em segundos."
                cta="Ver rankings"
              />
              <ExploreCard
                to="/estabelecimentos"
                number="02"
                title="Todos os mercados"
                desc="Bairros, categorias e produtos disponíveis em cada estabelecimento de Feijó."
                cta="Ver mercados"
              />
              <ExploreCard
                to="/planos"
                number="03"
                title="Planos & Alertas"
                desc="Assine, receba alertas de queda e desbloqueie o histórico completo de preços."
                cta="Ver planos"
              />
            </div>
          </div>
        </div>
      </div>

      {/* -------- SOCIAL PROOF (compact) -------- */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {[
            { k: "7", l: "mercados ativos", icon: <ShieldCheck className="h-4 w-4" /> },
            { k: "500+", l: "preços por semana", icon: <TrendingDown className="h-4 w-4" /> },
            { k: "100%", l: "notas fiscais", icon: <Sparkles className="h-4 w-4" /> },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border px-4 py-4 text-center sm:py-5"
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
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-6 sm:px-10 sm:py-8"
          style={{ background: P.navy, color: "#F5F6FA" }}
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
            <div className="min-w-0">
              <h3
                className={`${serif}`}
                style={{
                  fontSize: "clamp(1.25rem, 2.6vw, 2rem)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.015em",
                }}
              >
                Nunca mais pague caro por{" "}
                <span className="italic" style={{ color: P.gold }}>
                  arroz, feijão e café.
                </span>
              </h3>
              <p className="mt-1 text-[13px] text-white/70 sm:text-[14px]">
                Cadastro em 30s · sem cartão.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/cadastro"
                className={dsx(ds.btn.base, ds.btn.sizes.md)}
                style={{ background: P.gold, color: P.navy }}
              >
                Criar conta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/resgatar"
                className={dsx(
                  ds.btn.base,
                  ds.btn.sizes.md,
                  "border border-white/30 text-[color:#F5F6FA] hover:bg-white/10",
                )}
              >
                Tenho um código
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
      className="group block rounded-[1.75rem] border p-8 transition-all duration-500 hover:-translate-y-1 lg:p-10"
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
      <div
        className={`${serif} mb-8 italic opacity-60 transition-opacity group-hover:opacity-100`}
        style={{
          color: P.gold,
          fontSize: "clamp(3rem, 5vw, 4.5rem)",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {number}
      </div>
      <h3 className="mb-4 text-2xl font-bold text-white lg:text-[26px]">{title}</h3>
      <p className="text-[15px] leading-relaxed text-white/60">{desc}</p>
      <div className="mt-8 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/80 transition-colors group-hover:text-[color:var(--pc-home-gold)]">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
