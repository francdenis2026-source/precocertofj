import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Package, ShieldCheck, Store, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMetricSpotlight } from "@/lib/metric-spotlight.functions";

export type MetricKind = "markets" | "products" | "savings";

const currency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function relTime(iso: string | null): string {
  if (!iso) return "sem registros";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}

/* ---------- SVG hero art (inline, alto nível) ---------- */

function MarketsArt() {
  return (
    <svg viewBox="0 0 480 200" className="h-full w-full" role="img" aria-label="Skyline de mercados parceiros">
      <defs>
        <linearGradient id="mSky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--pc-home-navy)" stopOpacity="0.95" />
          <stop offset="1" stopColor="var(--pc-home-navy)" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="mGold" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--pc-home-gold)" />
          <stop offset="1" stopColor="var(--pc-home-gold-soft)" />
        </linearGradient>
        <pattern id="mDots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--pc-home-gold)" opacity="0.14" />
        </pattern>
      </defs>
      <rect width="480" height="200" fill="url(#mSky)" />
      <rect width="480" height="200" fill="url(#mDots)" />
      {/* skyline de lojas */}
      {[
        { x: 30, w: 60, h: 90, awning: true },
        { x: 100, w: 80, h: 120, awning: true },
        { x: 190, w: 70, h: 100, awning: false },
        { x: 270, w: 90, h: 130, awning: true },
        { x: 370, w: 80, h: 110, awning: false },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={200 - b.h} width={b.w} height={b.h} fill="var(--pc-home-navy)" stroke="url(#mGold)" strokeWidth="1.2" opacity="0.92" />
          {b.awning && (
            <path d={`M${b.x - 4} ${200 - b.h + 22} L${b.x + b.w + 4} ${200 - b.h + 22} L${b.x + b.w - 4} ${200 - b.h + 34} L${b.x + 4} ${200 - b.h + 34} Z`} fill="url(#mGold)" opacity="0.9" />
          )}
          {/* janelas */}
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={b.x + 6 + c * 22}
                y={200 - b.h + 44 + r * 20}
                width={14}
                height={12}
                fill="var(--pc-home-gold)"
                opacity={0.18 + ((r + c + i) % 3) * 0.16}
              />
            )),
          )}
          <rect x={b.x + b.w / 2 - 8} y={200 - 26} width={16} height={26} fill="var(--pc-home-gold)" opacity="0.85" />
        </g>
      ))}
      {/* selo */}
      <g transform="translate(408, 22)">
        <circle r="18" fill="var(--pc-home-gold)" opacity="0.95" />
        <path d="M-6 0 L-2 4 L7 -5" stroke="var(--pc-home-navy)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function ProductsArt() {
  return (
    <svg viewBox="0 0 480 200" className="h-full w-full" role="img" aria-label="Catálogo de produtos">
      <defs>
        <linearGradient id="pBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--pc-home-navy)" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--pc-home-navy) 82%, black)" />
        </linearGradient>
        <linearGradient id="pGold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--pc-home-gold-soft)" />
          <stop offset="1" stopColor="var(--pc-home-gold)" />
        </linearGradient>
      </defs>
      <rect width="480" height="200" fill="url(#pBg)" />
      {/* prateleira */}
      <line x1="20" y1="160" x2="460" y2="160" stroke="url(#pGold)" strokeWidth="2" />
      <line x1="20" y1="110" x2="460" y2="110" stroke="url(#pGold)" strokeWidth="1.5" opacity="0.6" />
      {/* caixas — grid organizado */}
      {[
        { x: 40, y: 118, w: 46, h: 42, tone: 0.9 },
        { x: 96, y: 126, w: 38, h: 34, tone: 0.7 },
        { x: 146, y: 112, w: 52, h: 48, tone: 1 },
        { x: 210, y: 122, w: 44, h: 38, tone: 0.8 },
        { x: 266, y: 116, w: 48, h: 44, tone: 0.9 },
        { x: 326, y: 128, w: 40, h: 32, tone: 0.65 },
        { x: 376, y: 118, w: 54, h: 42, tone: 0.95 },
        // prateleira superior
        { x: 60, y: 66, w: 46, h: 44, tone: 0.7 },
        { x: 120, y: 74, w: 38, h: 36, tone: 0.55 },
        { x: 172, y: 60, w: 56, h: 50, tone: 0.85 },
        { x: 242, y: 70, w: 44, h: 40, tone: 0.7 },
        { x: 300, y: 66, w: 50, h: 44, tone: 0.8 },
        { x: 364, y: 78, w: 40, h: 32, tone: 0.55 },
      ].map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} fill="var(--pc-home-gold)" opacity={0.14 * c.tone + 0.08} stroke="var(--pc-home-gold)" strokeOpacity={0.4 * c.tone + 0.2} />
          <rect x={c.x + 3} y={c.y + 6} width={c.w - 6} height={5} fill="var(--pc-home-gold)" opacity={0.55 * c.tone} />
          <rect x={c.x + 3} y={c.y + 14} width={c.w - 14} height={3} fill="var(--pc-home-gold)" opacity={0.3 * c.tone} />
        </g>
      ))}
      {/* etiqueta */}
      <g transform="translate(400, 24)">
        <rect x="-52" y="-14" width="104" height="28" rx="6" fill="var(--pc-home-gold)" />
        <text x="0" y="5" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="12" fontWeight="700" fill="var(--pc-home-navy)">
          CATÁLOGO
        </text>
      </g>
    </svg>
  );
}

