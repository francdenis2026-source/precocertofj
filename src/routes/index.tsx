import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Sparkles,
  Store,
  ReceiptText,
  TrendingDown,
  Activity,
  Circle,
} from "lucide-react";
import {
  listPublicStores,
  getPlatformStats,
  type PublicStore,
} from "@/lib/stores-public.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PreçoCerto — Terminal de preços em tempo real" },
      {
        name: "description",
        content:
          "Comparador de mercados em Feijó/AC estilo terminal financeiro. Acompanhe quedas de preço ao vivo, monte sua cesta e economize.",
      },
      { property: "og:title", content: "PreçoCerto — Terminal de preços em tempo real" },
      {
        property: "og:description",
        content:
          "Comparador de mercados em Feijó/AC estilo terminal financeiro. Quedas ao vivo, cesta básica e economia real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

/* ================================================================== */
/*  DESIGN TOKENS — Emerald Prestige (escopo local)                    */
/* ================================================================== */
const emeraldTheme: React.CSSProperties = {
  // Locked palette
  ["--pc-cream" as any]: "#f5f0e0",
  ["--pc-emerald" as any]: "#064e3b",
  ["--pc-emerald-2" as any]: "#0d7a5f",
  ["--pc-gold" as any]: "#c9a84c",
  ["--pc-ink" as any]: "#052e26",
  fontFamily: "'Figtree', system-ui, sans-serif",
};

const outfit = "font-['Outfit',system-ui,sans-serif]";
const mono = "font-['IBM_Plex_Mono',ui-monospace,monospace]";

/* ================================================================== */
/*  MOCK LIVE DATA (banco vazio hoje — números plausíveis)             */
/* ================================================================== */
type Drop = { name: string; store: string; from: number; to: number; ago: string };
const LIVE_DROPS: Drop[] = [
  { name: "Arroz Tio Urbano 5kg", store: "Mercado Central", from: 32.9, to: 24.5, ago: "2m" },
  { name: "Feijão Carioca 1kg", store: "Super Feijó", from: 9.2, to: 7.45, ago: "6m" },
  { name: "Óleo de Soja 900ml", store: "Mercado Central", from: 8.1, to: 6.8, ago: "11m" },
  { name: "Açúcar Refinado 1kg", store: "Mini Preço", store2: "", from: 5.9, to: 4.79, ago: "18m" } as Drop,
  { name: "Leite Integral 1L", store: "Super Econômico", from: 6.5, to: 5.2, ago: "24m" },
  { name: "Café Torrado 500g", store: "Mercado Central", from: 22.0, to: 18.9, ago: "32m" },
];

type Sector = { label: string; slug: string; delta: number };
const SECTORS: Sector[] = [
  { label: "Hortifruti", slug: "hortifruti", delta: -12 },
  { label: "Açougue", slug: "carnes", delta: 4 },
  { label: "Mercearia", slug: "mercearia", delta: -6 },
  { label: "Laticínios", slug: "laticinios", delta: -3 },
  { label: "Padaria", slug: "padaria", delta: 2 },
  { label: "Bebidas", slug: "bebidas", delta: 0 },
  { label: "Limpeza", slug: "limpeza", delta: -8 },
  { label: "Higiene", slug: "higiene", delta: -5 },
];

const KPIS = [
  { label: "Cesta Básica", value: "R$ 412,50", delta: "↓ 2.4%", tone: "gold" as const, sub: "vs. ontem" },
  { label: "Maior Queda 7d", value: "-42%", delta: "Higiene Pessoal", tone: "gold" as const, sub: "" },
  { label: "Mercados", value: "18", delta: "Ativos agora", tone: "emerald" as const, sub: "" },
  { label: "Economia Média", value: "R$ 87", delta: "por família / mês", tone: "emerald" as const, sub: "" },
];

/* ================================================================== */
/*  HOMEPAGE — Terminal Dashboard                                      */
/* ================================================================== */
function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    setNow(formatTime(new Date()));
    const t = setInterval(() => setNow(formatTime(new Date())), 1000);
    return () => clearInterval(t);
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

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/buscar", search: { q: query } as any });
  };

  return (
    <div
      style={emeraldTheme}
      className="min-h-screen w-full text-[color:var(--pc-emerald)]"
    >
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 bg-[color:var(--pc-cream)]">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--pc-emerald) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-4 space-y-4">
        {/* ============== TOP COMMAND BAR ============== */}
        <header className="flex items-center justify-between rounded-2xl border-b-2 border-[color:var(--pc-gold)] bg-[color:var(--pc-emerald)] px-4 py-3 text-white shadow-xl md:px-6">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <div className={`${outfit} flex shrink-0 items-center gap-2 text-lg md:text-xl font-bold tracking-tighter`}>
              <div className="grid h-6 w-6 place-items-center rounded-[6px] bg-[color:var(--pc-gold)]">
                <span className="text-[10px] font-black text-[color:var(--pc-emerald)]">P</span>
              </div>
              <span>PREÇO<span className="text-[color:var(--pc-gold)]">CERTO</span></span>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[color:var(--pc-gold)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Terminal: Feijó · AC
            </div>
            <div className={`${mono} hidden lg:block text-[11px] text-white/60 tabular-nums`}>
              {now}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              to="/login"
              className="text-[11px] font-semibold uppercase tracking-wider text-white/90 transition-colors hover:text-[color:var(--pc-gold)]"
            >
              Entrar
            </Link>
            <Link
              to="/lojista"
              className="rounded-md bg-[color:var(--pc-gold)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--pc-emerald)] transition-colors hover:bg-white"
            >
              Painel Lojista
            </Link>
          </div>
        </header>

        {/* ============== MAIN COMMAND GRID ============== */}
        <main className="grid grid-cols-12 gap-3 md:gap-4">
          {/* -------- LEFT COLUMN -------- */}
          <aside className="col-span-12 space-y-3 md:space-y-4 lg:col-span-3">
            {/* Setores */}
            <div className="rounded-xl border border-[color:var(--pc-emerald)]/10 bg-white p-4 shadow-sm">
              <h3 className={`${outfit} mb-3 text-[11px] font-bold uppercase tracking-widest text-[color:var(--pc-emerald-2)]`}>
                Setores
              </h3>
              <nav className="space-y-0.5">
                {SECTORS.map((s) => (
                  <Link
                    key={s.slug}
                    to="/buscar"
                    search={{ cat: s.slug } as any}
                    className="group flex items-center justify-between rounded px-2 py-1.5 text-sm transition-all hover:bg-[color:var(--pc-emerald)] hover:text-white"
                  >
                    <span className="font-medium">{s.label}</span>
                    <DeltaChip value={s.delta} />
                  </Link>
                ))}
              </nav>
            </div>

            {/* Live drop feed */}
            <div className="relative overflow-hidden rounded-xl bg-[color:var(--pc-emerald)] p-4 text-[color:var(--pc-cream)]">
              <div className="relative z-10">
                <div className="mb-3 flex items-center justify-between">
                  <p className={`${outfit} text-[10px] font-bold uppercase tracking-widest text-[color:var(--pc-gold)]`}>
                    Live Drop Feed
                  </p>
                  <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    ao vivo
                  </span>
                </div>
                <div className="space-y-3">
                  {LIVE_DROPS.slice(0, 4).map((d, i) => (
                    <div
                      key={i}
                      className="border-l pl-3 py-0.5"
                      style={{
                        borderColor: i === 0 ? "var(--pc-gold)" : "var(--pc-emerald-2)",
                        opacity: 1 - i * 0.18,
                      }}
                    >
                      <p className="text-[11px] font-semibold leading-tight">{d.name}</p>
                      <p className="text-[9px] opacity-70">
                        {d.store} • {d.ago} atrás
                      </p>
                      <p className={`${mono} text-xs font-bold tabular-nums`}>
                        <span className="opacity-50 line-through">R$ {d.from.toFixed(2)}</span>
                        <span className="ml-2 text-[color:var(--pc-gold)]">
                          R$ {d.to.toFixed(2)} ↓
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full border-4 border-[color:var(--pc-gold)] opacity-10" />
              <div className="pointer-events-none absolute -top-4 -left-4 h-14 w-14 rounded-full border-2 border-[color:var(--pc-gold)] opacity-10" />
            </div>
          </aside>

          {/* -------- CENTER COLUMN -------- */}
          <section className="col-span-12 space-y-3 md:space-y-4 lg:col-span-6">
            {/* Hero + Busca */}
            <div className="rounded-xl border-t-4 border-[color:var(--pc-emerald)] bg-white p-6 shadow-sm md:p-8">
              <p className={`${outfit} mb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--pc-emerald-2)]`}>
                <MapPin className="inline h-3 w-3 -mt-0.5" /> Preços ao vivo · Feijó · AC
              </p>
              <h1 className={`${outfit} text-center text-2xl md:text-4xl font-bold tracking-tight leading-tight`}>
                Qual preço você busca hoje em{" "}
                <span className="text-[color:var(--pc-gold)]">Feijó?</span>
              </h1>
              <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[color:var(--pc-emerald)]/60">
                Compare mercados em tempo real. Monte a cesta ideal. Economize a cada compra.
              </p>

              <form onSubmit={submitSearch} className="relative mt-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--pc-emerald)]/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  type="text"
                  placeholder="Ex.: arroz 5kg, café, leite..."
                  className="w-full rounded-md border-none bg-[color:var(--pc-cream)] py-4 pl-11 pr-32 text-sm text-[color:var(--pc-emerald)] outline-none ring-0 placeholder:text-[color:var(--pc-emerald)]/40 focus:ring-2 focus:ring-[color:var(--pc-emerald)]"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[color:var(--pc-emerald)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-[color:var(--pc-emerald-2)]"
                >
                  Buscar
                </button>
              </form>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                <span className="text-[color:var(--pc-emerald)]/50">Popular:</span>
                {["arroz", "feijão", "leite", "óleo", "café"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setQ(t);
                      navigate({ to: "/buscar", search: { q: t } as any });
                    }}
                    className="rounded-full border border-[color:var(--pc-emerald)]/15 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--pc-emerald)]/70 transition-colors hover:border-[color:var(--pc-gold)] hover:text-[color:var(--pc-emerald)]"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {KPIS.map((k, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[color:var(--pc-emerald)]/10 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
                >
                  <p className={`${outfit} text-[10px] font-bold uppercase tracking-wider text-[color:var(--pc-emerald-2)]`}>
                    {k.label}
                  </p>
                  <p
                    className={`${outfit} ${mono} mt-1 text-xl md:text-2xl font-bold tabular-nums`}
                    style={{
                      color: k.tone === "gold" ? "var(--pc-gold)" : "var(--pc-emerald)",
                    }}
                  >
                    {k.value}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--pc-emerald)]/60">
                    {k.delta}
                    {k.sub && <span className="ml-1 opacity-60">{k.sub}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Market list */}
            <div className="overflow-hidden rounded-xl border border-[color:var(--pc-emerald)]/10 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[color:var(--pc-cream)] p-4">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-[color:var(--pc-emerald-2)]" />
                  <h3 className={`${outfit} text-sm font-bold uppercase tracking-wider`}>
                    Mercados Próximos
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                    online
                  </span>
                  <Link
                    to="/mapa"
                    className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--pc-emerald)]/70 hover:text-[color:var(--pc-emerald)]"
                  >
                    Ver mapa →
                  </Link>
                </div>
              </div>

              <div className="divide-y divide-[color:var(--pc-cream)]">
                {(stores.length ? stores.slice(0, 5) : PLACEHOLDER_STORES).map((s: any, i: number) => (
                  <Link
                    key={s.id ?? i}
                    to="/loja/$id"
                    params={{ id: String(s.id ?? "demo") }}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-[color:var(--pc-cream)]/50"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`${outfit} grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--pc-emerald)]/5 text-sm font-bold text-[color:var(--pc-emerald)]`}>
                        {initials(s.name ?? s.label ?? "MC")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{s.name ?? s.label}</p>
                        <p className="truncate text-[11px] text-[color:var(--pc-emerald)]/60">
                          {s.neighborhood ?? s.address ?? "Feijó · AC"}
                          {s.distance_km ? ` · ${s.distance_km.toFixed(1)}km` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`${mono} text-xs font-bold tabular-nums`}>
                        {s.best_items ?? Math.floor(20 + Math.random() * 140)} itens
                      </p>
                      <div className="mt-1 flex justify-end">
                        <div
                          className="h-1 rounded-full"
                          style={{
                            width: `${28 + ((s.best_items ?? 60) % 60)}px`,
                            background:
                              i === 0 ? "var(--pc-gold)" : "var(--pc-emerald-2)",
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* -------- RIGHT COLUMN -------- */}
          <aside className="col-span-12 space-y-3 md:space-y-4 lg:col-span-3">
            {/* Nota fiscal CTA */}
            <div className="relative overflow-hidden rounded-xl border-2 border-[color:var(--pc-emerald)] bg-[color:var(--pc-gold)] p-5 text-[color:var(--pc-emerald)] shadow-sm">
              <div className="relative z-10">
                <div className="mb-2 flex items-center gap-2">
                  <ReceiptText className="h-4 w-4" />
                  <span className={`${outfit} text-[10px] font-bold uppercase tracking-widest`}>
                    Rede Colaborativa
                  </span>
                </div>
                <h4 className={`${outfit} text-lg font-extrabold leading-tight`}>
                  Envie sua Nota Fiscal
                </h4>
                <p className="mt-1.5 text-xs font-medium opacity-80">
                  Ganhe <b>30 dias</b> Premium e ajude a monitorar Feijó.
                </p>
                <Link
                  to="/colaborar"
                  className="mt-3 flex items-center justify-center gap-2 rounded-md bg-[color:var(--pc-emerald)] py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[color:var(--pc-emerald-2)]"
                >
                  Enviar agora <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rotate-45 border border-[color:var(--pc-emerald)]/20" />
              <div className="pointer-events-none absolute -left-4 -bottom-4 h-12 w-12 rotate-12 border border-[color:var(--pc-emerald)]/20" />
            </div>

            {/* Planos */}
            <div className="rounded-xl border border-[color:var(--pc-emerald)]/10 bg-white p-4 shadow-sm">
              <h3 className={`${outfit} mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--pc-emerald-2)]`}>
                <Sparkles className="h-3 w-3" /> Planos Flexíveis
              </h3>
              <div className="space-y-2">
                <Link
                  to="/planos"
                  className="block cursor-pointer rounded-md border border-[color:var(--pc-emerald-2)]/20 p-3 transition-colors hover:border-[color:var(--pc-gold)]"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold">Weekly Pass</p>
                    <p className={`${mono} text-xs font-bold tabular-nums`}>R$ 4,90</p>
                  </div>
                  <p className="mt-0.5 text-[10px] opacity-60">7 dias · alertas WhatsApp</p>
                </Link>
                <Link
                  to="/planos"
                  className="block cursor-pointer rounded-md bg-[color:var(--pc-emerald)] p-3 text-white shadow-md transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-bold">Monthly Pro</p>
                    <p className={`${mono} text-xs font-bold tabular-nums text-[color:var(--pc-gold)]`}>
                      R$ 14,90
                    </p>
                  </div>
                  <p className="mt-1 text-center text-[9px] font-bold uppercase tracking-wider text-[color:var(--pc-gold)]">
                    Recomendado
                  </p>
                </Link>
              </div>
            </div>

            {/* Signal */}
            <div className="rounded-xl border border-[color:var(--pc-emerald)]/10 bg-white p-4 shadow-sm">
              <h3 className={`${outfit} mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--pc-emerald-2)]`}>
                <Activity className="h-3 w-3" /> Sinal do mercado
              </h3>
              <div className="space-y-2 text-xs">
                <SignalRow label="Volume 7d" value="+18%" up />
                <SignalRow label="Volatilidade" value="Baixa" />
                <SignalRow label="Cobertura" value={statsQ.data ? `${(statsQ.data as any).stores ?? 0} lojas` : "—"} />
                <SignalRow label="Contribuidores" value={statsQ.data ? `${(statsQ.data as any).collaborators ?? 0}` : "0"} />
              </div>
            </div>
          </aside>
        </main>

        {/* ============== TICKER ============== */}
        <div className="overflow-hidden rounded-xl border border-[color:var(--pc-emerald)]/10 bg-[color:var(--pc-emerald)] py-2 text-[color:var(--pc-cream)] shadow-sm">
          <div className="flex items-center gap-8 whitespace-nowrap animate-[ticker_45s_linear_infinite]">
            {[...LIVE_DROPS, ...LIVE_DROPS].map((d, i) => (
              <div key={i} className={`${mono} flex shrink-0 items-center gap-2 text-xs tabular-nums`}>
                <TrendingDown className="h-3 w-3 text-[color:var(--pc-gold)]" />
                <span className="font-semibold">{d.name}</span>
                <span className="text-white/40 line-through">R${d.from.toFixed(2)}</span>
                <span className="font-bold text-[color:var(--pc-gold)]">R${d.to.toFixed(2)}</span>
                <span className="text-white/30">·</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============== STATUS FOOTER ============== */}
        <footer className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--pc-emerald)]/10 bg-white/60 px-4 py-3 text-[10px] uppercase tracking-widest text-[color:var(--pc-emerald)]/60 backdrop-blur-sm">
          <div className="flex flex-wrap gap-4 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Sistema Nominal
            </span>
            <span className={mono}>Atualizado {now}</span>
            <span>Feito em Feijó · AC</span>
          </div>
          <div className="flex gap-4 font-semibold">
            <Link to="/privacidade" className="hover:text-[color:var(--pc-emerald)]">Privacidade</Link>
            <Link to="/planos" className="hover:text-[color:var(--pc-emerald)]">Planos</Link>
            <Link to="/colaborar" className="hover:text-[color:var(--pc-emerald)]">Colaborar</Link>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */
function DeltaChip({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="text-[9px] font-bold uppercase tracking-wider text-[color:var(--pc-emerald)]/40 group-hover:text-white/60">
        stable
      </span>
    );
  const down = value < 0;
  return (
    <span
      className={`${mono} inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums group-hover:text-white`}
      style={{ color: down ? "var(--pc-gold)" : "var(--pc-emerald-2)" }}
    >
      {down ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function SignalRow({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:var(--pc-emerald)]/60">{label}</span>
      <span
        className={`${mono} font-bold tabular-nums`}
        style={{ color: up ? "var(--pc-emerald-2)" : "var(--pc-emerald)" }}
      >
        {value}
      </span>
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

function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour12: false });
}

const PLACEHOLDER_STORES = [
  { id: "demo-1", name: "Mercado Central", neighborhood: "Centro · 0.8km", best_items: 142 },
  { id: "demo-2", name: "Super Feijó", neighborhood: "Cidade Nova · 2.1km", best_items: 98 },
  { id: "demo-3", name: "Super Econômico", neighborhood: "Vila Nova · 1.4km", best_items: 76 },
  { id: "demo-4", name: "Mini Preço", neighborhood: "Centro · 0.5km", best_items: 61 },
];
