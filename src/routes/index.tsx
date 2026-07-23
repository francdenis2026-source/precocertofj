import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import heroMarket from "@/assets/hero-market.jpg";
import {
  Search,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Store,
  Sparkles,
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

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long",
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
        <img
          src={heroMarket}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.85)" }}
        />
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
            <div className={dsx(ds.chip.onDark, "text-[10.5px] uppercase tracking-[0.2em] sm:text-[11.5px]")}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: PALETTE.gold }} />
              <span className="truncate">{today || "atualizado agora"} · edição diária</span>
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
              Compare mercados de Feijó em tempo real e descubra em qual loja
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

            <div className="mt-6 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className={dsx(ds.type.overline, "mr-1 w-full text-white/70 sm:w-auto")}>
                Populares:
              </span>
              {["arroz", "feijão", "leite", "óleo", "café", "açúcar"].map((t) => (
                <button
                  key={t}
                  onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
                  className={ds.chip.onDark}
                >
                  {t}
                </button>
              ))}
            </div>



            <div className="mt-8 grid max-w-3xl grid-cols-3 gap-3 border-t border-white/15 pt-5 sm:gap-6 md:mt-12 md:pt-8">
              {[
                { k: String(stats.establishments ?? 0), l: "Mercados ativos" },
                { k: String(stats.products ?? 0), l: "Produtos catalogados" },
                { k: "24h", l: "Preços atualizados" },
              ].map((s) => (
                <div key={s.l} className="min-w-0">
                  <div
                    className={`${serif} truncate text-white`}
                    style={{
                      fontSize: "clamp(1.5rem, 3.2vw, 2.75rem)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {s.k}
                  </div>
                  <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 sm:mt-2 sm:text-[11px]">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE — três atalhos compactos para páginas internas */}
      <section className={dsx(ds.container, ds.sectionY.md)}>
        <div className="mb-5 md:mb-6">
          <div className={dsx(ds.type.overline)} style={{ color: PALETTE.navy2 }}>
            Explore
          </div>
          <h2
            className={`${serif} mt-1.5 leading-[1.05]`}
            style={{
              color: PALETTE.ink,
              letterSpacing: "-0.02em",
              fontSize: "clamp(1.6rem, 3.4vw, 2.25rem)",
            }}
          >
            Tudo que você precisa, em três passos
          </h2>
        </div>

        <div className={ds.grid.cols3}>
          <ExploreCard
            icon={<Trophy className="h-4 w-4" />}
            eyebrow="01 — Ranking"
            title="Mercados mais baratos da semana"
            desc="Veja quem está com os menores preços por categoria e produto."
            to="/melhores-precos"
            cta="Ver rankings"
          />
          <ExploreCard
            icon={<Store className="h-4 w-4" />}
            eyebrow="02 — Mercados"
            title="Todos os estabelecimentos de Feijó"
            desc="Mapa por bairro, categorias mais comuns e produtos disponíveis."
            to="/estabelecimentos"
            cta="Ver mercados"
          />
          <ExploreCard
            icon={<Sparkles className="h-4 w-4" />}
            eyebrow="03 — Planos"
            title="Assine e economize todo mês"
            desc="Alertas de preço, listas ilimitadas e ferramenta de comparação premium."
            to="/planos"
            cta="Ver planos"
          />
        </div>
      </section>


      {/* CTA FINAL — compacto */}
      <section className={dsx(ds.container, "pb-14 md:pb-20")}>
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white sm:p-7 md:p-10"
          style={{ background: `linear-gradient(140deg, ${PALETTE.navy} 0%, ${PALETTE.navy2} 100%)` }}
        >
          <div
            className="pointer-events-none absolute -right-10 -bottom-10 h-52 w-52 rounded-full"
            style={{ background: `radial-gradient(circle, ${PALETTE.gold}55 0%, transparent 70%)` }}
          />
          <div className="relative grid grid-cols-1 items-center gap-5 md:grid-cols-[1fr_auto] md:gap-8">
            <div>
              <div className={dsx(ds.chip.onDark, "text-[10px] uppercase tracking-[0.16em]")}>
                <ShieldCheck className="h-3 w-3" style={{ color: PALETTE.goldSoft }} />
                Dados verificados por nota fiscal
              </div>
              <h3
                className={`${serif} mt-3 leading-[1.08]`}
                style={{
                  fontSize: "clamp(1.45rem, 3vw, 2.2rem)",
                  letterSpacing: "-0.015em",
                }}
              >
                Nunca mais pague caro por{" "}
                <span className="italic" style={{ color: PALETTE.goldSoft }}>arroz, feijão e café.</span>
              </h3>
              <p className="mt-2 max-w-xl text-[13px] text-white/80 sm:text-[13.5px]">
                Cadastro em 30 segundos. Sem cartão. Cancele quando quiser.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Link
                to="/cadastro"
                className={dsx(ds.btn.base, ds.btn.sizes.md)}
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Criar conta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/resgatar"
                className={dsx(ds.btn.base, ds.btn.sizes.md, "border border-white/35 text-white hover:bg-white/10")}
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
  icon, eyebrow, title, desc, to, cta,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  desc: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className={dsx("group relative flex flex-col overflow-hidden", ds.card.paddedHover)}
      style={{ borderColor: PALETTE.line }}
    >
      <div
        className="absolute right-0 top-0 h-16 w-16"
        style={{ background: `radial-gradient(circle at top right, ${PALETTE.gold}22 0%, transparent 70%)` }}
      />
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: PALETTE.navy2 }}>
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${PALETTE.gold}22`, color: PALETTE.gold }}>
          {icon}
        </span>
        {eyebrow}
      </div>
      <div
        className={`${serif} mt-3 leading-[1.15]`}
        style={{
          color: PALETTE.ink,
          letterSpacing: "-0.01em",
          fontSize: "clamp(1.2rem, 2.2vw, 1.5rem)",
        }}
      >
        {title}
      </div>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed" style={{ color: PALETTE.navy2 }}>
        {desc}
      </p>
      <div className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: PALETTE.navy }}>
        {cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
