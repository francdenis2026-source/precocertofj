import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { Link } from "@tanstack/react-router";
import { getHomeShowcase, type HomeShowcase } from "@/lib/home-showcase.functions";
import { supabase } from "@/integrations/supabase/client";

import {
  Package,
  Tag,
  Scale,
  Trophy,
  TrendingDown,
  X,
  Store as StoreIcon,
  GitCompare,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { shortenStoreName } from "@/lib/store-name";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TeaserCard } from "@/components/paywall/TeaserGate";
import { PriceCard, Badge as DSBadge, formatBRL } from "@/components/ds";

const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;


const CATEGORY_LABELS: Record<string, string> = {
  mercearia: "Mercearia",
  bebidas: "Bebidas",
  bebidas_em_po: "Bebidas em pó",
  laticinios: "Laticínios",
  carnes: "Carnes",
  padaria: "Padaria",
  hortifruti: "Hortifruti",
  biscoitos: "Biscoitos",
  doces: "Doces",
  congelados: "Congelados",
  higiene: "Higiene",
  limpeza: "Limpeza",
  outros: "Outros",
};

const MAX_SELECT = 5;
const MIN_SELECT = 2;

type StoreEntry = {
  establishment_id: string;
  store_name: string;
  price: number;
  product_name: string;
};

type Comparison = {
  product_key: string;
  display_name: string;
  category: string;
  size_value: number | null;
  size_unit: string;
  store_count: number;
  min_price: number;
  avg_price: number;
  max_price: number;
  savings_pct: number;
  cheapest_store: string;
  cheapest_establishment_id: string;
  image_url: string | null;
  catalog_slug: string | null;
  stores: StoreEntry[];
};

function formatSize(size_value: number | null, size_unit: string): string | null {
  if (size_value == null) return null;
  if (size_unit === "g" && size_value >= 1000)
    return `${(size_value / 1000).toLocaleString("pt-BR")} kg`;
  if (size_unit === "ml" && size_value >= 1000)
    return `${(size_value / 1000).toLocaleString("pt-BR")} L`;
  return `${size_value.toLocaleString("pt-BR")} ${size_unit}`;
}

