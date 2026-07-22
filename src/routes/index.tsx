import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  type PublicStore,
} from "@/lib/stores-public.functions";

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

      {/* ============== HEADER ============== */}
      <header className="border-b" style={{ borderColor: PALETTE.line }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-md text-[13px] font-bold text-white"
              style={{ background: PALETTE.navy }}
            >
              P
            </span>
            <div className="flex flex-col leading-none">
              <span className={`${serif} text-[19px] font-normal`} style={{ color: PALETTE.ink }}>
                Preço<span className="italic" style={{ color: PALETTE.gold }}>Certo</span>
              </span>
              <span
                className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: PALETTE.navy2 }}
              >
                Feijó · Acre
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium" style={{ color: PALETTE.navy2 }}>
            <Link to="/buscar" className="hover:text-[color:var(--nt-ink)] transition-colors">Buscar</Link>
            <Link to="/melhores-precos" className="hover:text-[color:var(--nt-ink)] transition-colors">Rankings</Link>
            <Link to="/colaborar" className="hover:text-[color:var(--nt-ink)] transition-colors">Colaborar</Link>
            <Link to="/planos" className="hover:text-[color:var(--nt-ink)] transition-colors">Planos</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden sm:inline-block rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors"
              style={{ color: PALETTE.navy }}
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="rounded-md px-3.5 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: PALETTE.navy }}
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12 space-y-6">
        {/* ============== HERO ============== */}
        <section
          className="relative overflow-hidden rounded-2xl border bg-white p-6 md:p-10"
          style={{ borderColor: PALETTE.line }}
        >
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
              style={{ borderColor: PALETTE.line, color: PALETTE.navy2 }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: PALETTE.gold }}
              />
              {today || "atualizado agora"}
            </div>

            <h1
              className={`${serif} mt-5 text-[clamp(2.4rem,5.4vw,4rem)] font-normal leading-[1.02]`}
              style={{ color: PALETTE.ink, letterSpacing: "-0.02em" }}
            >
              O preço certo,{" "}
              <span className="italic" style={{ color: PALETTE.gold }}>onde você compra.</span>
            </h1>
            <p
              className="mt-4 max-w-xl text-[15px] leading-relaxed"
              style={{ color: PALETTE.navy2 }}
            >
              Compare mercados de Feijó em tempo real, acompanhe quedas do dia e
              descubra em qual loja sua cesta sai mais barata — com dados atualizados
              pela própria comunidade.
            </p>

            <form onSubmit={submitSearch} className="relative mt-7 max-w-xl">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: PALETTE.navy2 }}
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="text"
                placeholder="Buscar produto: arroz 5 kg, café, leite…"
                className={`${sans} w-full rounded-xl border bg-white py-3.5 pl-11 pr-32 text-[14px] outline-none transition-all placeholder:font-normal focus:border-[color:var(--nt-navy)] focus:ring-4`}
                style={{
                  borderColor: PALETTE.line,
                  color: PALETTE.ink,
                  ["--tw-ring-color" as any]: `${PALETTE.navy}15`,
                }}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: PALETTE.navy }}
              >
                Buscar <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
              <span style={{ color: PALETTE.navy2 }}>Populares:</span>
              {["arroz", "feijão", "leite", "óleo", "café", "açúcar"].map((t) => (
                <button
                  key={t}
                  onClick={() => navigate({ to: "/buscar", search: { q: t } as any })}
                  className="rounded-full border bg-white px-2.5 py-1 text-[12px] font-medium transition-colors"
                  style={{ borderColor: PALETTE.line, color: PALETTE.navy }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Decorative gold rule */}
          <div
            className="pointer-events-none absolute -right-16 top-1/2 hidden h-[280px] w-[280px] -translate-y-1/2 rounded-full opacity-[0.08] lg:block"
            style={{ background: `radial-gradient(circle, ${PALETTE.gold} 0%, transparent 70%)` }}
          />
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
