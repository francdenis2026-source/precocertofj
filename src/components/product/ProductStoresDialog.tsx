import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownUp,
  Crown,
  Lock,
  LogIn,
  MapPin,
  ShieldCheck,
  Store as StoreIcon,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/useSession";
import { UnitPriceBadge } from "@/components/product/UnitPriceBadge";
import { computeConfidence } from "@/components/product/ConfidenceBadge";
import { cn } from "@/lib/utils";

/**
 * Estabelecimento com preço. Aceita variações vindas do comparador
 * (`store_name`) e da busca (`marketName`). `distance_km` é opcional e
 * usado para ordenar por proximidade quando disponível.
 */
export type ProductStoreEntry = {
  establishment_id?: string | null;
  store_name?: string | null;
  marketName?: string | null;
  price: number;
  distance_km?: number | null;
  store_count?: number | null;
};

export interface ProductStoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  category?: string | null;
  sizeLabel?: string | null;
  stores: ProductStoreEntry[];
  detailSlug?: string | null;
}

type SortKey = "price-asc" | "price-desc" | "confidence-desc" | "distance-asc";

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function storeName(s: ProductStoreEntry): string {
  return (s.store_name ?? s.marketName ?? "Estabelecimento").trim();
}

/**
 * Confiança por mercado no dialog: usamos apenas o preço vs. min/avg do próprio
 * conjunto, sem precisar do payload completo do comparador.
 */
function confidenceForStore(
  s: ProductStoreEntry,
  ctx: { min: number; avg: number; max: number; count: number; hasSize: boolean },
): "alta" | "media" | "baixa" {
  const c = computeConfidence({
    storeCount: ctx.count,
    minPrice: Number(s.price),
    avgPrice: ctx.avg,
    maxPrice: ctx.max,
    hasSize: ctx.hasSize,
  });
  return c.level;
}

/**
 * Dialog acionado ao clicar em um produto. Exibe a lista completa de mercados
 * cadastradas com o menor preço destacado, controles de ordenação/filtro
 * acessíveis e bloqueio profissional para visitantes anônimos.
 *
 * Acessibilidade:
 * - Radix (via shadcn Dialog) já entrega focus trap, ESC para fechar,
 *   `aria-modal="true"` e restauração de foco ao fechar.
 * - Descrevemos o conteúdo via `DialogDescription` (linkado por
 *   `aria-describedby`) e o resultado da ordenação/filtro em uma região
 *   `aria-live="polite"` para leitores de tela.
 * - Foco inicial é entregue ao primeiro controle interativo (ordenação).
 */
