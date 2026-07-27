import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StoreBadge } from "@/components/brand/StoreBadge";
import { getMetricSpotlight } from "@/lib/metric-spotlight.functions";

export type MetricKind = "markets" | "products" | "savings";

const currency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const num = (n: number) => n.toLocaleString("pt-BR");

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

/* ================================================================
 * Escala tipográfica única do modal (compacta, alto contraste)
 *   eyebrow  10px / 700 / 0.16em  — sobre navy
 *   title    17px (sm:19px) / 700
 *   meta     11.5px               — muted
 *   row      13px / 600           — foreground
 *   value    13.5px / 700 tabular — gold
 * ================================================================ */

const HERO_CONFIG: Record<
  MetricKind,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  markets: {
    eyebrow: "Rede colaborativa",
    title: "Mercados parceiros",
    subtitle: "Estabelecimentos ativos em Feijó/AC com preços da comunidade.",
    icon: ShieldCheck,
  },
  products: {
    eyebrow: "Catálogo verificado",
    title: "Produtos cadastrados",
    subtitle: "Itens com marca, gramagem e histórico em pelo menos um mercado.",
    icon: Package,
  },
  savings: {
    eyebrow: "Economia real",
    title: "Diferença entre mercados",
    subtitle: "Variação entre o menor e o maior preço do mesmo produto.",
    icon: TrendingDown,
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
        className="flex max-h-[88svh] w-[calc(100vw-1.5rem)] max-w-[30rem] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:text-white/85 [&>button:last-child]:hover:bg-white/15 [&>button:last-child]:hover:text-white"
      >
        {/* ===== HERO compacto: faixa navy de 2 linhas ===== */}
        <div
          className="relative shrink-0 overflow-hidden px-4 py-3 sm:px-5"
          style={{
            background:
              "linear-gradient(135deg, var(--pc-home-navy) 0%, color-mix(in oklab, var(--pc-home-navy) 88%, black) 100%)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--pc-home-gold) 40%, transparent) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--pc-home-gold), var(--pc-home-gold-soft))",
                color: "var(--pc-home-navy)",
              }}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "var(--pc-home-gold-soft)" }}
              >
                {cfg.eyebrow}
              </div>
              <DialogHeader className="space-y-0 p-0 text-left">
                <DialogTitle
                  className="truncate text-[17px] font-bold leading-tight tracking-tight sm:text-[19px]"
                  style={{ color: "#F5F6FA" }}
                >
                  {cfg.title}
                </DialogTitle>
                <DialogDescription
                  className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug"
                  style={{ color: "rgb(238 242 250 / 0.95)" }}
                >
                  {cfg.subtitle}
                </DialogDescription>

              </DialogHeader>
            </div>
            <span className="w-7 shrink-0" aria-hidden />
          </div>

          {/* Stat strip dentro do hero — economiza altura */}
          <div className="relative mt-3 grid grid-cols-3 gap-2">
            {(isLoading || !data
              ? [
                  ["—", "—"],
                  ["—", "—"],
                  ["—", "—"],
                ]
              : statStrip(kind, data)
            ).map(([label, value], i) => (
              <div
                key={i}
                className="rounded-lg border border-white/20 bg-white/[0.10] px-2 py-1.5"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
                  {label}
                </div>

                <div
                  className="text-[15px] font-bold leading-tight tabular-nums"
                  style={{ color: i === 0 ? "var(--pc-home-gold)" : "#F5F6FA" }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 sm:px-4">
          {isLoading || !data ? (
            <ul className="space-y-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="h-11 animate-pulse rounded-lg bg-muted/60" />
              ))}
            </ul>
          ) : (
            <MetricBody kind={kind} data={data} onNavigate={() => onOpenChange(false)} />
          )}
        </div>

        {/* ===== FOOTER fixo ===== */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-3 py-2 sm:px-4">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 shrink-0" />
            Dados colaborativos de Feijó/AC
          </span>
          <Link
            to={kind === "markets" ? "/estabelecimentos" : kind === "products" ? "/buscar" : "/comparador"}
            onClick={() => onOpenChange(false)}
            className="pc-metric-link inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            {kind === "markets" ? "Ver mercados" : kind === "products" ? "Ver catálogo" : "Comparador"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function statStrip(
  kind: MetricKind,
  data: Awaited<ReturnType<typeof getMetricSpotlight>>,
): [string, string][] {
  if (kind === "markets")
    return [
      ["Mercados", num(data.totals.establishments)],
      ["Produtos", num(data.totals.products)],
      ["Comparáveis", num(data.totals.productsCompared)],
    ];
  if (kind === "products")
    return [
      ["Cadastrados", num(data.totals.products)],
      ["Categorias", num(data.topCategories.length)],
      ["Mercados", num(data.totals.establishments)],
    ];
  return [
    ["Média", `${data.totals.avgSavingsPct}%`],
    ["Melhor", `${data.totals.bestSavingsPct}%`],
    ["Comparados", num(data.totals.productsCompared)],
  ];
}


/* ---------- Primitivos compactos ---------- */

function SectionLabel({ children, count }: { children: React.ReactNode; count?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </h3>
      {count && (
        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

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
    <div className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 focus-within:border-[var(--pc-home-gold)] focus-within:ring-2 focus-within:ring-[color-mix(in_oklab,var(--pc-home-gold)_35%,transparent)]">
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="pc-metric-ink shrink-0 text-[11px] font-bold uppercase tracking-wide"
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
      className="mt-2 w-full rounded-lg border border-border bg-muted/40 py-1.5 text-[11.5px] font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-home-gold)]"
    >
      Carregar mais ({remaining})
    </button>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border py-5 text-center text-[12px] text-muted-foreground">
      {children}
    </div>
  );
}

/* ---------- Estado persistido por aba (session) ---------- */

const PAGE_SIZE = 6;

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

  // Reseta paginação quando a busca muda (não no restore).
  const lastQueryRef = useRef(query);
  useEffect(() => {
    if (lastQueryRef.current !== query) {
      lastQueryRef.current = query;
      setVisible(PAGE_SIZE);
    }
  }, [query]);

  return { query, setQuery, visible, setVisible };
}

/* ---------- Mercados ---------- */

function MarketsList({
  stores,
  onNavigate,
}: {
  stores: Awaited<ReturnType<typeof getMetricSpotlight>>["stores"];
  onNavigate: () => void;
}) {
  const { query, setQuery, visible, setVisible } = usePersistedListState("pc-metric-markets");

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return stores;
    return stores.filter((s) =>
      norm(`${s.name} ${s.city ?? ""} ${s.neighborhood ?? ""}`).includes(q),
    );
  }, [stores, query]);

  const shown = filtered.slice(0, visible);

  return (
    <>
      <SectionLabel count={`${filtered.length} ${filtered.length === 1 ? "mercado" : "mercados"}`}>
        Lista de parceiros
      </SectionLabel>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Nome, bairro ou cidade…"
        ariaLabel="Buscar mercados"
      />

      {shown.length === 0 ? (
        <EmptyRow>Nenhum mercado encontrado.</EmptyRow>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((s) => (
            <li key={s.id}>
              <Link
                to="/estabelecimento/$slug"
                params={{ slug: s.slug }}
                onClick={onNavigate}
                aria-label={`Abrir página do mercado ${s.name}`}
                className="-mx-1 flex items-center gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-home-gold)]"
              >
                <StoreBadge
                  name={s.name}
                  logoUrl={s.logoUrl}
                  brandColor={s.brandColor}
                  size="xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {s.name}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {[s.neighborhood, s.city].filter(Boolean).join(" · ") || "Feijó, AC"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className="text-[13.5px] font-bold tabular-nums"
                    style={{ color: "var(--pc-home-gold)" }}
                  >
                    {num(s.productCount)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">itens</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <LoadMoreButton
        remaining={filtered.length - visible}
        onClick={() => setVisible(visible + PAGE_SIZE)}
      />
    </>
  );
}

/* ---------- Produtos ---------- */

function CategoryBars({
  categories,
}: {
  categories: Awaited<ReturnType<typeof getMetricSpotlight>>["topCategories"];
}) {
  const top = categories.slice(0, 6);
  const max = top[0]?.count ?? 1;
  if (top.length === 0) return null;
  return (
    <>
      <SectionLabel count={`top ${top.length}`}>Distribuição por categoria</SectionLabel>
      <ul className="mb-3 space-y-1.5">
        {top.map((c) => (
          <li key={c.key} className="flex items-center gap-2">
            <span className="w-[88px] shrink-0 truncate text-[11.5px] font-medium text-foreground">
              {c.label}
            </span>
            <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.max(6, Math.round((c.count / max) * 100))}%`,
                  background:
                    "linear-gradient(90deg, var(--pc-home-gold-soft), var(--pc-home-gold))",
                }}
              />
            </span>
            <span className="w-9 shrink-0 text-right text-[11.5px] font-bold tabular-nums text-muted-foreground">
              {c.count}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProductsRecentList({
  updates,
  onNavigate,
}: {
  updates: Awaited<ReturnType<typeof getMetricSpotlight>>["recentUpdates"];
  onNavigate: () => void;
}) {
  const { query, setQuery, visible, setVisible } = usePersistedListState("pc-metric-products");
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return updates;
    return updates.filter((u) => norm(`${u.productName} ${u.marketName ?? ""}`).includes(q));
  }, [updates, query]);

  const shown = filtered.slice(0, visible);

  return (
    <>
      <SectionLabel count={`${filtered.length}`}>Últimas atualizações</SectionLabel>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Produto ou mercado…"
        ariaLabel="Buscar atualizações de preço"
      />
      {shown.length === 0 ? (
        <EmptyRow>Nenhuma atualização encontrada.</EmptyRow>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((u, i) => (
            <li key={`${u.productName}-${u.when}-${i}`} className="flex items-center gap-2.5 py-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to="/buscar"
                  search={{ q: u.productName } as never}
                  onClick={onNavigate}
                  aria-label={`Comparar preços de ${u.productName}`}
                  className="pc-metric-hover block truncate text-[13px] font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-home-gold)]"
                >
                  {u.productName}
                </Link>
                <div className="truncate text-[11px] text-muted-foreground">
                  {u.marketSlug && u.marketName ? (
                    <Link
                      to="/estabelecimento/$slug"
                      params={{ slug: u.marketSlug }}
                      onClick={onNavigate}
                      className="pc-metric-ink font-semibold underline-offset-2 hover:underline"
                    >
                      {u.marketName}
                    </Link>
                  ) : (
                    (u.marketName ?? "—")
                  )}
                </div>
              </div>
              <div
                className="shrink-0 text-[13.5px] font-bold tabular-nums"
                style={{ color: "var(--pc-home-gold)" }}
              >
                {currency(u.price)}
              </div>
            </li>
          ))}
        </ul>
      )}
      <LoadMoreButton
        remaining={filtered.length - visible}
        onClick={() => setVisible(visible + PAGE_SIZE)}
      />
    </>
  );
}

/* ---------- Economias ---------- */

function SavingsList({
  items,
  onNavigate,
}: {
  items: Awaited<ReturnType<typeof getMetricSpotlight>>["topSavings"];
  onNavigate: () => void;
}) {
  const { query, setQuery, visible, setVisible } = usePersistedListState("pc-metric-savings");
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return items;
    return items.filter((s) =>
      norm(`${s.displayName} ${s.category ?? ""} ${s.cheapestStore ?? ""}`).includes(q),
    );
  }, [items, query]);

  const shown = filtered.slice(0, visible);

  return (
    <>
      <SectionLabel count={`${filtered.length} itens`}>Maiores economias agora</SectionLabel>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Produto, categoria ou mercado…"
        ariaLabel="Buscar economias"
      />
      {shown.length === 0 ? (
        <EmptyRow>Nenhuma economia encontrada.</EmptyRow>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((s, i) => (
            <li
              key={`${s.catalogSlug ?? s.displayName}-${i}`}
              className="flex items-center gap-2.5 py-2"
            >
              <span
                className="grid h-8 w-11 shrink-0 place-items-center rounded-lg text-[12.5px] font-bold tabular-nums"
                style={{
                  background:
                    "linear-gradient(135deg, var(--pc-home-gold), var(--pc-home-gold-soft))",
                  color: "var(--pc-home-navy)",
                }}
              >
                {Math.round(s.savingsPct)}%
              </span>
              <div className="min-w-0 flex-1">
                {s.catalogSlug ? (
                  <Link
                    to="/produto/$slug"
                    params={{ slug: s.catalogSlug }}
                    onClick={onNavigate}
                    aria-label={`Ver comparação de ${s.displayName}`}
                    className="pc-metric-hover block truncate text-[13px] font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-home-gold)]"
                  >
                    {s.displayName}
                  </Link>
                ) : (
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {s.displayName}
                  </div>
                )}
                <div className="truncate text-[11px] text-muted-foreground">
                  {s.storeCount} mercados · menor em{" "}
                  {s.cheapestStoreSlug && s.cheapestStore ? (
                    <Link
                      to="/estabelecimento/$slug"
                      params={{ slug: s.cheapestStoreSlug }}
                      onClick={onNavigate}
                      className="pc-metric-ink font-semibold underline-offset-2 hover:underline"
                    >
                      {s.cheapestStore}
                    </Link>
                  ) : (
                    (s.cheapestStore ?? "—")
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right leading-tight">
                <div className="text-[11px] line-through text-muted-foreground">
                  {currency(s.maxPrice)}
                </div>
                <div
                  className="text-[13.5px] font-bold tabular-nums"
                  style={{ color: "var(--pc-home-gold)" }}
                >
                  {currency(s.minPrice)}
                </div>
              </div>
              {s.catalogSlug && (
                <Link
                  to="/produto/$slug"
                  params={{ slug: s.catalogSlug }}
                  onClick={onNavigate}
                  aria-label={`Abrir comparação de ${s.displayName}`}
                  className="pc-metric-ink-hover grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-home-gold)]"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
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
  onNavigate,
}: {
  kind: MetricKind;
  data: Awaited<ReturnType<typeof getMetricSpotlight>>;
  onNavigate: () => void;
}) {
  if (kind === "markets") {
    if (data.stores.length === 0)
      return <EmptyRow>Nenhum mercado cadastrado ainda.</EmptyRow>;
    return <MarketsList stores={data.stores} onNavigate={onNavigate} />;
  }

  if (kind === "products") {
    return (
      <>
        <CategoryBars categories={data.topCategories} />
        <ProductsRecentList updates={data.recentUpdates} onNavigate={onNavigate} />
      </>
    );
  }

  return <SavingsList items={data.topSavings} onNavigate={onNavigate} />;
}

/** Ícone exportado para reuso em cartões de métrica. */
export const MetricIcons = { Store };
