import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import heroMarket from "@/assets/hero-market.jpg";
import {
  Search,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  ReceiptText,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import {
  listPublicStores,
  getPlatformStats,
  getCheapestStoresRanking,
  type PublicStore,
  type CheapestStoreRank,
} from "@/lib/stores-public.functions";
import { Trophy } from "lucide-react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PreçoCerto — Comparador inteligente de mercados em Feijó/AC" },
      {
        name: "description",
        content:
          "Compare preços de supermercados em Feijó em tempo real. Cesta básica, quedas do dia, mercados próximos e economia real por família — direto no seu celular.",
      },
      { property: "og:title", content: "PreçoCerto — Comparador inteligente de mercados" },
      {
        property: "og:description",
        content:
          "Cesta básica, quedas do dia e mercados próximos de Feijó/AC. Economize a cada compra com dados atualizados pela comunidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

/* ================================================================== */
/*  DESIGN TOKENS — Navy Trust (escopo local)                          */
/* ================================================================== */
const PALETTE = {
  paper: "#f6f7fb",
  ink: "#0a1631",
  navy: "#0f1b3d",
  navy2: "#1e3a5f",
  azure: "#3b6fa0",
  gold: "#b58a3c",
  goldSoft: "#e6d6a8",
  line: "#e4e7ee",
};

const themeVars: React.CSSProperties = {
  ["--nt-paper" as any]: PALETTE.paper,
  ["--nt-ink" as any]: PALETTE.ink,
  ["--nt-navy" as any]: PALETTE.navy,
  ["--nt-navy-2" as any]: PALETTE.navy2,
  ["--nt-azure" as any]: PALETTE.azure,
  ["--nt-gold" as any]: PALETTE.gold,
  ["--nt-gold-soft" as any]: PALETTE.goldSoft,
  ["--nt-line" as any]: PALETTE.line,
  fontFamily: "'Work Sans', system-ui, -apple-system, sans-serif",
  color: PALETTE.ink,
};

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const sans = "font-['Work_Sans',system-ui,sans-serif]";
const mono = "font-['IBM_Plex_Mono',ui-monospace,monospace] tabular-nums";

/* ================================================================== */
/*  MOCK LIVE DATA (banco vazio hoje — placeholders realistas)         */
/* ================================================================== */
type Drop = { name: string; store: string; from: number; to: number; ago: string };
const LIVE_DROPS: Drop[] = [
  { name: "Arroz Tio Urbano 5kg", store: "Mercado Central", from: 32.9, to: 24.5, ago: "2 min" },
  { name: "Feijão Carioca 1kg", store: "Super Feijó", from: 9.2, to: 7.45, ago: "6 min" },
  { name: "Óleo de Soja 900ml", store: "Mercado Central", from: 8.1, to: 6.8, ago: "11 min" },
  { name: "Leite Integral 1L", store: "Super Econômico", from: 6.5, to: 5.2, ago: "24 min" },
  { name: "Café Torrado 500g", store: "Mercado Central", from: 22.0, to: 18.9, ago: "32 min" },
];

const SECTORS = [
  { label: "Hortifruti", slug: "hortifruti", delta: -12 },
  { label: "Mercearia", slug: "mercearia", delta: -6 },
  { label: "Laticínios", slug: "laticinios", delta: -3 },
  { label: "Limpeza", slug: "limpeza", delta: -8 },
  { label: "Higiene", slug: "higiene", delta: -5 },
  { label: "Bebidas", slug: "bebidas", delta: 0 },
];

const FALLBACK_KPIS = [
  { label: "Cesta básica", value: "—", delta: 0, sub: "aguardando dados" },
  { label: "Maior queda 7 d", value: "—", delta: 0, sub: "aguardando dados" },
  { label: "Mercados ativos", value: "0", delta: 0, sub: "coletando agora" },
  { label: "Produtos catalogados", value: "0", delta: 0, sub: "no catálogo" },
];

const PLACEHOLDER_STORES = [
  { id: "demo-1", name: "Mercado Central", neighborhood: "Centro · 0.8 km", best_items: 142 },
  { id: "demo-2", name: "Super Feijó", neighborhood: "Cidade Nova · 2.1 km", best_items: 98 },
  { id: "demo-3", name: "Super Econômico", neighborhood: "Vila Nova · 1.4 km", best_items: 76 },
  { id: "demo-4", name: "Mini Preço", neighborhood: "Centro · 0.5 km", best_items: 61 },
];

/* ================================================================== */
/*  HOMEPAGE — Editorial Bento (Navy Trust)                            */
/* ================================================================== */
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

  const listStores = useServerFn(listPublicStores);
  const platformStats = useServerFn(getPlatformStats);
  const cheapestRanking = useServerFn(getCheapestStoresRanking);

  const storesQ = useQuery({
    queryKey: ["home-stores"],
    queryFn: () => listStores({ data: { limit: 6 } as any }),
    staleTime: 60_000,
  });
  const statsQ = useQuery({
    queryKey: ["home-stats"],
    queryFn: () => platformStats({} as any),
    staleTime: 60_000,
  });
  const rankingQ = useQuery({
    queryKey: ["home-ranking"],
    queryFn: () => cheapestRanking({} as any),
    staleTime: 60_000,
  });
  const rankingRows: CheapestStoreRank[] = ((rankingQ.data as any)?.rows ?? []).slice(0, 3);


  const stores: PublicStore[] = (storesQ.data as any) ?? [];
  const displayStores = stores.length ? stores.slice(0, 4) : PLACEHOLDER_STORES;

  const stats: any = statsQ.data ?? {};
  const KPIS = [
    FALLBACK_KPIS[0],
    FALLBACK_KPIS[1],
    {
      label: "Mercados ativos",
      value: String(stats.establishments ?? 0),
      delta: 0,
      sub: "no catálogo",
    },
    {
      label: "Produtos catalogados",
      value: String(stats.products ?? 0),
      delta: 0,
      sub: "verificados",
    },
  ];

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  return (
    <div style={themeVars} className="min-h-screen w-full" >
      {/* Ambient paper background */}
      <div className="fixed inset-0 -z-10" style={{ background: PALETTE.paper }}>
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${PALETTE.navy} 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[420px] opacity-70"
          style={{
            background:
              `radial-gradient(80% 60% at 50% 0%, ${PALETTE.goldSoft}22 0%, transparent 65%)`,
          }}
        />
      </div>

      {/* ============== HEADER (glass over hero) ============== */}
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
            <Link to="/colaborar" className="hover:text-white transition-colors">Colaborar</Link>
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

      {/* ============== CINEMATIC HERO ============== */}
      <section className="relative isolate w-full overflow-hidden" style={{ minHeight: "min(92vh, 880px)" }}>
        {/* Background image */}
        <img
          src={heroMarket}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.9)" }}
        />
        {/* Cinematic gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, ${PALETTE.navy}f2 0%, ${PALETTE.navy}cc 40%, ${PALETTE.navy}f5 100%),` +
              `radial-gradient(80% 60% at 15% 40%, ${PALETTE.gold}22 0%, transparent 60%)`,
          }}
        />
        {/* Subtle grain */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: "3px 3px",
          }}
        />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-14 pt-32 md:px-8 md:pt-44 md:pb-20" style={{ minHeight: "min(92vh, 880px)" }}>
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur md:text-[12px]"
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: PALETTE.gold }}
              />
              {today || "atualizado agora"} · edição diária
            </div>

            {/* Título — responsivo grande */}
            <h1
              className={`${serif} mt-6 font-normal text-white md:mt-8`}
              style={{
                fontSize: "clamp(2.75rem, 9vw, 7.5rem)",
                lineHeight: 0.94,
                letterSpacing: "-0.035em",
              }}
            >
              O preço certo,
              <br />
              <span className="italic" style={{ color: PALETTE.goldSoft }}>
                onde você compra.
              </span>
            </h1>

            {/* Subtítulo — legível em mobile */}
            <p
              className="mt-6 max-w-2xl text-white/85 md:mt-8"
              style={{ fontSize: "clamp(1.15rem, 1.6vw, 1.375rem)", lineHeight: 1.5 }}
            >
              Compare mercados de Feijó em tempo real, acompanhe as quedas do
              dia e descubra em qual loja sua cesta sai mais barata — com dados
              atualizados pela própria comunidade.
            </p>

            {/* Busca */}
            <form onSubmit={submitSearch} className="relative mt-8 max-w-2xl md:mt-10">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/70" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="text"
                placeholder="Buscar produto: arroz, café, leite…"
                aria-label="Buscar produto"
                className={`${sans} w-full rounded-2xl border border-white/20 bg-white/10 py-4 pl-14 pr-4 text-[16px] text-white outline-none backdrop-blur-xl transition-all placeholder:text-white/60 focus:border-white/50 focus:bg-white/15 sm:py-5 sm:pr-40`}
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold shadow-lg transition-transform hover:scale-[1.02] sm:absolute sm:right-2 sm:top-1/2 sm:mt-0 sm:w-auto sm:-translate-y-1/2 sm:py-3"
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Buscar <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* CTA principal + secundário — bloco marcante */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:mt-10">
              <Link
                to="/cadastro"
                className="group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-[15px] font-bold shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl sm:px-7 sm:text-[16px]"
                style={{ background: PALETTE.gold, color: PALETTE.navy }}
              >
                Começar grátis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/melhores-precos"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/40 bg-white/5 px-6 py-4 text-[15px] font-semibold text-white backdrop-blur transition-all hover:border-white hover:bg-white/15 sm:px-7 sm:text-[16px]"
              >
                <TrendingDown className="h-4 w-4" />
                Ver rankings do dia
              </Link>
              <div className="hidden items-center gap-1.5 pl-2 text-[12.5px] font-medium text-white/70 sm:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: PALETTE.goldSoft }} />
                Sem cartão · Cancela quando quiser
              </div>
            </div>

            {/* Buscas populares */}
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

            {/* Hero mini stats */}
            <div className="mt-12 grid max-w-3xl grid-cols-3 gap-4 border-t border-white/15 pt-8 sm:gap-6 md:mt-14">
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

        {/* Scroll cue */}
        <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60 md:block">
          role para explorar ↓
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16 space-y-8">
        {/* ============== RANKINGS — mercados mais baratos ============== */}
        <section aria-labelledby="rankings-title">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: PALETTE.navy2 }}
              >
                Ranking da semana
              </div>
              <h2
                id="rankings-title"
                className={`${serif} mt-1 text-[26px] leading-tight md:text-[32px]`}
                style={{ color: PALETTE.ink, letterSpacing: "-0.02em" }}
              >
                Mercados com os melhores preços
              </h2>
            </div>
            <Link
              to="/melhores-precos"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors hover:opacity-80"
              style={{ borderColor: PALETTE.line, color: PALETTE.navy, background: "white" }}
            >
              Ver ranking completo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {rankingQ.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl border bg-white"
                  style={{ borderColor: PALETTE.line }}
                />
              ))}
            </div>
          ) : rankingRows.length === 0 ? (
            <div
              className="rounded-2xl border bg-white p-6 text-center text-[13px]"
              style={{ borderColor: PALETTE.line, color: PALETTE.navy2 }}
            >
              Ainda coletando comparações. O ranking aparece quando houver produtos disputados entre mercados.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {rankingRows.map((r, i) => {
                const medal = ["#b58a3c", "#8a94a6", "#a97142"][i] ?? PALETTE.navy2;
                return (
                  <Link
                    key={r.establishmentId}
                    to="/melhores-precos"
                    className="group relative overflow-hidden rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderColor: PALETTE.line }}
                  >
                    <div
                      className="absolute right-0 top-0 h-16 w-16"
                      style={{
                        background: `radial-gradient(circle at top right, ${medal}22 0%, transparent 70%)`,
                      }}
                    />
                    <div className="flex items-start justify-between">
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: `${medal}18`, color: medal }}
                      >
                        <Trophy className="h-3 w-3" /> #{i + 1} lugar
                      </div>
                      <span
                        className={`${mono} text-[11px] font-semibold`}
                        style={{ color: "#0f7a4f" }}
                      >
                        -{r.avgSavingsPct.toFixed(1)}%
                      </span>
                    </div>

                    <div
                      className={`${serif} mt-4 truncate text-[20px] leading-tight`}
                      style={{ color: PALETTE.ink }}
                      title={r.storeName}
                    >
                      {r.storeName}
                    </div>
                    <div
                      className="mt-1 flex items-center gap-1 text-[12px]"
                      style={{ color: PALETTE.navy2 }}
                    >
                      <MapPin className="h-3 w-3" />
                      {r.city}
                      {r.state ? ` · ${r.state}` : ""}
                    </div>

                    <div className="mt-4 flex items-end justify-between border-t pt-3" style={{ borderColor: PALETTE.line }}>
                      <div>
                        <div
                          className={`${mono} text-[22px] font-semibold leading-none`}
                          style={{ color: PALETTE.ink, letterSpacing: "-0.02em" }}
                        >
                          {r.wins}
                        </div>
                        <div
                          className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: PALETTE.navy2 }}
                        >
                          menores preços
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`${mono} text-[14px] font-semibold`}
                          style={{ color: PALETTE.ink }}
                        >
                          R$ {r.avgTicketWins.toFixed(2)}
                        </div>
                        <div
                          className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: PALETTE.navy2 }}
                        >
                          ticket médio
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: PALETTE.navy }}>
                      Ver produtos <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <Link
            to="/melhores-precos"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-[14px] font-semibold sm:hidden"
            style={{ borderColor: PALETTE.line, color: PALETTE.navy, background: "white" }}
          >
            Ver ranking completo <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* ============== KPI STRIP ============== */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">


          {KPIS.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm"
              style={{ borderColor: PALETTE.line }}
            >
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: PALETTE.navy2 }}
              >
                {k.label}
              </div>
              <div
                className={`${mono} mt-2 text-[26px] font-semibold leading-none`}
                style={{ color: PALETTE.ink, letterSpacing: "-0.02em" }}
              >
                {k.value}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                {k.delta !== 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 font-semibold"
                    style={{ color: k.delta < 0 ? "#0f7a4f" : "#b3382c" }}
                  >
                    {k.delta < 0 ? (
                      <ArrowDownRight className="h-3 w-3" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3" />
                    )}
                    {Math.abs(k.delta)}%
                  </span>
                )}
                <span style={{ color: PALETTE.navy2 }}>{k.sub}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ============== BENTO GRID ============== */}
        <section className="grid grid-cols-12 gap-4">
          {/* Live drops — 7/12 */}
          <article
            className="col-span-12 rounded-2xl border bg-white lg:col-span-7"
            style={{ borderColor: PALETTE.line }}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: PALETTE.line }}
            >
              <div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: PALETTE.navy2 }}
                >
                  Live Drop Feed
                </div>
                <div className={`${serif} mt-1 text-[22px] leading-tight`} style={{ color: PALETTE.ink }}>
                  Quedas de preço nas últimas horas
                </div>
              </div>
              <span
                className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium"
                style={{ color: PALETTE.navy2 }}
              >
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: "#0f7a4f" }}
                />
                ao vivo
              </span>
            </div>
            <ul className="divide-y" style={{ borderColor: PALETTE.line }}>
              {LIVE_DROPS.map((d, i) => {
                const pct = Math.round(((d.to - d.from) / d.from) * 100);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                    style={{ borderColor: PALETTE.line }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={`${sans} truncate text-[14px] font-semibold`} style={{ color: PALETTE.ink }}>
                        {d.name}
                      </div>
                      <div className="mt-0.5 text-[12px]" style={{ color: PALETTE.navy2 }}>
                        {d.store} · {d.ago} atrás
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`${mono} text-[11px] line-through`} style={{ color: PALETTE.navy2 }}>
                        R$ {d.from.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`${mono} text-[15px] font-semibold`}
                          style={{ color: PALETTE.ink }}
                        >
                          R$ {d.to.toFixed(2)}
                        </span>
                        <span
                          className={`${mono} rounded-md px-1.5 py-0.5 text-[10px] font-bold`}
                          style={{ background: "#e7f4ee", color: "#0f7a4f" }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div
              className="flex items-center justify-between border-t px-5 py-3 text-[12px]"
              style={{ borderColor: PALETTE.line, color: PALETTE.navy2 }}
            >
              <span>Dados agregados pela comunidade.</span>
              <Link
                to="/melhores-precos"
                className="font-semibold hover:underline"
                style={{ color: PALETTE.navy }}
              >
                Ver ranking completo →
              </Link>
            </div>
          </article>

          {/* Sectores + Colabora — 5/12 */}
          <aside className="col-span-12 space-y-4 lg:col-span-5">
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: PALETTE.line }}>
              <div className="flex items-baseline justify-between">
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: PALETTE.navy2 }}
                >
                  Setores em movimento
                </div>
                <div className="text-[11px]" style={{ color: PALETTE.navy2 }}>
                  Últimos 7 d
                </div>
              </div>
              <ul className="mt-4 space-y-1">
                {SECTORS.map((s) => (
                  <li key={s.slug}>
                    <Link
                      to="/buscar"
                      search={{ cat: s.slug } as any}
                      className="group flex items-center justify-between rounded-md px-2.5 py-2 text-[13px] transition-colors hover:bg-[color:var(--nt-paper)]"
                    >
                      <span className="font-medium" style={{ color: PALETTE.ink }}>
                        {s.label}
                      </span>
                      <span
                        className={`${mono} inline-flex items-center gap-0.5 text-[12px] font-semibold`}
                        style={{
                          color:
                            s.delta === 0 ? PALETTE.navy2 : s.delta < 0 ? "#0f7a4f" : "#b3382c",
                        }}
                      >
                        {s.delta === 0 ? (
                          "—"
                        ) : (
                          <>
                            {s.delta < 0 ? (
                              <ArrowDownRight className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {Math.abs(s.delta)}%
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gold CTA — Colabora */}
            <div
              className="relative overflow-hidden rounded-2xl p-5 text-white"
              style={{
                background: `linear-gradient(140deg, ${PALETTE.navy} 0%, ${PALETTE.navy2} 100%)`,
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: PALETTE.goldSoft }}>
                  <ReceiptText className="h-3 w-3" /> Rede colaborativa
                </div>
                <div className={`${serif} mt-2 text-[24px] leading-tight`}>
                  Envie sua nota fiscal.<br />
                  <span className="italic" style={{ color: PALETTE.goldSoft }}>
                    Ganhe 30 dias grátis.
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-white/70">
                  Uma nota validada = um mês de acesso premium para você e
                  dados atualizados para toda Feijó.
                </p>
                <Link
                  to="/colaborar"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-transform hover:scale-[1.02]"
                  style={{ background: PALETTE.gold, color: PALETTE.ink }}
                >
                  Enviar nota agora <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div
                className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full"
                style={{ background: `radial-gradient(circle, ${PALETTE.gold}55 0%, transparent 70%)` }}
              />
            </div>
          </aside>
        </section>

        {/* ============== MERCADOS + PLANOS ============== */}
        <section className="grid grid-cols-12 gap-4">
          <article
            className="col-span-12 rounded-2xl border bg-white lg:col-span-7"
            style={{ borderColor: PALETTE.line }}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: PALETTE.line }}
            >
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" style={{ color: PALETTE.navy2 }} />
                <div className={`${serif} text-[20px]`} style={{ color: PALETTE.ink }}>
                  Mercados próximos
                </div>
              </div>
              <Link
                to="/mapa"
                className="text-[12px] font-semibold hover:underline"
                style={{ color: PALETTE.navy }}
              >
                Ver no mapa →
              </Link>
            </div>
            <ul className="divide-y" style={{ borderColor: PALETTE.line }}>
              {displayStores.map((s: any, i: number) => (
                <li key={s.id ?? i}>
                  <Link
                    to="/loja/$id"
                    params={{ id: String(s.id ?? "demo") }}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--nt-paper)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {s.logoUrl ? (
                        <img
                          src={s.logoUrl}
                          alt={s.name ?? "logo"}
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1"
                          style={{ background: "#fff", boxShadow: `inset 0 0 0 1px ${PALETTE.line}` }}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`${sans} grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold`}
                          style={{ background: `${PALETTE.navy}0d`, color: PALETTE.navy }}
                        >
                          {initials(s.name ?? s.label ?? "MC")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold" style={{ color: PALETTE.ink }}>
                          {s.name ?? s.label}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[12px]" style={{ color: PALETTE.navy2 }}>
                          <MapPin className="h-3 w-3" />
                          {s.neighborhood ?? s.address ?? "Feijó · AC"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`${mono} text-[13px] font-semibold`} style={{ color: PALETTE.ink }}>
                        {s.best_items ?? 60} itens
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: PALETTE.navy2 }}>
                        {i === 0 ? "melhor preço" : "monitorado"}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          {/* Planos */}
          <aside className="col-span-12 space-y-4 lg:col-span-5">
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: PALETTE.line }}>
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: PALETTE.navy2 }}
              >
                Planos flexíveis
              </div>
              <div className={`${serif} mt-1 text-[22px]`} style={{ color: PALETTE.ink }}>
                Escolha o seu ritmo
              </div>

              <div className="mt-4 space-y-2.5">
                <PlanCard
                  name="Plano Mensal"
                  price="R$ 29,90"
                  desc="30 dias · acesso completo"
                />
                <PlanCard
                  name="Plano Anual"
                  price="R$ 239,00"
                  desc="12 meses · economia de 33%"
                  highlight
                />


              </div>

              <Link
                to="/planos"
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold"
                style={{ color: PALETTE.navy }}
              >
                Ver todos os planos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Trust box */}
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: PALETTE.line }}>
              <div className="flex items-start gap-3">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ background: `${PALETTE.gold}22`, color: PALETTE.gold }}
                >
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className={`${serif} text-[17px]`} style={{ color: PALETTE.ink }}>
                    Dados verificados
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: PALETTE.navy2 }}>
                    Cada preço é confirmado por nota fiscal enviada pela comunidade,
                    revisada pela nossa equipe e datada com precisão.
                  </p>
                </div>
              </div>
              <div
                className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center"
                style={{ borderColor: PALETTE.line }}
              >
                <Stat label="Lojas" value={statsQ.data ? String((statsQ.data as any).stores ?? 0) : "0"} />
                <Stat label="Colab." value={statsQ.data ? String((statsQ.data as any).collaborators ?? 0) : "0"} />
                <Stat label="No ar" value="99,9%" />

              </div>
            </div>
          </aside>
        </section>

        {/* ============== TICKER ============== */}
        <section
          className="overflow-hidden rounded-xl border py-2"
          style={{
            background: PALETTE.navy,
            borderColor: PALETTE.navy,
          }}
        >
          <div className="flex items-center gap-10 whitespace-nowrap animate-[ticker_50s_linear_infinite]">
            {[...LIVE_DROPS, ...LIVE_DROPS, ...LIVE_DROPS].map((d, i) => (
              <div key={i} className={`${mono} flex shrink-0 items-center gap-2 text-[12px]`}>
                <TrendingDown className="h-3 w-3" style={{ color: PALETTE.goldSoft }} />
                <span className="font-medium text-white/90">{d.name}</span>
                <span className="text-white/40 line-through">R$ {d.from.toFixed(2)}</span>
                <span className="font-semibold" style={{ color: PALETTE.goldSoft }}>
                  R$ {d.to.toFixed(2)}
                </span>
                <span className="text-white/25">·</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============== FINAL CTA ============== */}
        <section
          className="rounded-2xl border bg-white p-8 md:p-10"
          style={{ borderColor: PALETTE.line }}
        >
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ borderColor: PALETTE.line, color: PALETTE.navy2 }}
              >
                <Sparkles className="h-3 w-3" style={{ color: PALETTE.gold }} />
                Comece grátis
              </div>
              <h2
                className={`${serif} mt-4 text-[clamp(1.8rem,3.4vw,2.4rem)] leading-tight`}
                style={{ color: PALETTE.ink }}
              >
                Nunca mais pague caro por{" "}
                <span className="italic" style={{ color: PALETTE.gold }}>
                  arroz, feijão e café.
                </span>
              </h2>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: PALETTE.navy2 }}>
                Cadastro em 30 segundos. Sem cartão de crédito. Cancele quando quiser.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: PALETTE.navy }}
              >
                Criar minha conta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/resgatar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-[14px] font-semibold transition-colors"
                style={{ borderColor: PALETTE.line, color: PALETTE.navy }}
              >
                Tenho um código
              </Link>
            </div>
          </div>
        </section>

        {/* ============== FOOTER ============== */}
        <footer
          className="flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-[12px]"
          style={{ borderColor: PALETTE.line, color: PALETTE.navy2 }}
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-6 w-6 place-items-center rounded text-[10px] font-bold text-white"
              style={{ background: PALETTE.navy }}
            >
              P
            </span>
            <span className={serif} style={{ color: PALETTE.ink }}>
              PreçoCerto
            </span>
            <span>·</span>
            <span>Feito em Feijó · Acre</span>
          </div>
          <div className="flex gap-5">
            <Link to="/privacidade" className="hover:text-[color:var(--nt-ink)]">Privacidade</Link>
            <Link to="/planos" className="hover:text-[color:var(--nt-ink)]">Planos</Link>
            <Link to="/colaborar" className="hover:text-[color:var(--nt-ink)]">Colaborar</Link>
            <Link to="/lojista" className="hover:text-[color:var(--nt-ink)]">Lojistas</Link>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */
function PlanCard({
  name, price, desc, highlight,
}: { name: string; price: string; desc: string; highlight?: boolean }) {
  return (
    <Link
      to="/planos"
      className="block rounded-xl border p-3.5 transition-all hover:-translate-y-0.5"
      style={{
        borderColor: highlight ? PALETTE.gold : PALETTE.line,
        background: highlight ? `${PALETTE.gold}0d` : "white",
      }}
    >
      <div className="flex items-center justify-between">
        <div className={`${sans} text-[14px] font-semibold`} style={{ color: PALETTE.ink }}>
          {name}
          {highlight && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ background: PALETTE.gold, color: PALETTE.ink }}
            >
              Recomendado
            </span>
          )}
        </div>
        <div className={`${mono} text-[15px] font-semibold`} style={{ color: PALETTE.ink }}>
          {price}
        </div>
      </div>
      <div className="mt-1 text-[12px]" style={{ color: PALETTE.navy2 }}>
        {desc}
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={`${mono} text-[16px] font-semibold`} style={{ color: PALETTE.ink }}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: PALETTE.navy2 }}>
        {label}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}