function SavingsArt() {
  return (
    <svg viewBox="0 0 480 200" className="h-full w-full" role="img" aria-label="Economia identificada">
      <defs>
        <linearGradient id="sBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--pc-home-navy)" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--pc-home-navy) 78%, black)" />
        </linearGradient>
        <linearGradient id="sLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--pc-home-gold-soft)" />
          <stop offset="1" stopColor="var(--pc-home-gold)" />
        </linearGradient>
        <linearGradient id="sFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--pc-home-gold)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--pc-home-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="480" height="200" fill="url(#sBg)" />
      {/* grade */}
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="20" y1={y} x2="460" y2={y} stroke="var(--pc-home-gold)" strokeOpacity="0.08" />
      ))}
      {/* área */}
      <path
        d="M20 60 L70 78 L120 70 L170 92 L220 108 L270 100 L320 128 L370 138 L420 156 L460 168 L460 200 L20 200 Z"
        fill="url(#sFill)"
      />
      {/* linha */}
      <path
        d="M20 60 L70 78 L120 70 L170 92 L220 108 L270 100 L320 128 L370 138 L420 156 L460 168"
        stroke="url(#sLine)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* pontos */}
      {[
        [20, 60],
        [120, 70],
        [220, 108],
        [320, 128],
        [420, 156],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="var(--pc-home-gold)" stroke="var(--pc-home-navy)" strokeWidth="1.5" />
      ))}
      {/* selo % */}
      <g transform="translate(410, 30)">
        <circle r="22" fill="var(--pc-home-gold)" />
        <text x="0" y="5" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="14" fontWeight="800" fill="var(--pc-home-navy)">
          %
        </text>
      </g>
    </svg>
  );
}

/* ---------- Modal ---------- */

const HERO_CONFIG: Record<MetricKind, {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  Art: React.ComponentType;
}> = {
  markets: {
    eyebrow: "Rede colaborativa",
    title: "Mercados parceiros",
    subtitle: "Estabelecimentos ativos em Feijó/AC com preços atualizados pela comunidade.",
    icon: ShieldCheck,
    Art: MarketsArt,
  },
  products: {
    eyebrow: "Catálogo verificado",
    title: "Produtos cadastrados",
    subtitle: "Itens únicos com marca, gramagem e histórico de preço em pelo menos um mercado.",
    icon: Package,
    Art: ProductsArt,
  },
  savings: {
    eyebrow: "Economia real",
    title: "Diferença entre mercados",
    subtitle: "Variação média entre o menor e o maior preço do mesmo produto em Feijó.",
    icon: TrendingDown,
    Art: SavingsArt,
  },
};

export function MetricSpotlightDialog({
  open,
  onOpenChange,
  kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: MetricKind | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["metric-spotlight"],
    queryFn: () => getMetricSpotlight(),
    enabled: open,
    staleTime: 60_000,
  });

  if (!kind) return null;
  const cfg = HERO_CONFIG[kind];
  const Icon = cfg.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl overflow-hidden p-0 sm:rounded-2xl"
        style={{ background: "var(--pc-home-card)", color: "var(--pc-home-heading)" }}
      >
        {/* HERO */}
        <div className="relative h-40 w-full overflow-hidden sm:h-48">
          <cfg.Art />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 45%, color-mix(in oklab, var(--pc-home-navy) 82%, black) 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
            <div>
              <div
                className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--pc-home-gold-soft)" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.eyebrow}
              </div>
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]" style={{ color: "#F5F6FA" }}>
                  {cfg.title}
                </DialogTitle>
              </DialogHeader>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="max-h-[65svh] overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
          <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--pc-text-muted)" }}>
            {cfg.subtitle}
          </p>

          {isLoading || !data ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: "color-mix(in oklab, var(--pc-home-navy) 8%, transparent)" }} />
              ))}
            </div>
          ) : (
            <MetricBody kind={kind} data={data} />
          )}

          {data?.totals.lastUpdate && (
            <div
              className="mt-4 flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--pc-text-muted)" }}
            >
              <Clock className="h-3 w-3" />
              Última atualização {relTime(data.totals.lastUpdate)} · {data.totals.scans7d.toLocaleString("pt-BR")} preços nos últimos 7 dias
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCell({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "gold" }) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        borderColor: "color-mix(in oklab, var(--pc-home-line) 70%, transparent)",
        background: "color-mix(in oklab, var(--pc-home-navy) 4%, transparent)",
      }}
    >
      <div className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--pc-text-muted)" }}>
        {label}
      </div>
      <div
        className="mt-0.5 text-lg font-bold tabular-nums"
        style={{
          color: tone === "gold" ? "var(--pc-home-gold)" : "var(--pc-home-heading)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.16em]"
      style={{ color: "var(--pc-text-muted)" }}
    >
      {children}
    </h3>
  );
}

