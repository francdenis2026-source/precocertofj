import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

/** Avaliação agregada da plataforma — fonte única para homepage e páginas internas. */
export const PLATFORM_RATING = { value: 4.9, count: 312 } as const;


function Stars({ size, count = 5 }: { size: "xs" | "sm"; count?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"}
          fill="var(--pc-home-gold)"
          style={{ color: "var(--pc-home-gold)" }}
        />
      ))}
    </span>
  );
}

/**
 * Selo de avaliação agregada — mesma hierarquia tipográfica da homepage:
 * número em serif, 5 estrelas em ouro, contagem em 10px bold uppercase.
 */
export function RatingBadge({
  value,
  count,
  className,
}: {
  value: number;
  count?: number | null;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1", className)}
      style={{
        background: "color-mix(in oklab, var(--pc-home-gold) 8%, transparent)",
        borderColor: "color-mix(in oklab, var(--pc-home-gold) 28%, transparent)",
      }}
      aria-label={`Avaliação ${value.toFixed(1).replace(".", ",")} de 5${count ? ` · ${count} avaliações` : ""}`}
    >
      <span
        className={`${serif} tabular-nums leading-none`}
        style={{ color: "var(--pc-home-heading)", fontSize: "1.05rem", letterSpacing: "-0.02em" }}
      >
        {value.toFixed(1).replace(".", ",")}
      </span>
      <Stars size="sm" />
      {typeof count === "number" ? (
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: "var(--pc-text-body)" }}
        >
          · {count}
        </span>
      ) : null}
    </span>
  );
}

/** Avaliação compacta para linhas de metadados em cards/listagens. */
export function RatingInline({
  value,
  count,
  showStars = true,
  className,
}: {
  value: number;
  count?: number | null;
  showStars?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`Avaliação ${value.toFixed(1).replace(".", ",")} de 5`}
    >
      {showStars ? <Stars size="xs" count={1} /> : null}
      <span
        className="text-[12.5px] font-semibold tabular-nums leading-none tracking-tight"
        style={{ color: "var(--pc-gold-ink)" }}
      >
        {value.toFixed(1).replace(".", ",")}
      </span>
      {typeof count === "number" ? (
        <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          ({count})
        </span>
      ) : null}
    </span>
  );
}
