import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock,
  Package,
  Search,
  ShieldCheck,
  Store,
  TrendingDown,
} from "lucide-react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
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

/** Normaliza para busca sem acento/caixa. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ---------- SVG hero art (responsivo + animado) ----------
 * viewBox fixo + preserveAspectRatio="xMidYMid slice" cobre o container
 * mesmo em telas ultra-wide/altas. Cores 100% via tokens (--pc-home-*)
 * para respeitarem light/dark/high-contrast automaticamente.
 */

const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

function MarketsArt({ animate }: { animate: boolean }) {
  const buildings = [
    { x: 30, w: 60, h: 90, awning: true },
    { x: 100, w: 80, h: 120, awning: true },
    { x: 190, w: 70, h: 100, awning: false },
    { x: 270, w: 90, h: 130, awning: true },
    { x: 370, w: 80, h: 110, awning: false },
  ];
  return (
    <svg
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Skyline de mercados parceiros"
    >
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
      {buildings.map((b, i) => (
        <motion.g
          key={i}
          initial={animate ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 + i * 0.07, ease: EASE }}
        >
          <rect
            x={b.x}
            y={200 - b.h}
            width={b.w}
            height={b.h}
            fill="var(--pc-home-navy)"
            stroke="url(#mGold)"
            strokeWidth="1.2"
            opacity="0.92"
          />
          {b.awning && (
            <path
              d={`M${b.x - 4} ${200 - b.h + 22} L${b.x + b.w + 4} ${200 - b.h + 22} L${b.x + b.w - 4} ${200 - b.h + 34} L${b.x + 4} ${200 - b.h + 34} Z`}
              fill="url(#mGold)"
              opacity="0.9"
            />
          )}
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
          <rect
            x={b.x + b.w / 2 - 8}
            y={200 - 26}
            width={16}
            height={26}
            fill="var(--pc-home-gold)"
            opacity="0.85"
          />
        </motion.g>
      ))}
      <motion.g
        transform="translate(408, 22)"
        initial={animate ? { scale: 0.6, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
      >
        <circle r="18" fill="var(--pc-home-gold)" opacity="0.95" />
        <path
          d="M-6 0 L-2 4 L7 -5"
          stroke="var(--pc-home-navy)"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  );
}

function ProductsArt({ animate }: { animate: boolean }) {
  const crates = [
    { x: 40, y: 118, w: 46, h: 42, tone: 0.9 },
    { x: 96, y: 126, w: 38, h: 34, tone: 0.7 },
    { x: 146, y: 112, w: 52, h: 48, tone: 1 },
    { x: 210, y: 122, w: 44, h: 38, tone: 0.8 },
    { x: 266, y: 116, w: 48, h: 44, tone: 0.9 },
    { x: 326, y: 128, w: 40, h: 32, tone: 0.65 },
    { x: 376, y: 118, w: 54, h: 42, tone: 0.95 },
    { x: 60, y: 66, w: 46, h: 44, tone: 0.7 },
    { x: 120, y: 74, w: 38, h: 36, tone: 0.55 },
    { x: 172, y: 60, w: 56, h: 50, tone: 0.85 },
    { x: 242, y: 70, w: 44, h: 40, tone: 0.7 },
    { x: 300, y: 66, w: 50, h: 44, tone: 0.8 },
    { x: 364, y: 78, w: 40, h: 32, tone: 0.55 },
  ];
  return (
    <svg
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Catálogo de produtos"
    >
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
      <line x1="20" y1="160" x2="460" y2="160" stroke="url(#pGold)" strokeWidth="2" />
      <line x1="20" y1="110" x2="460" y2="110" stroke="url(#pGold)" strokeWidth="1.5" opacity="0.6" />
      {crates.map((c, i) => (
        <motion.g
          key={i}
          initial={animate ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 + (i % 7) * 0.05, ease: EASE }}
        >
          <rect
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            fill="var(--pc-home-gold)"
            opacity={0.14 * c.tone + 0.08}
            stroke="var(--pc-home-gold)"
            strokeOpacity={0.4 * c.tone + 0.2}
          />
          <rect x={c.x + 3} y={c.y + 6} width={c.w - 6} height={5} fill="var(--pc-home-gold)" opacity={0.55 * c.tone} />
          <rect x={c.x + 3} y={c.y + 14} width={c.w - 14} height={3} fill="var(--pc-home-gold)" opacity={0.3 * c.tone} />
        </motion.g>
      ))}
      <motion.g
        transform="translate(400, 24)"
        initial={animate ? { opacity: 0, x: 20 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
      >
        <rect x="-52" y="-14" width="104" height="28" rx="6" fill="var(--pc-home-gold)" />
        <text x="0" y="5" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="12" fontWeight="700" fill="var(--pc-home-navy)">
          CATÁLOGO
        </text>
      </motion.g>
    </svg>
  );
}

function SavingsArt({ animate }: { animate: boolean }) {
  const points: Array<[number, number]> = [
    [20, 60],
    [120, 70],
    [220, 108],
    [320, 128],
    [420, 156],
  ];
  const linePath =
    "M20 60 L70 78 L120 70 L170 92 L220 108 L270 100 L320 128 L370 138 L420 156 L460 168";
  const areaPath = `${linePath} L460 200 L20 200 Z`;
  return (
    <svg
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Economia identificada"
    >
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
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="20" y1={y} x2="460" y2={y} stroke="var(--pc-home-gold)" strokeOpacity="0.08" />
      ))}
      <motion.path
        d={areaPath}
        fill="url(#sFill)"
        initial={animate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
      />
      <motion.path
        d={linePath}
        stroke="url(#sLine)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      />
      {points.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="3.5"
          fill="var(--pc-home-gold)"
          stroke="var(--pc-home-navy)"
          strokeWidth="1.5"
          initial={animate ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.9 + i * 0.08, ease: EASE }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
      <motion.g
        transform="translate(410, 30)"
        initial={animate ? { scale: 0.5, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6, ease: EASE }}
      >
        <circle r="22" fill="var(--pc-home-gold)" />
        <text x="0" y="5" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="14" fontWeight="800" fill="var(--pc-home-navy)">
          %
        </text>
      </motion.g>
    </svg>
  );
}

/* ---------- Modal ---------- */

const HERO_CONFIG: Record<MetricKind, {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  Art: React.ComponentType<{ animate: boolean }>;
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

  const prefersReducedMotion = useReducedMotion();
  const animate = !prefersReducedMotion;

  if (!kind) return null;
  const cfg = HERO_CONFIG[kind];
  const Icon = cfg.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl overflow-hidden p-0 sm:rounded-2xl"
        style={{ background: "var(--pc-home-card)", color: "var(--pc-home-heading)" }}
      >
        {/* HERO — aspect ratio responsivo */}
        <div className="relative aspect-[12/5] w-full overflow-hidden sm:aspect-[12/4.5]">
          <cfg.Art animate={animate} />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 45%, color-mix(in oklab, var(--pc-home-navy) 82%, black) 100%)",
            }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5"
            initial={animate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          >
            <div>
              <div
                className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--pc-home-gold-soft)" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.eyebrow}
              </div>
              <DialogHeader className="p-0 text-left">
                <DialogTitle
                  className="text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]"
                  style={{ color: "#F5F6FA" }}
                >
                  {cfg.title}
                </DialogTitle>
              </DialogHeader>
            </div>
          </motion.div>
        </div>

        {/* CONTENT */}
        <div className="max-h-[65svh] overflow-y-auto px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
          <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--pc-text-muted)" }}>
            {cfg.subtitle}
          </p>

          {isLoading || !data ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl"
                  style={{ background: "color-mix(in oklab, var(--pc-home-navy) 8%, transparent)" }}
                />
              ))}
            </div>
          ) : (
            <MetricBody kind={kind} data={data} animate={animate} />
          )}

          {data?.totals.lastUpdate && (
            <div
              className="mt-4 flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--pc-text-muted)" }}
            >
              <Clock className="h-3 w-3" />
              Última atualização {relTime(data.totals.lastUpdate)} ·{" "}
              {data.totals.scans7d.toLocaleString("pt-BR")} preços nos últimos 7 dias
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gold";
}) {
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        borderColor: "color-mix(in oklab, var(--pc-home-line) 70%, transparent)",
        background: "color-mix(in oklab, var(--pc-home-navy) 4%, transparent)",
      }}
    >
      <div
        className="text-[9.5px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "var(--pc-text-muted)" }}
      >
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

