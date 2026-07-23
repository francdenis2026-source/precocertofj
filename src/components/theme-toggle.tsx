import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
  tone?: "light" | "dark";
}

/**
 * Botão único de alternância claro/escuro.
 * - Padrão: modo claro.
 * - Persistência: `localStorage["pc-theme"]`.
 * - Uso restrito à homepage.
 */
export function ThemeToggle({
  className,
  size = "md",
  tone = "dark",
  ...props
}: ThemeToggleProps) {
  const { toggle, isDark, mounted } = useTheme();
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const Icon = mounted && isDark ? Sun : Moon;
  const label = mounted && isDark ? "Ativar modo claro" : "Ativar modo escuro";

  const toneClass =
    tone === "dark"
      ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
      : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        toneClass,
        dim,
        className,
      )}
      {...props}
    >
      <Icon className={icon} strokeWidth={1.75} />
    </button>
  );
}
