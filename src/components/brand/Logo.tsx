import { cn } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";

interface LogoProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  compact?: boolean;
  variant?: "default" | "dark" | "on-light" | "on-dark";
}

export function Logo({
  className,
  compact = false,
  href = "/",
  variant = "default",
  ...props
}: LogoProps) {
  const isDark = variant === "dark" || variant === "on-dark";
  const onLight = variant === "on-light";

  return (
    <a
      href={href}
      aria-label="PreçoCerto — Feijó, Acre"
      className={cn(
        "flex items-center gap-2.5 select-none group outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md",
        className
      )}
      {...props}
    >
      <div className={cn(
        "relative flex items-center justify-center rounded-xl transition-all duration-500 group-hover:rotate-[10deg] group-hover:scale-110",
        compact ? "h-8 w-8" : "h-10 w-10",
        isDark ? "bg-white text-[var(--brand-primary)]" : "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20"
      )}>
        <ShoppingCart size={compact ? 18 : 22} strokeWidth={2.5} />
        <div className={cn(
          "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 transition-transform duration-500 group-hover:scale-125",
          isDark ? "bg-[var(--brand-accent)] border-[var(--navy-900)]" : "bg-[var(--brand-accent)] border-white"
        )} />
      </div>
      
      {!compact && (
        <span className={cn(
          "font-display font-black tracking-tighter leading-none transition-colors",
          compact ? "text-lg" : "text-2xl",
          isDark ? "text-white" : onLight ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
        )}>
          Preço<span className={isDark ? "text-white/80" : "text-[var(--brand-primary)]"}>Certo</span>
        </span>
      )}
    </a>
  );
}