/* ---------- Estado persistido por aba (session) ---------- */

const PAGE_SIZE = 6;

/** Persiste `{query, visible}` no sessionStorage para restaurar ao reabrir o modal. */
function usePersistedListState(storageKey: string) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { q?: string; v?: number };
        if (typeof parsed.q === "string") setQuery(parsed.q);
        if (typeof parsed.v === "number" && parsed.v >= PAGE_SIZE) setVisible(parsed.v);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ q: query, v: visible }));
    } catch {
      /* ignore */
    }
  }, [ready, storageKey, query, visible]);

  return { query, setQuery, visible, setVisible };
}

/* ---------- Barra de busca reutilizável ---------- */

function SearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-xl border px-3 py-2"
      style={{
        borderColor: "color-mix(in oklab, var(--pc-home-line) 80%, transparent)",
        background: "color-mix(in oklab, var(--pc-home-navy) 3%, transparent)",
      }}
    >
      <Search className="h-4 w-4" style={{ color: "var(--pc-text-muted)" }} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:opacity-60"
        style={{ color: "var(--pc-home-heading)" }}
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[11px] font-semibold"
          style={{ color: "var(--pc-home-navy)" }}
        >
          limpar
        </button>
      )}
    </div>
  );
}

function LoadMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  if (remaining <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors"
      style={{
        borderColor: "color-mix(in oklab, var(--pc-home-line) 80%, transparent)",
        color: "var(--pc-home-navy)",
        background: "color-mix(in oklab, var(--pc-home-navy) 3%, transparent)",
      }}
    >
      Carregar mais ({remaining} restantes)
    </button>
  );
}

