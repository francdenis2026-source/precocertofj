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

/* Design tokens — Navy Trust */
const PALETTE = {
  paper: "#f6f7fb",
  ink: "#0a1631",
  navy: "#0f1b3d",
  navy2: "#1e3a5f",
  gold: "#b58a3c",
  goldSoft: "#e6d6a8",
  line: "#e4e7ee",
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
const mono = "font-['IBM_Plex_Mono',ui-monospace,monospace] tabular-nums";

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
    <div style={themeVars} className="min-h-screen w-full">
      {/* Ambient paper background */}
      <div className="fixed inset-0 -z-10" style={{ background: PALETTE.paper }}>
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${PALETTE.navy} 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* HEADER */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 md:flex md:justify-between md:px-8 md:py-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[16px] font-bold shadow-lg md:h-12 md:w-12"
              style={{ background: PALETTE.gold, color: PALETTE.navy }}
            >
              P
            </span>
            <div className="flex min-w-0 flex-col leading-none">
              <span className={`${serif} truncate text-[22px] font-normal text-white md:text-[26px]`}>
                Preço<span className="italic" style={{ color: PALETTE.goldSoft }}>Certo</span>
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                Feijó · Acre
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-9 text-[14px] font-medium text-white/85">
            <Link to="/buscar" className="hover:text-white transition-colors">Buscar</Link>
            <Link to="/melhores-precos" className="hover:text-white transition-colors">Rankings</Link>
            <Link to="/estabelecimentos" className="hover:text-white transition-colors">Mercados</Link>
            <Link to="/planos" className="hover:text-white transition-colors">Planos</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center rounded-lg px-4 py-2.5 text-[14px] font-medium text-white/90 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="inline-flex items-center rounded-lg px-4 py-2.5 text-[14px] font-semibold shadow-md transition-all hover:opacity-90 md:px-5 md:py-3"
              style={{ background: PALETTE.gold, color: PALETTE.navy }}
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative isolate w-full overflow-hidden" style={{ minHeight: "min(94vh, 900px)" }}>
        <img
          src={heroMarket}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.9)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, ${PALETTE.navy}f2 0%, ${PALETTE.navy}cc 40%, ${PALETTE.navy}f5 100%),` +
              `radial-gradient(80% 60% at 15% 40%, ${PALETTE.gold}22 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: "3px 3px",
          }}
        />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-14 pt-32 md:px-8 md:pt-44 md:pb-20" style={{ minHeight: "min(94vh, 900px)" }}>
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur md:text-[12px]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: PALETTE.gold }} />
              {today || "atualizado agora"} · edição diária
            </div>

            <h1
              className={`${serif} mt-6 font-normal text-white md:mt-8`}
              style={{ fontSize: "clamp(2.75rem, 9vw, 7.5rem)", lineHeight: 0.94, letterSpacing: "-0.035em" }}
            >
              O preço certo,
              <br />
              <span className="italic" style={{ color: PALETTE.goldSoft }}>
                onde você compra.
              </span>
            </h1>

            <p
              className="mt-6 max-w-2xl text-white/85 md:mt-8"
              style={{ fontSize: "clamp(1.05rem, 1.6vw, 1.375rem)", lineHeight: 1.5 }}
            >
              Compare mercados de Feijó em tempo real e descubra em qual loja
              sua cesta sai mais barata — com dados atualizados pela própria
              comunidade.
            </p>

            {/* Busca — lupa sempre visível */}
            <form onSubmit={submitSearch} className="relative mt-8 max-w-2xl md:mt-10">
              <span className="pointer-events-none absolute left-4 top-4 z-10 sm:left-5 sm:top-1/2 sm:-translate-y-1/2">
                <Search className="h-5 w-5 text-white" strokeWidth={2.4} aria-hidden />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="search"
                inputMode="search"
                placeholder="Buscar: arroz, café, leite…"
                aria-label="Buscar produto"
                className={`${sans} w-full rounded-2xl border border-white/25 bg-white/10 py-4 pl-12 pr-4 text-[16px] text-white outline-none backdrop-blur-xl transition-all placeholder:text-white/60 focus:border-white/60 focus:bg-white/15 sm:py-5 sm:pl-14 sm:pr-40`}
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold shadow-lg transition-transform hover:scale-[1.02] sm:absolute sm:right-2 sm:top-1/2 sm:mt-0 sm:w-auto sm:-translate-y-1/2"
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Buscar <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/cadastro"
                className="group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-[15px] font-bold shadow-xl transition-all hover:scale-[1.02] sm:text-[16px]"
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Começar grátis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/melhores-precos"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/40 bg-white/5 px-6 py-4 text-[15px] font-semibold text-white backdrop-blur transition-all hover:border-white hover:bg-white/15 sm:text-[16px]"
              >
                <TrendingDown className="h-4 w-4" />
                Ver rankings
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                Populares:
              </span>
              {["arroz", "feijão", "leite", "óleo", "café", "açúcar"].map((t) => (
                <button
                  key={t}
                  onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
                  className="rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-white/90 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-3 gap-4 border-t border-white/15 pt-6 sm:gap-6 md:mt-14 md:pt-8">
              {[
                { k: String(stats.establishments ?? 0), l: "Mercados ativos" },
                { k: String(stats.products ?? 0), l: "Produtos catalogados" },
                { k: "24h", l: "Preços atualizados" },
              ].map((s) => (
                <div key={s.l}>
                  <div
                    className={`${serif} text-white`}
                    style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1 }}
                  >
                    {s.k}
                  </div>
                  <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-[11px]">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE — três atalhos compactos para páginas internas */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: PALETTE.navy2 }}>
              Explore
            </div>
            <h2 className={`${serif} mt-1 text-[26px] leading-tight md:text-[32px]`} style={{ color: PALETTE.ink, letterSpacing: "-0.02em" }}>
              Tudo que você precisa, em três passos
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white md:p-10"
          style={{ background: `linear-gradient(140deg, ${PALETTE.navy} 0%, ${PALETTE.navy2} 100%)` }}
        >
          <div
            className="pointer-events-none absolute -right-10 -bottom-10 h-52 w-52 rounded-full"
            style={{ background: `radial-gradient(circle, ${PALETTE.gold}55 0%, transparent 70%)` }}
          />
          <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                <ShieldCheck className="h-3 w-3" style={{ color: PALETTE.goldSoft }} />
                Dados verificados por nota fiscal
              </div>
              <h3 className={`${serif} mt-3 text-[clamp(1.6rem,3vw,2.2rem)] leading-tight`}>
                Nunca mais pague caro por{" "}
                <span className="italic" style={{ color: PALETTE.goldSoft }}>arroz, feijão e café.</span>
              </h3>
              <p className="mt-2 max-w-xl text-[13.5px] text-white/75">
                Cadastro em 30 segundos. Sem cartão. Cancele quando quiser.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-bold transition-transform hover:scale-[1.02]"
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Criar conta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/resgatar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-[14px] font-semibold text-white hover:bg-white/10"
              >
                Tenho um código
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t px-4 py-6 text-[12px] md:px-8"
        style={{ borderColor: PALETTE.line, color: PALETTE.navy2 }}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded text-[10px] font-bold text-white" style={{ background: PALETTE.navy }}>
            P
          </span>
          <span className={serif} style={{ color: PALETTE.ink }}>PreçoCerto</span>
          <span>·</span>
          <span>Feito em Feijó · Acre</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/melhores-precos" className="hover:text-[color:var(--nt-ink)]">Rankings</Link>
          <Link to="/estabelecimentos" className="hover:text-[color:var(--nt-ink)]">Mercados</Link>
          <Link to="/planos" className="hover:text-[color:var(--nt-ink)]">Planos</Link>
          <Link to="/colaborar" className="hover:text-[color:var(--nt-ink)]">Colaborar</Link>
          <Link to="/privacidade" className="hover:text-[color:var(--nt-ink)]">Privacidade</Link>
        </div>
      </footer>
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md md:p-6"
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
      <div className={`${serif} mt-3 text-[22px] leading-tight`} style={{ color: PALETTE.ink, letterSpacing: "-0.01em" }}>
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