export function HomeShowcaseSection() {
  const fetchData = useServerFn(getHomeShowcase);
  const {
    data,
    isLoading: loadingProducts,
    isError: errorProducts,
    refetch: refetchProducts,
  } = useQuery<HomeShowcase>({
    queryKey: ["home-showcase"],
    queryFn: () => fetchData(),
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
  });

  const {
    data: comparisons,
    isLoading: loadingCompare,
    isError: errorCompare,
    refetch: refetchCompare,
  } = useQuery<Comparison[]>({
    queryKey: ["price-comparisons-home"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_price_comparisons");
      if (error) throw error;
      return (data as unknown as Comparison[]) ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const products = data?.products ?? [];
  const hasProducts = products.length > 0;
  const hasComparisons = (comparisons?.length ?? 0) > 0;

  // A vitrine agora exibe SEMPRE apenas produtos com ficha cadastrada no
  // catálogo (catalog_slug != null) — verificados pela administração.
  const filteredComparisons = useMemo(() => {
    const list = comparisons ?? [];
    return list.filter((r) => r.catalog_slug != null && r.catalog_slug !== "");
  }, [comparisons]);
  const hasFilteredComparisons = filteredComparisons.length > 0;


  const isLoading = loadingProducts || loadingCompare;
  const isError = errorProducts || errorCompare;

  // Skeleton state
  if (isLoading && !hasProducts && !hasComparisons) {
    return (
      <section aria-label="Carregando vitrine" className="mt-3 space-y-5 md:mt-4">
        <ShowcaseSkeleton title="Menores preços destacados" />
        <ShowcaseSkeleton title="Produtos recém-cadastrados" narrow />
      </section>
    );
  }

  // Error state
  if (isError && !hasProducts && !hasComparisons) {
    return (
      <section
        aria-label="Erro ao carregar vitrine"
        className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center"
      >
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
        <p className="text-sm font-medium text-foreground">
          Não conseguimos carregar a vitrine agora.
        </p>
        <button
          type="button"
          onClick={() => {
            refetchProducts();
            refetchCompare();
          }}
          className="mt-1 inline-flex h-8 items-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/5"
        >
          Tentar novamente
        </button>
      </section>
    );
  }

  if (!hasProducts && !hasComparisons) {
    return (
      <section aria-label="Vitrine vazia" className="mt-3">
        <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-[13px] text-muted-foreground">
          Nossa vitrine ainda está sendo montada — em breve os melhores preços aparecem aqui.
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Vitrine da plataforma" className="mt-3 space-y-5 md:mt-4 md:space-y-6">
      {hasFilteredComparisons && <CheapestSpotlightRow rows={filteredComparisons} />}
      {hasProducts && (
        <RecentProductsRow products={products} comparisons={filteredComparisons} />
      )}
      {hasFilteredComparisons && <CheapestComparisonsBlock rows={filteredComparisons} />}
      {hasComparisons && !hasFilteredComparisons && (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-center text-[12.5px] text-muted-foreground">
          Nenhum produto cadastrado no catálogo tem preço registrado no momento.
        </div>
      )}

    </section>
  );
}

/* ---------- Skeleton ---------- */
function ShowcaseSkeleton({ title, narrow }: { title: string; narrow?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="inline-flex h-4 w-16 animate-pulse rounded-full bg-muted" />
        <span className="h-3 w-40 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="flex gap-2 overflow-hidden pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={
              "shrink-0 animate-pulse rounded-2xl border border-border bg-muted/40 " +
              (narrow ? "h-[196px] w-[108px]" : "h-[220px] w-[168px]")
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- PriceCard Spotlight — melhores preços ---------- */
function CheapestSpotlightRow({ rows }: { rows: Comparison[] }) {
  const top = useMemo(
    () =>
      [...rows]
        .filter((r) => Number(r.min_price) > 0)
        .sort((a, b) => Number(a.savings_pct) - Number(b.savings_pct))
        .sort((a, b) => Number(b.savings_pct) - Number(a.savings_pct))
        .slice(0, 6),
    [rows],
  );
  if (top.length === 0) return null;

  return (
    <ShowcaseRow
      icon={<Sparkles className="h-3 w-3" strokeWidth={2.2} />}
      eyebrow="Destaques"
      title="Menores preços do dia"
      right={
        <Link
          to="/melhores-precos"
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          Ver todos →
        </Link>
      }
    >
      <motion.div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
        }}
      >
        {top.map((r) => {
          const slug = r.catalog_slug ?? r.display_name;
          const isMulti = Number(r.store_count) > 1;
          const previous = isMulti ? Number(r.avg_price) : null;
          return (
            <motion.div
              key={r.product_key}
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.98 },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 320, damping: 26 },
                },
              }}
            >
              <Link
                to="/produto-publico/$slug"
                params={{ slug }}
                aria-label={`Ver ${r.display_name}`}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <PriceCard
                  compact
                  name={r.display_name}
                  brand={null}
                  imageUrl={r.image_url}
                  price={Number(r.min_price)}
                  previousPrice={previous}
                  marketName={shortenStoreName(r.cheapest_store)}
                  unit={r.size_value ? `${r.size_value} ${r.size_unit}` : null}
                  highlight={isMulti ? "Menor preço" : null}
                />
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
      {top.length > 4 && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <DSBadge variant="savingsSoft" size="sm">
            {top.length} destaques
          </DSBadge>
          <span>economia média de {formatBRL(top.reduce((s, r) => s + (Number(r.avg_price) - Number(r.min_price)), 0) / top.length)}</span>
        </p>
      )}
    </ShowcaseRow>
  );
}


function RecentProductsRow({
  products,
  comparisons,
}: {
  products: HomeShowcase["products"];
  comparisons: Comparison[];
}) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL = 8;
  const visible = showAll ? products : products.slice(0, INITIAL);
  const hasMore = products.length > INITIAL;

  const priceById = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
    const byName = new Map<string, Comparison>();
    for (const c of comparisons) byName.set(norm(c.display_name), c);
    const map = new Map<string, Comparison>();
    for (const p of products) {
      const hit = byName.get(norm(p.displayName));
      if (hit) map.set(p.id, hit);
    }
    return map;
  }, [products, comparisons]);

  return (
    <ShowcaseRow
      icon={<Package className="h-3 w-3" strokeWidth={2.2} />}
      eyebrow="Catálogo"
      title="Produtos recém-cadastrados"
      right={
        hasMore ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            {showAll ? "Ver menos" : `Ver mais (${products.length - INITIAL})`}
          </button>
        ) : null
      }
    >
      <div className="scroll-x flex items-stretch gap-2 overflow-x-auto pb-1.5 [perspective:1200px]">
        {visible.map((p, idx) => {
          const cmp = priceById.get(p.id);
          if (cmp) {
            const slug = cmp.catalog_slug ?? cmp.display_name;
            const isMulti = Number(cmp.store_count) > 1;
            const previous = isMulti ? Number(cmp.avg_price) : null;
            return (
              <div key={p.id} className="w-[168px] shrink-0 snap-start">
                <TeaserCard id={p.id} index={idx} variant="compact">
                  <Link
                    to="/produto-publico/$slug"
                    params={{ slug }}
                    aria-label={`Ver ${cmp.display_name}`}
                    className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <PriceCard
                      compact
                      name={cmp.display_name}
                      brand={p.brand}
                      imageUrl={cmp.image_url ?? p.imageUrl}
                      price={Number(cmp.min_price)}
                      previousPrice={previous}
                      marketName={shortenStoreName(cmp.cheapest_store)}
                      unit={cmp.size_value ? `${cmp.size_value} ${cmp.size_unit}` : null}
                      highlight={isMulti ? "Menor preço" : null}
                    />
                  </Link>
                </TeaserCard>
              </div>
            );
          }
          return (
            <article
              key={p.id}
              className="group relative flex h-[196px] snap-start shrink-0 w-[108px] flex-col rounded-md border border-border bg-surface p-1.5 shadow-sm transition-transform duration-300 ease-out hover:-translate-y-0.5"
            >
              <TeaserCard id={p.id} index={idx} variant="compact">
                <Link
                  to="/produto-publico/$slug"
                  params={{ slug: p.id }}
                  aria-label={`Ver detalhes de ${p.displayName}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                >
                  <ProductImage
                    src={p.imageUrl}
                    alt={p.displayName}
                    width={108}
                    height={108}
                    sizes="108px"
                    fallbackIcon={Package}
                    fallbackLabel={p.displayName}
                    className="relative mx-auto aspect-square w-full rounded-sm bg-gradient-to-br from-muted to-background"
                    imageClassName="object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                  />
                  <p className="mt-1 line-clamp-2 min-h-[2.2em] text-[11px] font-semibold leading-tight text-foreground">
                    {p.displayName}
                  </p>
                  <p className="mt-0.5 line-clamp-1 min-h-[11px] text-[11px] text-muted-foreground">
                    {p.brand ?? ""}
                  </p>
                </Link>
                <div className="mt-auto flex justify-end pt-1">
                  <AddToCartButton catalogId={p.id} label={p.displayName} variant="compact" />
                </div>
              </TeaserCard>
            </article>
          );
        })}
      </div>
    </ShowcaseRow>
  );
}



function CheapestComparisonsBlock({ rows }: { rows: Comparison[] }) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Comparison | null>(null);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_LIMIT = 8;
  const MAX_LIMIT = 24;


  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const c = (r.category || "outros").trim() || "outros";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filteredAll = useMemo(() => {
    const list = activeCat ? rows.filter((r) => (r.category || "outros") === activeCat) : rows;
    return [...list].sort((a, b) => Number(a.min_price) - Number(b.min_price)).slice(0, MAX_LIMIT);
  }, [rows, activeCat]);
  const filtered = showAll ? filteredAll : filteredAll.slice(0, INITIAL_LIMIT);
  const hasMore = filteredAll.length > INITIAL_LIMIT;


  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, key];
    });
  };

  const selectedRows = useMemo(
    () => selected.map((k) => rows.find((r) => r.product_key === k)).filter(Boolean) as Comparison[],
    [selected, rows],
  );

  return (
    <ShowcaseRow
      icon={<Tag className="h-3 w-3" strokeWidth={2.2} />}
      eyebrow="Ofertas"
      title="Menores preços da rede"
      right={
        <Link
          to="/melhores-precos"
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          Ver todos →
        </Link>
      }
    >

      {/* Chips de categoria */}
      <div className="scroll-x -mx-1 mb-2 flex gap-1 overflow-x-auto px-1 pb-1">
        <CatChip active={activeCat === null} onClick={() => setActiveCat(null)}>
          Todas <span className="ml-1 opacity-60">{rows.length}</span>
        </CatChip>
        {categoryCounts.map(([cat, n]) => (
          <CatChip key={cat} active={activeCat === cat} onClick={() => setActiveCat(cat)}>
            {CATEGORY_LABELS[cat] ?? cat} <span className="ml-1 opacity-60">{n}</span>
          </CatChip>
        ))}
      </div>

      {/* Grid de cards */}
      <div className="scroll-x flex items-stretch gap-2 overflow-x-auto pb-1.5">
        {filtered.map((r, idx) => {
          const isSel = selected.includes(r.product_key);
          const isMulti = Number(r.store_count) > 1;
          const size = formatSize(r.size_value, r.size_unit);
          const slug = r.catalog_slug ?? r.display_name;
          return (
            <article
              key={r.product_key}
              className={
                "relative flex h-[236px] snap-start shrink-0 w-[124px] flex-col overflow-hidden rounded-lg border bg-surface shadow-sm transition-all " +
                (isSel ? "border-primary ring-2 ring-primary/30" : "border-border hover:-translate-y-0.5")
              }
            >
              <div className="hairline-gold h-[1.5px] w-full" aria-hidden />
              <TeaserCard id={r.product_key} index={idx} variant="compact">
              <button
                type="button"
                aria-pressed={isSel}
                aria-label={isSel ? "Remover da comparação" : "Selecionar para comparar"}
                onClick={() => toggleSelect(r.product_key)}
                className={
                  "absolute left-1 top-2 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[11px] font-bold transition " +
                  (isSel
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/90 text-muted-foreground hover:border-primary/60 hover:text-primary")
                }
              >
                {isSel ? "✓" : "+"}
              </button>
              {isMulti && (
                <span className="absolute right-1 top-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-savings px-1 py-[1px] text-[11px] font-bold uppercase tracking-wider text-savings-foreground shadow-sm">
                  <TrendingDown className="h-2 w-2" />
                  -{Number(r.savings_pct).toFixed(0)}%
                </span>
              )}

              <Link
                to="/produto-publico/$slug"
                params={{ slug }}
                aria-label={`Ver detalhes de ${r.display_name}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ProductImage
                  src={r.image_url}
                  alt={r.display_name}
                  width={124}
                  height={124}
                  sizes="124px"
                  fallbackIcon={Tag}
                  fallbackLabel={r.display_name}
                  className="relative aspect-square w-full bg-gradient-to-br from-muted to-background"
                  imageClassName="object-contain p-2"
                />
                <div className="px-1.5 pt-1">
                  <p className="line-clamp-2 min-h-[2.2em] font-display text-[11px] font-semibold leading-tight tracking-tight text-foreground">
                    {r.display_name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    {size && (
                      <span className="font-display text-[11px] italic text-muted-foreground">
                        {size}
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <StoreIcon className="h-2 w-2" />
                      {r.store_count}
                    </span>
                  </div>
                  <div className="mt-1 border-t border-accent/25 pt-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-strong">
                      Menor
                    </p>
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="num font-display text-[12.5px] font-extrabold leading-none tracking-tight text-primary">
                        {fmt(Number(r.min_price))}
                      </p>
                      <p
                        className="line-clamp-1 font-display text-[11px] italic text-muted-foreground"
                        title={r.cheapest_store}
                      >
                        {shortenStoreName(r.cheapest_store)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1 px-1.5 pb-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setDetailRow(r)}
                  disabled={!isMulti}
                  className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-full border border-accent-strong/40 bg-accent-strong/[0.08] px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent-strong transition hover:bg-accent-strong/15 disabled:opacity-40"
                  title={isMulti ? "Comparar preços entre mercados" : "Único preço disponível"}
                >
                  <GitCompare className="h-2 w-2" />
                  Comparar
                </button>
                <AddToCartButton slug={slug} label={r.display_name} variant="compact" />
              </div>
              </TeaserCard>
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-1.5 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary transition hover:border-primary/50"
          >
            {showAll ? "Ver menos" : `Ver mais (${filteredAll.length - INITIAL_LIMIT})`}
          </button>
        </div>
      )}


      {/* Barra flutuante de seleção */}
      {selected.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-xl backdrop-blur-xl">
            <Scale className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground">
                {selected.length} de {MAX_SELECT} selecionados
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {selected.length < MIN_SELECT
                  ? `Escolha pelo menos ${MIN_SELECT} produtos`
                  : "Pronto para ver o ranking"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Limpar seleção"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={selected.length < MIN_SELECT}
              onClick={() => setRankingOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trophy className="h-3 w-3" />
              Ver ranking
            </button>
          </div>
        </div>
      )}

      <RankingDialog
        open={rankingOpen}
        onOpenChange={setRankingOpen}
        rows={selectedRows}
      />
      <CompareDialog row={detailRow} onOpenChange={(o) => !o && setDetailRow(null)} />
    </ShowcaseRow>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "h-6 shrink-0 whitespace-nowrap rounded-full border px-2 text-[11px] font-semibold uppercase tracking-wider transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function CompareDialog({
  row,
  onOpenChange,
}: {
  row: Comparison | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!row;
  const stores = row?.stores ?? [];
  const sorted = [...stores].sort((a, b) => Number(a.price) - Number(b.price));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {row && (
          <>
            <DialogHeader>
              <DialogTitle className="line-clamp-2 text-left font-display text-lg">
                {row.display_name}
              </DialogTitle>
              <DialogDescription className="text-left text-xs">
                Comparação lado a lado entre {row.store_count}{" "}
                {row.store_count === 1 ? "mercado" : "mercados"} · economia de até{" "}
                {Number(row.savings_pct).toFixed(1)}%
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-y divide-border rounded-xl border border-border bg-background">
              {sorted.map((s, idx) => {
                const isBest = idx === 0;
                const isWorst = idx === sorted.length - 1 && sorted.length > 1;
                return (
                  <li
                    key={s.establishment_id}
                    className={
                      "flex items-center justify-between gap-3 px-4 py-3 " +
                      (isBest ? "bg-savings/[0.08]" : "")
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={
                          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold " +
                          (isBest
                            ? "bg-savings text-savings-foreground"
                            : "bg-muted text-muted-foreground")
                        }
                      >
                        {isBest ? <Trophy className="h-3 w-3" /> : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {shortenStoreName(s.store_name)}
                        </p>
                        {isBest && (
                          <p className="text-[11px] font-medium uppercase tracking-wider text-savings">
                            Melhor preço
                          </p>
                        )}
                        {isWorst && !isBest && (
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Mais caro
                          </p>
                        )}
                      </div>
                    </div>
                    <p
                      className={
                        "font-mono text-base font-bold tabular-nums " +
                        (isBest
                          ? "text-savings"
                          : isWorst
                            ? "text-muted-foreground line-through"
                            : "text-foreground")
                      }
                    >
                      {fmt(Number(s.price))}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <span>Média: {fmt(Number(row.avg_price))}</span>
              <span>Máx: {fmt(Number(row.max_price))}</span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RankingDialog({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: Comparison[];
}) {
  const sorted = [...rows].sort(
    (a, b) => Number(b.savings_pct) - Number(a.savings_pct),
  );
  const totalMin = rows.reduce((s, r) => s + Number(r.min_price), 0);
  const totalAvg = rows.reduce((s, r) => s + Number(r.avg_price), 0);
  const totalMax = rows.reduce((s, r) => s + Number(r.max_price), 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-left font-display text-lg">
            Ranking de melhores preços
          </DialogTitle>
          <DialogDescription className="text-left text-xs">
            {rows.length} produtos comparados — ordenados pela maior economia entre mercados.
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-border rounded-xl border border-border bg-background">
          {sorted.map((r, idx) => (
            <li key={r.product_key} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-5 shrink-0 text-center font-mono text-[11px] text-muted-foreground">
                #{idx + 1}
              </span>
              <ProductImage
                src={r.image_url}
                alt={r.display_name}
                className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-background"
                imageClassName="h-full w-full"
                fit="contain"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {r.display_name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  <Trophy className="mr-0.5 inline h-2.5 w-2.5 text-savings" />
                  {shortenStoreName(r.cheapest_store)} · {r.store_count}{" "}
                  {r.store_count === 1 ? "mercado" : "mercados"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-primary">
                  {fmt(Number(r.min_price))}
                </p>
                {Number(r.store_count) > 1 && (
                  <p className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-savings">
                    <TrendingDown className="h-2.5 w-2.5" />
                    -{Number(r.savings_pct).toFixed(1)}%
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center text-[11px]">
          <div>
            <p className="uppercase tracking-wider text-muted-foreground">Menor total</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-primary">{fmt(totalMin)}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-muted-foreground">Média</p>
            <p className="mt-0.5 font-mono text-sm text-foreground">{fmt(totalAvg)}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-muted-foreground">Maior total</p>
            <p className="mt-0.5 font-mono text-sm text-muted-foreground line-through">
              {fmt(totalMax)}
            </p>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          Economia potencial:{" "}
          <span className="font-bold text-savings">{fmt(Math.max(0, totalAvg - totalMin))}</span>{" "}
          em relação à média
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ShowcaseRow({
  icon,
  eyebrow,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {icon}
          {eyebrow}
        </span>
        <h2 className="text-[12px] font-semibold text-foreground">{title}</h2>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </div>
  );
}

