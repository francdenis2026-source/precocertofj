import { cn } from "@/lib/utils";

/**
 * StatCell — cartão editorial de contagem (serif tabular grande + label caps gold).
 *
 * Usado nos headers de /mapa e /estabelecimentos para manter consistência visual
 * navy/gold. Acessível: expõe rótulo completo em `aria-label` combinando valor+termo.
 */
export function StatCell({
  value,
  label,
  accent = false,
  size = "md",
  className,
}: {
  value: string | number;
  label: string;
  /** Destaca o valor em ouro (usado no primeiro contador). */
  accent?: boolean;
  /** Tamanho da tipografia serif. */
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeCls =
    size === "lg"
      ? "text-[1.75rem] sm:text-[2.2rem]"
      : size === "sm"
        ? "text-[1.3rem] sm:text-[1.55rem]"
        : "text-[1.55rem] sm:text-[1.9rem]";

  return (
    <div
      className={cn(
        "flex min-w-[3.75rem] flex-col items-center justify-center px-3 py-1.5 sm:min-w-[4.75rem] sm:px-4 sm:py-2",
        className,
      )}
      role="group"
      aria-label={`${value} ${label}`}
    >
      <span
        aria-hidden
        className={cn(
          "font-serif font-semibold leading-none tabular-nums tracking-tight",
          sizeCls,
          accent ? "text-[var(--pc-gold-ink)]" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-1 text-[0.65rem] font-semibold uppercase leading-none tracking-[0.18em] sm:text-[0.72rem]",
          accent ? "text-[var(--pc-gold-ink)]/85" : "text-muted-foreground",
        )}
      >
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