/* ---------- Lista de mercados ---------- */

function MarketsList({
  stores,
  animate,
  onNavigate,
}: {
  stores: Awaited<ReturnType<typeof getMetricSpotlight>>["stores"];
  animate: boolean;
  onNavigate: () => void;
}) {
  const { query, setQuery, visible, setVisible } = usePersistedListState("pc-metric-markets");

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return stores;
    return stores.filter((s) => {
      const hay = norm(`${s.name} ${s.city ?? ""} ${s.neighborhood ?? ""}`);
      return hay.includes(q);
    });
  }, [stores, query]);

  // Reseta paginação apenas quando a busca muda (não no restore).
  const lastQueryRef = useRef(query);
  useEffect(() => {
    if (lastQueryRef.current !== query) {
      lastQueryRef.current = query;
      setVisible(PAGE_SIZE);
    }
  }, [query, setVisible]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <>
      <SectionTitle>Lista de parceiros</SectionTitle>

      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar por nome, bairro ou cidade…"
        ariaLabel="Buscar mercados"
      />

      <div
        className="mb-1 text-[11px]"
        style={{ color: "var(--pc-text-muted)" }}
        aria-live="polite"
      >
        {filtered.length === 0
          ? "Nenhum mercado encontrado"
          : `${filtered.length} ${filtered.length === 1 ? "mercado" : "mercados"}${
              query ? " para a busca" : ""
            }`}
      </div>

      <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
        {shown.map((s, i) => (
          <motion.li
            key={s.id}
            initial={animate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.24), ease: EASE }}
          >
            <Link
              to="/estabelecimento/$slug"
              params={{ slug: s.slug }}
              onClick={onNavigate}
              className="flex items-center gap-3 py-2.5 transition-colors hover:bg-[color-mix(in_oklab,var(--pc-home-navy)_4%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--pc-home-gold)_60%,transparent)] rounded-lg -mx-1 px-1"
              aria-label={`Abrir página do mercado ${s.name}`}
            >
              <div
                className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border text-[11px] font-bold"
                style={{
                  borderColor: "var(--pc-home-line)",
                  background:
                    s.brandColor ?? "color-mix(in oklab, var(--pc-home-navy) 6%, transparent)",
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
                <div
                  className="truncate text-sm font-semibold"
                  style={{ color: "var(--pc-home-heading)" }}
                >
                  {s.name}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--pc-text-muted)" }}>
                  {[s.neighborhood, s.city].filter(Boolean).join(" · ") || "Feijó, AC"}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-sm font-bold tabular-nums"
                  style={{ color: "var(--pc-home-gold)" }}
                >
                  {s.productCount}
                </div>
                <div className="text-[10px]" style={{ color: "var(--pc-text-muted)" }}>
                  itens · {relTime(s.lastUpdate)}
                </div>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 opacity-40"
                style={{ color: "var(--pc-home-navy)" }}
                aria-hidden
              />
            </Link>
          </motion.li>
        ))}
      </ul>

      <LoadMoreButton
        remaining={filtered.length - visible}
        onClick={() => setVisible(visible + PAGE_SIZE)}
      />
    </>
  );
}

