import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  /** Esconde o wordmark e mostra apenas a etiqueta. */
  compact?: boolean;
  /** Exibe a linha "FEIJÓ • ACRE" sob o wordmark. */
  showTagline?: boolean;
  /** "dark" = sobre superfícies escuras (sidebar/footer). */
  variant?: "default" | "dark";
}

/**
 * Marca oficial PreçoCerto — Feijó · Acre.
 * Etiqueta dourada com check + wordmark "Preço" (contextual) + "Certo" (dourado).
 */
export function Logo({
  className,
  compact = false,
  showTagline = false,
  href = "/",
  variant = "default",
  ...props
}: LogoProps) {
  const isDark = variant === "dark";
  return (
    <a
      href={href}
      aria-label="PreçoCerto — Feijó, Acre"
      className={cn(
        "group inline-flex items-center gap-2.5 outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md",
        className,
      )}
      {...props}
    >
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_1px_0_rgba(11,30,58,0.15)] transition-transform duration-200 group-hover:-rotate-3"
      />

      {!compact && (
        <span className="inline-flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[22px] font-bold tracking-tight",
              isDark ? "text-white" : "text-foreground",
            )}
          >
            Preço<span className="text-brand-gold">Certo</span>
          </span>
          {showTagline && (
            <span
              className={cn(
                "mt-1 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.28em]",
                isDark ? "text-white/60" : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className="inline-block h-[2px] w-4 rounded-full bg-brand-gold"
              />
              Feijó <span className="text-brand-gold">•</span> Acre
            </span>
          )}
        </span>
      )}
    </a>
  );
}
