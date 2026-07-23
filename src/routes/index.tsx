import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import heroMarket from "@/assets/home-hero.jpg?w=640;960;1280;1600;1920&format=avif;webp;jpg&as=picture";
// LCP preload usa a menor variante AVIF (mobile-first); o <picture> abaixo negocia o resto.
import heroPreloadAvif from "@/assets/home-hero.jpg?w=1280&format=avif&url";
import exploreBg from "@/assets/explore-bg.jpg";
import {
  Search,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Store,
  Trophy,
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

/* Design tokens — Navy Trust, contrastes reforçados */
const PALETTE = {
  paper: "#f5f6fa",
  ink: "#08122a",       // ~19:1 sobre paper
  navy: "#0f1b3d",
  navy2: "#324c73",     // ~7.4:1 sobre paper (AA large + body)
  gold: "#b58a3c",
  goldSoft: "#f2dfa8",  // hero (fundo escuro)
  line: "#dfe3ec",
};

const themeVars: React.CSSProperties = {
  ["--nt-paper" as any]: PALETTE.paper,
  ["--nt-ink" as any]: PALETTE.ink,
  ["--nt-navy" as any]: PALETTE.navy,
  ["--nt-gold" as any]: PALETTE.gold,
  fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
  color: PALETTE.ink,
};

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const sans = "font-['Work_Sans',system-ui,sans-serif]";

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [today, setToday] = useState<string>("");
  const [todayShort, setTodayShort] = useState<string>("");

  useEffect(() => {
    const d = new Date();
    setToday(
      d.toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long",
      }),
    );
    setTodayShort(
      d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
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
    <div style={themeVars} className="min-h-screen w-full antialiased">
      {/* Ambient paper background */}
      <div className="fixed inset-0 -z-10" style={{ background: PALETTE.paper }}>
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${PALETTE.navy} 1px, transparent 0)`,
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      {/* HEADER */}
      <SiteHeader variant="overlay" />

      {/* HERO */}
      <section className="relative isolate w-full overflow-hidden" style={{ minHeight: "min(92vh, 880px)" }}>
        <picture>
          {Object.entries(heroMarket.sources).map(([type, srcset]) => (
            <source
              key={type}
              type={`image/${type}`}
              srcSet={srcset}
              sizes="100vw"
            />
          ))}
          <img
            src={heroMarket.img.src}
            width={heroMarket.img.w}
            height={heroMarket.img.h}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "saturate(0.85)" }}
          />
        </picture>
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, ${PALETTE.navy}f5 0%, ${PALETTE.navy}d9 45%, ${PALETTE.navy}f7 100%),` +
              `radial-gradient(80% 60% at 15% 40%, ${PALETTE.gold}22 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: "3px 3px",
          }}
        />

        <div
          className={dsx("relative z-10 flex flex-col justify-end pb-12 pt-24 sm:pt-28 md:pt-40 md:pb-20", ds.container)}
          style={{ minHeight: "min(92vh, 880px)" }}
        >
          <div className="max-w-4xl">
            <div className={dsx(ds.chip.onDark, "max-w-full text-[10.5px] uppercase tracking-[0.18em] sm:text-[11.5px]")}>
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ background: PALETTE.gold }} />
              <span className="min-w-0 truncate">
                <span className="sm:hidden">{todayShort || "hoje"} · edição diária</span>
                <span className="hidden sm:inline">{today || "atualizado agora"} · edição diária</span>
              </span>
            </div>


            <h1
              className={`${serif} mt-5 font-normal text-white sm:mt-6 md:mt-8`}
              style={{
                fontSize: "clamp(2.25rem, 7.5vw, 7rem)",
                lineHeight: 0.96,
                letterSpacing: "-0.03em",
              }}
            >
              O preço certo,
              <br />
              <span className="italic" style={{ color: PALETTE.goldSoft }}>
                onde você compra.
              </span>
            </h1>

            <p
              className="mt-5 max-w-2xl text-white/90 sm:mt-6 md:mt-8"
              style={{ fontSize: "clamp(0.98rem, 1.4vw, 1.25rem)", lineHeight: 1.55 }}
            >
              Compare mercados de Feijó em tempo real e descubra em qual mercado
              sua cesta sai mais barata — com dados atualizados pela própria
              comunidade.
            </p>

            {/* Busca — pill unificado, botão embutido */}
            <form onSubmit={submitSearch} className="mt-6 max-w-2xl sm:mt-8">
              <div
                className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 p-1.5 backdrop-blur-xl transition-all focus-within:border-white/60 focus-within:bg-white/15 sm:p-2"
              >
                <span className="pointer-events-none pl-3 sm:pl-4">
                  <Search className="h-5 w-5 text-white/90" strokeWidth={2.4} aria-hidden />
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  type="search"
                  inputMode="search"
                  placeholder="Buscar: arroz, café, leite…"
                  aria-label="Buscar produto"
                  className={dsx(sans, ds.input.onDark)}
                />
                <button
                  type="submit"
                  aria-label="Buscar"
                  className={dsx(ds.btn.base, ds.btn.sizes.md, "shrink-0 shadow-md")}
                  style={{ background: PALETTE.gold, color: PALETTE.navy }}
                >
                  <span className="hidden sm:inline">Buscar</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/cadastro"
                className={dsx("group", ds.btn.base, ds.btn.sizes.lg, "shadow-xl")}
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Começar grátis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/melhores-precos"
                className={dsx(ds.btn.base, ds.btn.sizes.lg, ds.btn.variants.outlineOnDark)}
              >
                <TrendingDown className="h-4 w-4" />
                Ver rankings
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="mr-1 w-full text-[11px] font-bold uppercase tracking-[0.24em] text-white/80 sm:w-auto">
                Populares:
              </span>
              {["arroz", "feijão", "leite", "óleo", "café", "açúcar"].map((t) => (
                <button
                  key={t}
                  onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[14px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15"
                >
                  {t}
                </button>
              ))}
            </div>



            <div className="mt-10 grid max-w-3xl grid-cols-3 gap-4 border-t border-white/15 pt-6 sm:gap-8 md:mt-14 md:pt-9">
              {[
                { k: String(stats.establishments ?? 0), l: "Mercados ativos" },
                { k: String(stats.products ?? 0), l: "Produtos catalogados" },
                { k: "24h", l: "Preços atualizados" },
              ].map((s) => (
                <div key={s.l} className="min-w-0">
                  <div
                    className="truncate font-semibold text-white tabular-nums"
                    style={{
                      fontSize: "clamp(2rem, 4.2vw, 3.25rem)",
                      letterSpacing: "-0.035em",
                      lineHeight: 0.95,
                      fontFeatureSettings: '"tnum","lnum"',
                    }}
                  >
                    {s.k}
                  </div>
                  <div className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/85 sm:mt-3 sm:text-[12px]">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE — seção premium com fundo cinematográfico */}
      <section
        className="relative overflow-hidden"
        style={{ background: PALETTE.navy }}
      >
        {/* Imagem de fundo profissional */}
        <img
          src={exploreBg}
          alt=""
          aria-hidden
          loading="lazy"
          width={1920}
          height={1080}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
        />
        {/* Overlays: gradiente + textura de grid sutil */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${PALETTE.navy}f2 0%, ${PALETTE.navy}cc 45%, ${PALETTE.navy}f5 100%)`,
          }}
        />
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="explore-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke={PALETTE.goldSoft} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#explore-grid)" />
        </svg>
        {/* Halo dourado */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${PALETTE.gold}33 0%, transparent 65%)` }}
        />

        <div className={dsx(ds.container, "relative py-10 md:py-20")}>
          {/* Cabeçalho editorial */}
          <div className="mx-auto mb-6 max-w-2xl text-center md:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 backdrop-blur">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: PALETTE.gold, boxShadow: `0 0 12px ${PALETTE.gold}` }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: PALETTE.goldSoft }}
              >
                Explore a plataforma
              </span>
            </div>
            <h2
              className={`${serif} mt-3 text-white leading-[0.98] md:mt-4`}
              style={{
                letterSpacing: "-0.03em",
                fontSize: "clamp(1.6rem, 5vw, 3.75rem)",
              }}
            >
              Tudo que você precisa,{" "}
              <span className="italic" style={{ color: PALETTE.goldSoft }}>
                em três passos.
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-white/80 sm:text-[15px] md:mt-4">
              Ranking, mercados e planos — enxuto, tipografado e feito para
              decidir rápido.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-5">
            <ExploreCard
              number="01"
              kicker="Ranking"
              title="Mercados mais baratos da semana"
              desc="Quem tem os menores preços por categoria, com evolução semanal."
              to="/melhores-precos"
              cta="Ver rankings"
              svg={<TrophyMark />}
            />
            <ExploreCard
              number="02"
              kicker="Mercados"
              title="Todos os estabelecimentos de Feijó"
              desc="Bairros, categorias mais comuns e produtos disponíveis."
              to="/estabelecimentos"
              cta="Ver mercados"
              svg={<StoreMark />}
            />
            <ExploreCard
              number="03"
              kicker="Planos"
              title="Assine e economize todo mês"
              desc="Alertas de preço, listas ilimitadas e comparador premium."
              to="/planos"
              cta="Ver planos"
              svg={<SparkleMark />}
            />
          </div>
        </div>
      </section>



      {/* PROVA SOCIAL — mobile-first, compacta */}
      <section className={dsx(ds.container, "pt-6 md:pt-10")}>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {[
            { k: "7", l: "mercados" },
            { k: "500+", l: "preços/semana" },
            { k: "100%", l: "notas fiscais" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl border px-2.5 py-2.5 text-center md:px-4 md:py-3"
              style={{ borderColor: PALETTE.line, background: "#ffffff" }}
            >
              <div
                className={`${serif} tabular-nums`}
                style={{
                  color: PALETTE.navy,
                  fontSize: "clamp(1.25rem, 3.6vw, 1.75rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.k}
              </div>
              <div
                className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] md:text-[11px]"
                style={{ color: PALETTE.navy2 }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL — hierarquia refinada no mobile */}
      <section className={dsx(ds.container, "py-5 md:py-10")}>
        <div
          className="relative overflow-hidden rounded-2xl px-4 py-4 text-white sm:px-7 sm:py-6 md:px-9 md:py-7"
          style={{ background: `linear-gradient(140deg, ${PALETTE.navy} 0%, ${PALETTE.navy2} 100%)` }}
        >
          <div
            className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full"
            style={{ background: `radial-gradient(circle, ${PALETTE.gold}55 0%, transparent 70%)` }}
          />
          <div className="relative grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
            <div className="min-w-0">
              <h3
                className={`${serif} text-white`}
                style={{
                  fontSize: "clamp(1.1rem, 2.6vw, 1.95rem)",
                  lineHeight: 1.12,
                  letterSpacing: "-0.015em",
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                }}
              >
                Nunca mais pague caro por{" "}
                <span className="italic font-semibold" style={{ color: "#F5D77A" }}>arroz, feijão e café.</span>
              </h3>
              <p className="mt-1 text-[11.5px] leading-tight text-white/85 sm:text-[13px]">
                Cadastro em 30s · sem cartão.
              </p>
            </div>
            <div className="flex w-full flex-row gap-2 md:w-auto md:flex-col md:items-stretch">
              <Link
                to="/cadastro"
                className={dsx(ds.btn.base, ds.btn.sizes.sm, "flex-1 md:flex-none md:px-5 md:py-2.5 md:text-[15px]")}
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Criar conta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/resgatar"
                className={dsx(ds.btn.base, ds.btn.sizes.sm, "flex-1 border border-white/35 text-white hover:bg-white/10 md:flex-none md:px-5 md:py-2.5 md:text-[15px]")}
              >
                Tenho um código
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}


function ExploreCard({
  number, kicker, title, desc, to, cta, svg,
}: {
  number: string;
  kicker: string;
  title: string;
  desc: string;
  to: string;
  cta: string;
  svg: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/12 bg-white/[0.05] p-3.5 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/[0.08] md:flex-col md:items-stretch md:gap-0 md:rounded-2xl md:p-7 md:hover:-translate-y-1"
    >
      {/* Glow no hover (só desktop) */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 hidden h-40 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 md:block"
        style={{ background: `radial-gradient(60% 100% at 50% 100%, ${PALETTE.gold}44 0%, transparent 70%)` }}
      />

      {/* Selo — compacto no mobile, grande no desktop */}
      <div
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/15 md:mb-6 md:h-14 md:w-14 md:rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${PALETTE.gold}22 0%, ${PALETTE.gold}08 100%)`,
          color: PALETTE.goldSoft,
        }}
      >
        {svg}
      </div>

      {/* Número decorativo — só desktop */}
      <span
        className={`${serif} absolute right-6 top-6 hidden text-[42px] leading-none md:block`}
        style={{ color: `${PALETTE.goldSoft}55`, letterSpacing: "-0.04em" }}
      >
        {number}
      </span>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 md:flex-none">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.24em] md:mt-0 md:text-[11px] md:tracking-[0.28em]"
          style={{ color: PALETTE.goldSoft }}
        >
          <span className={`${serif} mr-1.5 not-italic md:hidden`} style={{ color: `${PALETTE.goldSoft}99` }}>
            {number}
          </span>
          {kicker}
        </div>
        <h3
          className="mt-0.5 font-semibold text-white md:mt-2.5"
          style={{
            letterSpacing: "-0.02em",
            fontSize: "clamp(0.98rem, 1.9vw, 1.65rem)",
            lineHeight: 1.22,
          }}
        >
          {title}
        </h3>
        <p className="mt-1 hidden text-[14px] leading-[1.6] text-white/85 md:mt-3 md:block md:flex-1">
          {desc}
        </p>
      </div>

      {/* Chevron — mobile */}
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/25 md:hidden">
        <ArrowRight className="h-4 w-4 text-white" />
      </span>

      {/* Rodapé com CTA — desktop */}
      <div className="mt-6 hidden items-center justify-between border-t border-white/10 pt-4 md:flex">
        <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-white">
          {cta}
        </span>
        <span
          className="grid h-8 w-8 place-items-center rounded-full border border-white/25 transition-all duration-300 group-hover:border-transparent"
          style={{ background: "transparent" }}
        >
          <ArrowRight className="h-4 w-4 text-white transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/* ------ SVG marks editoriais ------ */
function TrophyMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" />
      <path d="M6 6H3v2a3 3 0 0 0 3 3" />
      <path d="M18 6h3v2a3 3 0 0 1-3 3" />
      <path d="M10 15h4v3h-4z" />
      <path d="M8 21h8" />
      <path d="M12 18v3" />
    </svg>
  );
}
function StoreMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9 5 4h14l2 5" />
      <path d="M3 9v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9" />
      <path d="M5 13v7h14v-7" />
      <path d="M10 20v-4h4v4" />
    </svg>
  );
}
function SparkleMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 7c1 3 2 4 5 5-3 1-4 2-5 5-1-3-2-4-5-5 3-1 4-2 5-5Z" />
    </svg>
  );
}

