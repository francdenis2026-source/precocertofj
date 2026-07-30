import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StatCell — cartão editorial de contagem (serif tabular grande + label caps gold).
 *
 * Usado nos headers de /mapa e /estabelecimentos para manter consistência visual
 * navy/gold em todos os breakpoints. Acessível: expõe rótulo completo em
 * `aria-label` combinando valor+termo.
 */
export function StatCell({
  value,
  label,
  icon: Icon,
  live = false,
  accent = false,
  size = "md",
  className,
}: {
  value: string | number;
  label: string;
  /** Ícone opcional exibido junto ao label caps (mesma escala do HeroMetric). */
  icon?: LucideIcon;
  /** Ponto pulsante gold ao lado do valor (indicador ao vivo). */
  live?: boolean;
  /** Destaca o valor em ouro (usado no primeiro contador). */
  accent?: boolean;
  /** Tamanho da tipografia serif. */
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  // Escala unificada com HeroMetric para paridade total entre /mapa e /estabelecimentos.
  const sizeCls =
    size === "lg"
      ? "text-[1.75rem] sm:text-[2.15rem]"
      : size === "sm"
        ? "text-[1.25rem] sm:text-[1.5rem]"
        : "text-[1.5rem] sm:text-[1.85rem]";

  return (
    <div
      className={cn(
        "flex min-w-[4.75rem] flex-col items-center justify-center gap-1 px-3 py-1.5 sm:min-w-[6rem] sm:px-4 sm:py-2",
        className,
      )}
      role="group"
      aria-label={`${value} ${label}`}
    >
      <span
        aria-hidden
        className={cn(
          "flex items-baseline gap-1.5 font-serif font-semibold leading-none tabular-nums tracking-tight",
          sizeCls,
          accent ? "text-[var(--pc-gold-ink)]" : "text-foreground",
        )}
      >
        {live && (
          <span className="relative inline-flex h-1.5 w-1.5 shrink-0 translate-y-[-4px]">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-gold/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-gold" />
          </span>
        )}
        <span className="truncate">{value}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "flex items-center justify-center gap-1 text-center text-[0.6875rem] font-semibold uppercase leading-tight tracking-[0.14em] sm:text-[0.75rem]",
          accent ? "text-[var(--pc-gold-ink)]/85" : "text-muted-foreground",
        )}
      >
        {Icon ? <Icon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden /> : null}
        {label}
      </span>
    </div>
  );
}

/**
 * StatCellGroup — envelope com moldura navy/gold para agrupar 2+ células.
 */
export function StatCellGroup({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  /** Rótulo do grupo (ex.: "Resumo do guia"). */
  label?: string;
}) {
  return (
    <dl
      aria-label={label}
      className={cn(
        "flex shrink-0 items-stretch overflow-hidden rounded-lg border border-border/70 bg-background/60 shadow-sm backdrop-blur",
        className,
      )}
    >
      {children}
    </dl>
  );
}

/** Divisor vertical fino em gold suave, para separar StatCells. */
export function StatCellDivider() {
  return (
    <span
      aria-hidden
      className="w-px self-stretch"
      style={{
        background:
          "linear-gradient(180deg, transparent, color-mix(in oklab, var(--brand-gold) 55%, transparent) 45%, color-mix(in oklab, var(--brand-gold) 55%, transparent) 55%, transparent)",
      }}
    />
  );
}