/* ---------- Lista de últimas atualizações (aba produtos) ---------- */

function ProductsRecentList({
  updates,
  animate,
}: {
  updates: Awaited<ReturnType<typeof getMetricSpotlight>>["recentUpdates"];
  animate: boolean;
}) {
  const { query, setQuery, visible, setVisible } = usePersistedListState("pc-metric-products");
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return updates;
    return updates.filter((u) =>
      norm(`${u.productName} ${u.marketName ?? ""}`).includes(q),
    );
  }, [updates, query]);

  const lastQueryRef = useRef(query);
  useEffect(() => {
    if (lastQueryRef.current !== query) {
      lastQueryRef.current = query;
      setVisible(PAGE_SIZE);
    }
  }, [query, setVisible]);

  const shown = filtered.slice(0, visible);

  return (
    <>
      <SectionTitle>Últimas atualizações</SectionTitle>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar por produto ou mercado…"
        ariaLabel="Buscar atualizações de preço"
      />
      <div
        className="mb-1 text-[11px]"
        style={{ color: "var(--pc-text-muted)" }}
        aria-live="polite"
      >
        {filtered.length === 0
          ? "Nenhuma atualização encontrada"
          : `${filtered.length} ${filtered.length === 1 ? "atualização" : "atualizações"}`}
      </div>
      <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
        {shown.map((u, i) => (
          <motion.li
            key={`${u.productName}-${u.when}-${i}`}
            className="flex items-center gap-3 py-2"
            initial={animate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: Math.min(i * 0.02, 0.16), ease: EASE }}
          >
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[13px] font-semibold"
                style={{ color: "var(--pc-home-heading)" }}
              >
                {u.productName}
              </div>
              <div className="truncate text-[11px]" style={{ color: "var(--pc-text-muted)" }}>
                {u.marketName ?? "—"} · {relTime(u.when)}
              </div>
            </div>
            <div
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--pc-home-gold)" }}
            >
              {currency(u.price)}
            </div>
          </motion.li>
        ))}
      </ul>
      <LoadMoreButton
        remaining={filtered.length - visible}
        onClick={() => setVisible(visible + PAGE_SIZE)}
      />
    </>
  );
}

/* ---------- Lista de economias (aba savings) ---------- */

