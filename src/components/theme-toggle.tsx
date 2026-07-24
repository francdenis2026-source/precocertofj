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
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  const showDarkIcon = mounted && isDark;
  const label = showDarkIcon ? "Ativar modo claro" : "Ativar modo escuro";

  // Botão com alto contraste: no escuro, disco navy profundo com aro dourado;
  // no claro, disco claro com aro âmbar. Ambos ficam nítidos sobre qualquer header.
  const activeStyle: React.CSSProperties = showDarkIcon
    ? {
        background:
          "radial-gradient(circle at 32% 28%, #1e3a5f 0%, #0f1b3d 70%, #0a1330 100%)",
        borderColor: "rgba(245,200,106,0.85)",
        boxShadow:
          "0 0 0 1px rgba(245,200,106,0.35), 0 2px 10px rgba(0,0,0,0.35), 0 0 14px rgba(245,200,106,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
      }
    : {
        background:
          "radial-gradient(circle at 32% 28%, #fff8e6 0%, #ffe9b3 70%, #f6d488 100%)",
        borderColor: "rgba(180,120,20,0.55)",
        boxShadow:
          "0 0 0 1px rgba(180,120,20,0.25), 0 2px 8px rgba(180,120,20,0.20), 0 0 12px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.60)",
      };

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
        "hover:scale-105 hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
          strokeWidth={2}
          style={{ color: "#FFD98A", fill: "rgba(255,217,138,0.55)" }}
        />
        <Sun
          className={cn(
            "absolute inset-0 transition-all duration-500 ease-out drop-shadow-[0_1px_2px_rgba(140,80,0,0.35)]",
            showDarkIcon
              ? "rotate-90 scale-50 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          )}
          strokeWidth={2.25}
          style={{ color: "#B45309", fill: "rgba(180,83,9,0.35)" }}
        />

      </span>
    </Button>

  );

}
