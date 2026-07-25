import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  compact?: boolean;
  /** "dark" = usar sobre superfícies escuras (sidebar/footer). */
  variant?: "default" | "dark";
}

export function Logo({
  className,
  compact = false,
  href = "/",
  variant = "default",
  ...props
}: LogoProps) {
  const isDark = variant === "dark";
  return (
    <a
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      {...props}
    >
      <img
        src="/logo-mark.svg"
        alt="PreçoCerto"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-lg object-contain ring-1 ring-brand-gold/30"
      />

      {!compact && (
        <span
          className={cn(
            "font-display text-[22px] font-semibold leading-none tracking-tight",
            isDark ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Preço<span className="text-brand-gold">•</span>Certo
        </span>
      )}
    </a>
  );
}