function SavingsList({
  items,
  animate,
}: {
  items: Awaited<ReturnType<typeof getMetricSpotlight>>["topSavings"];
  animate: boolean;
}) {
  const { query, setQuery, visible, setVisible } = usePersistedListState("pc-metric-savings");
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return items;
    return items.filter((s) =>
      norm(`${s.displayName} ${s.category ?? ""} ${s.cheapestStore ?? ""}`).includes(q),
    );
  }, [items, query]);

  const lastQueryRef = useRef(query);
  useEffect(() => {
    if (lastQueryRef.current !== query) {
      lastQueryRef.current = query;
      setVisible(PAGE_SIZE);
    }
  }, [query, setVisible]);

  const shown = filtered.slice(0, visible);

  return (
    <>
      <SectionTitle>Maiores economias agora</SectionTitle>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Buscar produto, categoria ou mercado…"
        ariaLabel="Buscar economias"
      />
      <div
        className="mb-1 text-[11px]"
        style={{ color: "var(--pc-text-muted)" }}
        aria-live="polite"
      >
        {filtered.length === 0
          ? "Nenhuma economia encontrada"
          : `${filtered.length} ${filtered.length === 1 ? "item comparado" : "itens comparados"}`}
      </div>
      <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
        {shown.map((s, i) => (
          <motion.li
            key={`${s.catalogSlug ?? s.displayName}-${i}`}
            className="flex items-center gap-3 py-2.5"
            initial={animate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: Math.min(i * 0.03, 0.18), ease: EASE }}
          >
            <div
              className="grid h-11 w-14 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums"
              style={{
                background:
                  "linear-gradient(135deg, var(--pc-home-gold), var(--pc-home-gold-soft))",
                color: "var(--pc-home-navy)",
              }}
            >
              {Math.round(s.savingsPct)}%
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[13px] font-semibold"
                style={{ color: "var(--pc-home-heading)" }}
              >
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
              <div
                className="text-sm font-bold tabular-nums"
                style={{ color: "var(--pc-home-gold)" }}
              >
                {currency(s.minPrice)}
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
      <LoadMoreButton
        remaining={filtered.length - visible}
        onClick={() => setVisible(visible + PAGE_SIZE)}
      />
    </>
  );
}


function MetricBody({
  kind,
  data,
  animate,
}: {
  kind: MetricKind;
  data: Awaited<ReturnType<typeof getMetricSpotlight>>;
  animate: boolean;
}) {
  if (kind === "markets") {
    return (
      <>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCell label="Mercados" value={data.totals.establishments.toString()} tone="gold" />
          <StatCell label="Produtos" value={data.totals.products.toLocaleString("pt-BR")} />
          <StatCell label="Preços/7d" value={data.totals.scans7d.toLocaleString("pt-BR")} />
        </div>

        <MarketsList stores={data.stores} animate={animate} />

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
          <StatCell
            label="Cadastrados"
            value={data.totals.products.toLocaleString("pt-BR")}
            tone="gold"
          />
          <StatCell label="Categorias" value={data.topCategories.length.toString()} />
          <StatCell label="Preços/7d" value={data.totals.scans7d.toLocaleString("pt-BR")} />
        </div>

        <SectionTitle>Distribuição por categoria</SectionTitle>
        <div className="space-y-2">
          {data.topCategories.map((c, i) => {
            const max = data.topCategories[0]?.count ?? 1;
            const pct = Math.max(6, Math.round((c.count / max) * 100));
            return (
              <div key={c.key} className="flex items-center gap-3">
                <div
                  className="w-28 shrink-0 truncate text-[12px]"
                  style={{ color: "var(--pc-home-heading)" }}
                >
                  {c.label}
                </div>
                <div
                  className="relative h-2 flex-1 overflow-hidden rounded-full"
                  style={{ background: "color-mix(in oklab, var(--pc-home-navy) 8%, transparent)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--pc-home-gold-soft), var(--pc-home-gold))",
                    }}
                    initial={animate ? { width: 0 } : false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: 0.05 + i * 0.05, ease: EASE }}
                  />
                </div>
                <div
                  className="w-10 text-right text-[12px] font-semibold tabular-nums"
                  style={{ color: "var(--pc-text-muted)" }}
                >
                  {c.count}
                </div>
              </div>
            );
          })}
        </div>

        <SectionTitle>Últimas atualizações</SectionTitle>
        <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
          {data.recentUpdates.slice(0, 6).map((u, i) => (
            <motion.li
              key={i}
              className="flex items-center gap-3 py-2"
              initial={animate ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.04, ease: EASE }}
            >
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[13px] font-semibold"
                  style={{ color: "var(--pc-home-heading)" }}
                >
                  {u.productName}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--pc-text-muted)" }}>
                  {u.marketName ?? "—"} · {relTime(u.when)}
                </div>
              </div>
              <div
                className="text-sm font-bold tabular-nums"
                style={{ color: "var(--pc-home-gold)" }}
              >
                {currency(u.price)}
              </div>
            </motion.li>
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
        <StatCell
          label="Comparados"
          value={data.totals.productsCompared.toLocaleString("pt-BR")}
        />
      </div>

      <SectionTitle>Maiores economias agora</SectionTitle>
      <ul className="divide-y" style={{ borderColor: "var(--pc-home-line)" }}>
        {data.topSavings.map((s, i) => (
          <motion.li
            key={i}
            className="flex items-center gap-3 py-2.5"
            initial={animate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: i * 0.05, ease: EASE }}
          >
            <div
              className="grid h-11 w-14 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums"
              style={{
                background:
                  "linear-gradient(135deg, var(--pc-home-gold), var(--pc-home-gold-soft))",
                color: "var(--pc-home-navy)",
              }}
            >
              {Math.round(s.savingsPct)}%
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[13px] font-semibold"
                style={{ color: "var(--pc-home-heading)" }}
              >
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
              <div
                className="text-sm font-bold tabular-nums"
                style={{ color: "var(--pc-home-gold)" }}
              >
                {currency(s.minPrice)}
              </div>
            </div>
          </motion.li>
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
