import { Type } from "lucide-react";
import { useReadingMode } from "@/hooks/use-reading-mode";

/**
 * Alternador do modo de leitura — amplia a tipografia sem aumentar a altura.
 */
export function ReadingModeToggle({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const { enabled, hydrated, toggle } = useReadingMode();

  const base =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60";
  const dark = enabled
    ? "border-brand-gold bg-brand-gold/20 text-brand-gold"
    : "border-white/20 bg-white/[0.06] text-white/80 hover:border-brand-gold/60";
  const light = enabled
    ? "border-brand-gold bg-brand-gold/15 text-[var(--pc-gold-ink)]"
    : "border-border bg-background text-muted-foreground hover:border-brand-gold/60";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hydrated ? enabled : undefined}
      aria-label={enabled ? "Desativar modo de leitura" : "Ativar modo de leitura (letras maiores)"}
      title={enabled ? "Modo de leitura ativo" : "Modo de leitura — letras maiores"}
      className={`${base} ${tone === "dark" ? dark : light} ${className}`}
    >
      <Type className="h-4 w-4" strokeWidth={2.3} aria-hidden />
    </button>
  );
}
