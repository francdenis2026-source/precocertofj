import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

interface AppBrandProps {
  /** Console administrativo usa o selo de escudo no lugar da etiqueta. */
  admin?: boolean;
  /** Linha secundária sob o wordmark. */
  subtitle?: string;
  /** Esconde o wordmark (apenas a etiqueta). */
  compact?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Lockup oficial da marca dentro da área do cliente.
 * Mantém o mesmo wordmark, escala e espaçamentos da homepage
 * (etiqueta + "Preço" + "Certo" dourado), com gap fixo de 10px.
 */
export function AppBrand({
  admin = false,
  subtitle,
  compact = false,
  size = "md",
  className,
}: AppBrandProps) {
  const markSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const wordSize = size === "sm" ? "text-[15px]" : "text-[16px]";

  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {admin ? (
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center rounded-lg border border-border bg-primary text-primary-foreground shadow-sm",
            markSize,
          )}
        >
          <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
        </span>
      ) : (
        <img
          src="/logo-mark.png"
          alt=""
          aria-hidden
          width={32}
          height={32}
          className={cn(
            "shrink-0 object-contain drop-shadow-[0_1px_0_rgba(11,30,58,0.25)]",
            markSize,
          )}
        />
      )}

      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "truncate font-display font-bold tracking-tight text-foreground",
              wordSize,
            )}
          >
            {admin ? (
              "Console"
            ) : (
              <>
                Preço<span className="text-gold-ink">Certo</span>
              </>
            )}
          </span>
          {subtitle && (
            <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