export function ProductStoresDialog({
  open,
  onOpenChange,
  productName,
  category,
  sizeLabel,
  stores,
  detailSlug,
}: ProductStoresDialogProps) {
  const { user, loading } = useSession();
  const [sortKey, setSortKey] = useState<SortKey>("price-asc");
  const [confFilter, setConfFilter] = useState<"" | "alta" | "media" | "baixa">("");
  

  const hasDistance = useMemo(
    () => stores.some((s) => s.distance_km != null && Number.isFinite(Number(s.distance_km))),
    [stores],
  );

  // Reset dos controles ao mudar de produto (ou reabrir para outro)
  useEffect(() => {
    if (open) {
      setSortKey("price-asc");
      setConfFilter("");
    }
  }, [open, productName]);

  const valid = useMemo(
    () => stores.filter((s) => Number.isFinite(Number(s.price)) && Number(s.price) > 0),
    [stores],
  );

  const stats = useMemo(() => {
    if (valid.length === 0)
      return { min: null as number | null, max: null as number | null, avg: null as number | null };
    const prices = valid.map((s) => Number(s.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { min, max, avg };
  }, [valid]);

  const withConfidence = useMemo(() => {
    if (stats.min == null || stats.avg == null || stats.max == null) return [];
    return valid.map((s) => ({
      store: s,
      confidence: confidenceForStore(s, {
        min: stats.min!,
        avg: stats.avg!,
        max: stats.max!,
        count: valid.length,
        hasSize: Boolean(sizeLabel),
      }),
    }));
  }, [valid, stats, sizeLabel]);

  const filtered = useMemo(() => {
    if (!confFilter) return withConfidence;
    return withConfidence.filter((r) => r.confidence === confFilter);
  }, [withConfidence, confFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const rank = (c: "alta" | "media" | "baixa") => (c === "alta" ? 3 : c === "media" ? 2 : 1);
    if (sortKey === "price-asc") {
      arr.sort((a, b) => Number(a.store.price) - Number(b.store.price));
    } else if (sortKey === "price-desc") {
      arr.sort((a, b) => Number(b.store.price) - Number(a.store.price));
    } else if (sortKey === "confidence-desc") {
      arr.sort((a, b) => {
        const dr = rank(b.confidence) - rank(a.confidence);
        if (dr !== 0) return dr;
        return Number(a.store.price) - Number(b.store.price);
      });
    } else if (sortKey === "distance-asc") {
      arr.sort((a, b) => {
        const da = a.store.distance_km ?? Number.POSITIVE_INFINITY;
        const db = b.store.distance_km ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return Number(a.store.price) - Number(b.store.price);
      });
    }
    return arr;
  }, [filtered, sortKey]);

  const spreadPct =
    stats.min != null && stats.max != null && stats.min > 0
      ? ((stats.max - stats.min) / stats.min) * 100
      : null;

  const isVisitor = !loading && !user;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="stores-dialog-description"
        className="max-w-lg gap-3 overflow-hidden p-0"
      >
        <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-background to-background px-5 pb-4 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
          <DialogHeader className="space-y-1">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <StoreIcon className="mr-1 inline h-3 w-3" strokeWidth={2.2} />
              Comparativo por estabelecimento
            </p>
            <DialogTitle className="line-clamp-2 font-display text-[17px] font-bold leading-tight tracking-tight text-foreground">
              {productName}
            </DialogTitle>
            <DialogDescription
              id="stores-dialog-description"
              className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
            >
              {category ? <span className="uppercase tracking-widest">{category}</span> : null}
              {category && sizeLabel ? <span aria-hidden>·</span> : null}
              {sizeLabel ? <span className="italic">{sizeLabel}</span> : null}
              {(category || sizeLabel) && valid.length > 0 ? <span aria-hidden>·</span> : null}
              {valid.length > 0 ? (
                <span>
                  {valid.length} mercado{valid.length > 1 ? "s" : ""} com preço
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
        </div>

        {valid.length === 0 ? (
          <div className="px-5 pb-5 pt-2 text-center text-sm text-muted-foreground">
            Nenhum estabelecimento cadastrou preço para este produto ainda.
          </div>
        ) : isVisitor ? (
          <VisitorLockPanel storeCount={valid.length} minPrice={stats.min} />
        ) : (
          <div className="px-3 pb-4 pt-1 sm:px-5">
            {stats.min != null && stats.avg != null ? (
              <div className="mb-3 grid grid-cols-3 gap-2">
                <StatMini label="Menor" value={formatBRL(stats.min)} accent="savings" />
                <StatMini label="Médio" value={formatBRL(stats.avg)} />
                <StatMini
                  label="Diferença"
                  value={spreadPct != null ? `${spreadPct.toFixed(0)}%` : "—"}
                  hint="entre menor e maior"
                />
              </div>
            ) : null}

            {/* Controles de ordenação + filtro */}
            <div
              role="toolbar"
              aria-label="Ordenar e filtrar estabelecimentos"
              className="mb-2 flex flex-wrap items-center gap-1.5"
            >
              <span className="mr-1 flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <ArrowDownUp className="h-3 w-3" strokeWidth={2.2} />
                Ordenar
              </span>
              <SortChip
                active={sortKey === "price-asc"}
                onClick={() => setSortKey("price-asc")}
                label="Menor preço"
              />

              <SortChip
                active={sortKey === "price-desc"}
                onClick={() => setSortKey("price-desc")}
                label="Maior preço"
              />
              <SortChip
                active={sortKey === "confidence-desc"}
                onClick={() => setSortKey("confidence-desc")}
                icon={<ShieldCheck className="h-3 w-3" strokeWidth={2.2} />}
                label="Maior confiança"
              />
              <SortChip
                active={sortKey === "distance-asc"}
                onClick={() => setSortKey("distance-asc")}
                disabled={!hasDistance}
                icon={<MapPin className="h-3 w-3" strokeWidth={2.2} />}
                label={hasDistance ? "Mais perto" : "Mais perto (indisponível)"}
                title={
                  hasDistance
                    ? "Ordenar por proximidade"
                    : "Ative a localização em Perfil para ver a distância"
                }
              />
            </div>

            <div
              role="group"
              aria-label="Filtrar por nível de confiança"
              className="mb-2 flex flex-wrap items-center gap-1.5"
            >
              <span className="mr-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Confiança
              </span>
              {(["", "alta", "media", "baixa"] as const).map((level) => (
                <FilterChip
                  key={level || "todas"}
                  active={confFilter === level}
                  onClick={() => setConfFilter(level)}
                  label={
                    level === "" ? "Todas" : level === "alta" ? "Alta" : level === "media" ? "Média" : "Baixa"
                  }
                  tone={level || undefined}
                />
              ))}
            </div>

            {/* Região viva anunciando resultados após ordenação/filtro */}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {sorted.length} estabelecimento{sorted.length === 1 ? "" : "s"} listado
              {sorted.length === 1 ? "" : "s"}
              {confFilter ? ` — filtro: confiança ${confFilter}` : ""}.
            </p>

            {sorted.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhum estabelecimento nesse filtro. Ajuste os critérios acima.
              </p>
            ) : (
              <ul className="divide-y divide-border/70 rounded-xl border border-border bg-card">
                {sorted.map(({ store: s, confidence }, idx) => {
                  const isCheapest = idx === 0 && sortKey === "price-asc";
                  return (
                    <li
                      key={`${s.establishment_id ?? storeName(s)}-${idx}`}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2.5",
                        isCheapest &&
                          "bg-gradient-to-r from-savings/10 via-savings/[0.04] to-transparent",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold tabular-nums",
                            isCheapest
                              ? "bg-savings text-savings-foreground shadow-sm"
                              : "border border-border bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {isCheapest ? (
                            <Crown className="h-3.5 w-3.5" strokeWidth={2.2} />
                          ) : (
                            String(idx + 1).padStart(2, "0")
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-display text-[13.5px] font-semibold leading-tight text-foreground">
                            {storeName(s)}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {isCheapest ? (
                              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-savings">
                                Menor preço
                              </span>
                            ) : stats.min != null && stats.min > 0 ? (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                +{formatBRL(Number(s.price) - stats.min)} vs. menor
                              </span>
                            ) : null}
                            <ConfidenceDot level={confidence} />
                            {s.distance_km != null && Number.isFinite(Number(s.distance_km)) ? (
                              <span className="inline-flex items-center gap-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                                <MapPin className="h-2.5 w-2.5" strokeWidth={2.2} />
                                {Number(s.distance_km).toFixed(1)} km
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "font-display text-[15px] font-bold leading-none tabular-nums",
                            isCheapest ? "text-savings" : "text-foreground",
                          )}
                        >
                          {formatBRL(Number(s.price))}
                        </p>
                        <UnitPriceBadge
                          price={Number(s.price)}
                          productName={productName}
                          className="mt-1 justify-end"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {detailSlug ? (
              <Link
                to="/produto-publico/$slug"
                params={{ slug: detailSlug }}
                onClick={() => onOpenChange(false)}
                className="mt-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary transition hover:bg-primary/10"
              >
                Ver ficha completa e histórico
                <span aria-hidden>→</span>
              </Link>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SortChip({
  active,
  onClick,
  label,
  icon,
  disabled,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "cursor-not-allowed opacity-45",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "alta" | "media" | "baixa";
}) {
  const toneClass =
    tone === "alta"
      ? "border-savings/50 text-savings"
      : tone === "media"
        ? "border-accent/50 text-accent"
        : tone === "baixa"
          ? "border-destructive/40 text-destructive"
          : "border-border text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? cn("bg-primary text-primary-foreground border-primary shadow-sm")
          : cn(toneClass, "bg-background/60 hover:border-primary/40 hover:text-foreground"),
      )}
    >
      {label}
    </button>
  );
}

function ConfidenceDot({ level }: { level: "alta" | "media" | "baixa" }) {
  const tone =
    level === "alta"
      ? "bg-savings/15 text-savings"
      : level === "media"
        ? "bg-accent/15 text-accent"
        : "bg-destructive/15 text-destructive";
  const label = level === "alta" ? "Alta confiança" : level === "media" ? "Confiança média" : "Baixa confiança";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest",
        tone,
      )}
      title={label}
    >
      <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.4} />
      {level}
    </span>
  );
}

function StatMini({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "savings";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-2">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-display text-[14px] font-bold leading-tight tabular-nums",
          accent === "savings" ? "text-savings" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Painel exibido para visitantes anônimos. Usa a URL atual (com `?p=<key>`)
 * como `redirect` para que, após autenticar, o usuário volte já com o
 * diálogo do MESMO produto aberto.
 */
function VisitorLockPanel({
  storeCount,
  minPrice,
}: {
  storeCount: number;
  minPrice: number | null;
}) {
  const redirect =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  // Guarda o produto pretendido em sessionStorage como fallback caso o
  // redirect seja perdido (ex.: fluxo OAuth cross-origin).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem("precoCerto:intendedProduct", redirect);
    } catch {
      /* storage indisponível — silencioso */
    }
  }, [redirect]);

  return (
    <div className="relative px-5 pb-5 pt-2">
      <div className="hairline-gold relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background p-5 text-center shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--color-primary)_45%,transparent)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 55%), radial-gradient(circle at 70% 80%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 55%)",
          }}
        />
        <div className="relative">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-inner">
            <Lock className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            Preços por estabelecimento
          </p>
          <h3 className="mt-1 font-display text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Entre para ver quanto custa em cada mercado
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            {storeCount} estabelecimento{storeCount > 1 ? "s" : ""} já cadastraram este produto
            {minPrice != null ? (
              <>
                {" "}— a partir de{" "}
                <strong className="font-display text-foreground">{formatBRL(minPrice)}</strong>.
              </>
            ) : (
              "."
            )}{" "}
            Crie sua conta gratuita para desbloquear a comparação completa — 30 dias sem cartão.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              search={{ redirect } as never}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground shadow-[0_8px_20px_-10px_color-mix(in_oklab,var(--color-primary)_60%,transparent)] transition hover:brightness-110"
            >
              <LogIn className="h-3.5 w-3.5" strokeWidth={2.2} />
              Entrar / Cadastrar
            </Link>
            <Link
              to="/assinar"
              className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-background px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary/5"
            >
              Ver planos
            </Link>
          </div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <X className="mr-1 inline h-3 w-3 text-savings" strokeWidth={2.4} />
            Sem cartão · 30 dias grátis
          </p>
        </div>
      </div>
    </div>
  );
}
