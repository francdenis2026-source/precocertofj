import { Contrast } from "lucide-react";
import { useHighContrast } from "@/hooks/use-high-contrast";
import { cn } from "@/lib/utils";

type Props = {
  /** "onDark" = header transparente sobre hero; "onLight" = header sólido claro. */
  tone?: "onDark" | "onLight";
  className?: string;
};

/**
 * Botão-toggle de alto contraste.
 * - `aria-pressed` reflete o estado (a11y).
 * - Não depende de contexto de tema; usa `useHighContrast` diretamente.
 */
export function HighContrastToggle({ tone = "onLight", className }: Props) {
  const { enabled, toggle, mounted } = useHighContrast();

  const label = enabled ? "Desativar alto contraste" : "Ativar alto contraste";

  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus-ring";
  const onDark =
    "border-white/25 bg-white/10 text-white hover:border-white/50 hover:bg-white/20";
  const onLight =
    "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5";
  const activeDot =
    "after:absolute after:right-1 after:top-1 after:h-1.5 after:w-1.5 after:rounded-full after:bg-accent after:content-['']";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={mounted ? enabled : undefined}
      aria-label={label}
      title={label}
      className={cn(
        "relative",
        base,
        tone === "onDark" ? onDark : onLight,
        enabled && activeDot,
        className,
      )}
    >
      <Contrast className="h-4 w-4" aria-hidden />
    </button>
  );
}
