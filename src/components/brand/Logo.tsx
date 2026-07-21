import { cn } from "@/lib/utils";
import brandLogo from "@/assets/brand-logo.png.asset.json";

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
        src={brandLogo.url}
        alt="PreçoCerto"
        width={40}
        height={40}
        className={cn(
          "h-10 w-10 shrink-0 rounded-2xl object-contain",
          "shadow-[0_6px_18px_-6px_oklch(0.51_0.22_275_/_0.35)]",
        )}
      />
      {!compact && (
        <span
          className={cn(
            "font-display text-[22px] font-semibold leading-none tracking-tight",
            isDark ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          Preço<span className="text-accent">Certo</span>
        </span>
      )}
    </a>
  );
}
