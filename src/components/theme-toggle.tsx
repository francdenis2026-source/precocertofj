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

  // Tamanhos fixos evitam salto de layout entre SSR/CSR
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const iconPx = size === "sm" ? 16 : 18;

  const showDarkIcon = mounted && isDark;
  const label = showDarkIcon ? "Ativar modo claro" : "Ativar modo escuro";

  // Alto contraste em qualquer header, com transição suave entre estados
  const activeStyle: React.CSSProperties = showDarkIcon
    ? {
        background:
          "radial-gradient(circle at 32% 28%, #1e3a5f 0%, #0f1b3d 70%, #0a1330 100%)",
        borderColor: "rgba(245,200,106,0.85)",
        boxShadow:
          "0 0 0 1px rgba(245,200,106,0.35), 0 2px 10px rgba(0,0,0,0.35), 0 0 14px rgba(245,200,106,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
      }
    : {
        background:
          "radial-gradient(circle at 32% 28%, #fff8e6 0%, #ffe9b3 70%, #f6d488 100%)",
        borderColor: "rgba(180,120,20,0.55)",
        boxShadow:
          "0 0 0 1px rgba(180,120,20,0.25), 0 2px 8px rgba(180,120,20,0.20), 0 0 12px rgba(245,158,11,0.30), inset 0 1px 0 rgba(255,255,255,0.60)",
      };

  // Focus ring adaptável ao tema, sempre visível no teclado
  const focusRing = showDarkIcon
    ? "focus-visible:ring-[3px] focus-visible:ring-[#F5C86A] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background,#0a1330)]"
    : "focus-visible:ring-[3px] focus-visible:ring-[#B45309] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background,#ffffff)]";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => toggle()}
      aria-label={label}
      aria-pressed={showDarkIcon}
      title={label}
      style={{
        ...activeStyle,
        transition:
          "background 400ms ease, border-color 400ms ease, box-shadow 400ms ease, transform 200ms ease",
        willChange: "transform, background, box-shadow",
      }}
      className={cn(
        // Layout fixo para eliminar salto de layout
        "relative inline-grid place-items-center rounded-full border outline-none p-0",
        "hover:scale-[1.04] active:scale-[0.96]",
        "motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
        focusRing,
        dim,
        className,
      )}
      {...props}
    >
      {/* Wrapper de ícones perfeitamente centralizado via grid stacking */}
      <span
        className="pointer-events-none relative inline-grid place-items-center"
        style={{ width: iconPx, height: iconPx }}
        aria-hidden
      >
        <Moon
          width={iconPx}
          height={iconPx}
          strokeWidth={2.25}
          className={cn(
            "col-start-1 row-start-1 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "drop-shadow-[0_0_4px_rgba(0,0,0,0.55)]",
            "motion-reduce:transition-none",
            showDarkIcon
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-50 opacity-0",
          )}
          style={{ color: "#FFE7A8", fill: "rgba(255,217,138,0.35)" }}
        />
        <Sun
          width={iconPx}
          height={iconPx}
          strokeWidth={2.5}
          className={cn(
            "col-start-1 row-start-1 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]",
            "motion-reduce:transition-none",
            showDarkIcon
              ? "rotate-90 scale-50 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          )}
          style={{ color: "#0f1b3d", fill: "rgba(15,27,61,0.18)" }}
        />

      </span>
    </Button>
  );
}
