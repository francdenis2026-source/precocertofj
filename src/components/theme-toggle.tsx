import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
  tone?: "light" | "dark";
}

/**
 * Professional Theme Toggle - Midnight & Gold Edition
 * Features smooth transitions, sophisticated shadows, and hardware acceleration.
 */
export function ThemeToggle({
  className,
  size = "md",
  tone = "dark",
  ...props
}: ThemeToggleProps) {
  const { toggle, isDark, mounted } = useTheme();

  // Responsive dimensions
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? 18 : 20;

  // Wait for hydration to avoid mismatch
  if (!mounted) return <div className={cn(dim, "rounded-full bg-muted/20 animate-pulse")} />;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => toggle()}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 transition-all duration-500 overflow-hidden",
        "hover:scale-110 active:scale-95",
        "shadow-lg hover:shadow-xl",
        isDark 
          ? "border-[var(--brand-primary)]/40 bg-[var(--pc-navy-surface-elevated)] shadow-[var(--brand-glow)]" 
          : "border-[var(--brand-primary)]/20 bg-white shadow-black/5",
        className,
        dim
      )}
      {...props}
    >
      {/* Dynamic Background Glow */}
      <div 
        className={cn(
          "absolute inset-0 opacity-20 blur-xl transition-opacity duration-500",
          isDark ? "bg-[var(--brand-primary)]" : "bg-amber-400"
        )} 
      />

      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {/* Animated Icons */}
        <Moon
          size={iconSize}
          strokeWidth={2.5}
          className={cn(
            "absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isDark 
              ? "rotate-0 scale-100 opacity-100 text-[var(--brand-primary)]" 
              : "rotate-90 scale-0 opacity-0 text-slate-400"
          )}
        />
        <Sun
          size={iconSize}
          strokeWidth={2.5}
          className={cn(
            "absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isDark 
              ? "-rotate-90 scale-0 opacity-0 text-amber-200" 
              : "rotate-0 scale-100 opacity-100 text-[var(--brand-primary)]"
          )}
        />
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-50" />
    </Button>
  );
}
