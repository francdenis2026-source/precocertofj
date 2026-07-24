import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
  tone?: "light" | "dark";
}

/**
 * Botão único de tema — alterna Claro ↔ Escuro.
 * Padrão: claro. Preferência persiste local e no perfil quando logado.
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

  const toneClass =
    tone === "dark"
      ? "border-on-media-border bg-on-media-surface text-on-media hover:bg-on-media-surface"
      : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground";

  const showDarkIcon = mounted && isDark;
  const label = showDarkIcon ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => toggle()}
      aria-label={label}
      aria-pressed={showDarkIcon}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        toneClass,
        dim,
        className,
      )}
      {...props}
    >
      {showDarkIcon ? (
        <Moon
          className={cn(icon, "drop-shadow-[0_0_6px_rgba(191,161,74,0.55)]")}
          strokeWidth={1.75}
          style={{ color: "#F5C86A", fill: "rgba(245,200,106,0.18)" }}
        />
      ) : (
        <Sun
          className={cn(icon, "drop-shadow-[0_0_6px_rgba(245,158,11,0.35)]")}
          strokeWidth={1.9}
          style={{ color: "#F59E0B" }}
        />
      )}
    </Button>
  );
}
