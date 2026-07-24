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
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const icon = size === "sm" ? "h-5 w-5" : "h-[22px] w-[22px]";

  const showDarkIcon = mounted && isDark;
  const label = showDarkIcon ? "Ativar modo claro" : "Ativar modo escuro";

  // Active state: quando escuro (lua) ou claro (sol) ativo, o botão fica "aceso"
  const activeStyle: React.CSSProperties = showDarkIcon
    ? {
        background:
          "radial-gradient(circle at 35% 30%, rgba(245,200,106,0.28), rgba(245,200,106,0.08) 60%, transparent 75%)",
        borderColor: "rgba(245,200,106,0.55)",
        boxShadow:
          "0 0 0 1px rgba(245,200,106,0.25), 0 0 12px rgba(245,200,106,0.35), inset 0 0 8px rgba(245,200,106,0.15)",
      }
    : {
        background:
          "radial-gradient(circle at 35% 30%, rgba(245,158,11,0.22), rgba(245,158,11,0.06) 60%, transparent 75%)",
        borderColor: "rgba(245,158,11,0.45)",
        boxShadow:
          "0 0 0 1px rgba(245,158,11,0.20), 0 0 10px rgba(245,158,11,0.28), inset 0 0 6px rgba(245,158,11,0.12)",
      };

  const baseTone =
    tone === "dark"
      ? "border-on-media-border text-on-media"
      : "border-border text-foreground";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => toggle()}
      aria-label={label}
      aria-pressed={showDarkIcon}
      title={label}
      style={activeStyle}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-all duration-200 outline-none",
        "hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/60",
        baseTone,
        dim,
        className,
      )}
      {...props}
    >
      <span className={cn("relative inline-block", icon)} aria-hidden>
        <Moon
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out drop-shadow-[0_0_8px_rgba(245,200,106,0.75)]",
            showDarkIcon
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-50 opacity-0",
          )}
          strokeWidth={1.75}
          style={{ color: "#F5C86A", fill: "rgba(245,200,106,0.35)" }}
        />
        <Sun
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]",
            showDarkIcon
              ? "rotate-90 scale-50 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          )}
          strokeWidth={2}
          style={{ color: "#F59E0B", fill: "rgba(245,158,11,0.18)" }}
        />
      </span>
    </Button>

  );

}