function MetricBody({
  kind,
  data,
}: {
  kind: MetricKind;
  data: Awaited<ReturnType<typeof getMetricSpotlight>>;
}) {
  if (kind === "markets") {
    return (
      <>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCell label="Mercados" value={data.totals.establishments.toString()} tone="gold" />
          <StatCell label="Produtos" value={data.totals.products.toLocaleString("pt-BR")} />
          <StatCell label="Preços/7d" value={data.totals.scans7d.toLocaleString("pt-BR")} />
        </div>

        <SectionTitle>Lista de parceiros</SectionTitle>
        <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
          {data.stores.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border text-[11px] font-bold"
                style={{
                  borderColor: "var(--pc-home-line)",
                  background: s.brandColor ?? "color-mix(in oklab, var(--pc-home-navy) 6%, transparent)",
                  color: s.brandColor ? "#fff" : "var(--pc-home-navy)",
                }}
              >
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Store className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--pc-home-heading)" }}>
                  {s.name}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--pc-text-muted)" }}>
                  {[s.neighborhood, s.city].filter(Boolean).join(" · ") || "Feijó, AC"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold tabular-nums" style={{ color: "var(--pc-home-gold)" }}>
                  {s.productCount}
                </div>
                <div className="text-[10px]" style={{ color: "var(--pc-text-muted)" }}>
                  itens · {relTime(s.lastUpdate)}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Link
          to="/estabelecimentos"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--pc-home-navy)" }}
        >
          Ver página completa <ArrowRight className="h-4 w-4" />
        </Link>
      </>
    );
  }

  if (kind === "products") {
    return (
      <>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCell label="Cadastrados" value={data.totals.products.toLocaleString("pt-BR")} tone="gold" />
          <StatCell label="Categorias" value={data.topCategories.length.toString()} />
          <StatCell label="Preços/7d" value={data.totals.scans7d.toLocaleString("pt-BR")} />
        </div>

        <SectionTitle>Distribuição por categoria</SectionTitle>
        <div className="space-y-2">
          {data.topCategories.map((c) => {
            const max = data.topCategories[0]?.count ?? 1;
            const pct = Math.max(6, Math.round((c.count / max) * 100));
            return (
              <div key={c.key} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-[12px]" style={{ color: "var(--pc-home-heading)" }}>
                  {c.label}
                </div>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in oklab, var(--pc-home-navy) 8%, transparent)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg, var(--pc-home-gold-soft), var(--pc-home-gold))",
                    }}
                  />
                </div>
                <div className="w-10 text-right text-[12px] font-semibold tabular-nums" style={{ color: "var(--pc-text-muted)" }}>
                  {c.count}
                </div>
              </div>
            );
          })}
        </div>

        <SectionTitle>Últimas atualizações</SectionTitle>
        <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
          {data.recentUpdates.slice(0, 6).map((u, i) => (
            <li key={i} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold" style={{ color: "var(--pc-home-heading)" }}>
                  {u.productName}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--pc-text-muted)" }}>
                  {u.marketName ?? "—"} · {relTime(u.when)}
                </div>
              </div>
              <div className="text-sm font-bold tabular-nums" style={{ color: "var(--pc-home-gold)" }}>
                {currency(u.price)}
              </div>
            </li>
          ))}
        </ul>

        <Link
          to="/buscar"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--pc-home-navy)" }}
        >
          Explorar catálogo <ArrowRight className="h-4 w-4" />
        </Link>
      </>
    );
  }

  // savings
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCell label="Média" value={`${data.totals.avgSavingsPct}%`} tone="gold" />
        <StatCell label="Melhor caso" value={`${data.totals.bestSavingsPct}%`} />
        <StatCell label="Comparados" value={data.totals.productsCompared.toLocaleString("pt-BR")} />
      </div>

      <SectionTitle>Maiores economias agora</SectionTitle>
      <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
        {data.topSavings.map((s, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <div
              className="grid h-11 w-14 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums"
              style={{
                background: "linear-gradient(135deg, var(--pc-home-gold), var(--pc-home-gold-soft))",
                color: "var(--pc-home-navy)",
              }}
            >
              {Math.round(s.savingsPct)}%
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold" style={{ color: "var(--pc-home-heading)" }}>
                {s.displayName}
              </div>
              <div className="truncate text-[11px]" style={{ color: "var(--pc-text-muted)" }}>
                {s.storeCount} mercados · menor em {s.cheapestStore ?? "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] line-through" style={{ color: "var(--pc-text-muted)" }}>
                {currency(s.maxPrice)}
              </div>
              <div className="text-sm font-bold tabular-nums" style={{ color: "var(--pc-home-gold)" }}>
                {currency(s.minPrice)}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Link
        to="/comparador"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: "var(--pc-home-navy)" }}
      >
        Ver comparador completo <ArrowRight className="h-4 w-4" />
      </Link>
    </>
  );
}
