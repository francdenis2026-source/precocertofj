import { Beef, Bird, Drumstick } from "lucide-react";
import type { ButcherProtein } from "@/lib/butcher-cuts";

const MAP: Record<
  ButcherProtein,
  { label: string; Icon: typeof Beef; tone: string }
> = {
  bovino: {
    label: "Bovino",
    Icon: Beef,
    tone: "border-[color-mix(in_oklab,#8b1a1a_45%,transparent)] bg-[color-mix(in_oklab,#8b1a1a_10%,transparent)] text-[#7a1414] dark:text-[#f0a5a5]",
  },
  frango: {
    label: "Frango",
    Icon: Bird,
    tone: "border-[color-mix(in_oklab,#a56a00_45%,transparent)] bg-[color-mix(in_oklab,#a56a00_10%,transparent)] text-[#7a4d00] dark:text-[#f0c47a]",
  },
  suino: {
    label: "Suíno",
    Icon: Drumstick,
    tone: "border-[color-mix(in_oklab,#a34873_45%,transparent)] bg-[color-mix(in_oklab,#a34873_10%,transparent)] text-[#7a3355] dark:text-[#f0a5c4]",
  },
};

/**
 * Badge visual para classificar cortes de açougue.
 * Mostra a proteína (Bovino/Frango/Suíno) com ícone e cor consistente.
 */
export function ButcherCutBadge({
  protein,
  size = "sm",
  className = "",
}: {
  protein: ButcherProtein;
  size?: "xs" | "sm";
  className?: string;
}) {
  const cfg = MAP[protein];
  const sz =
    size === "xs"
      ? "h-4 gap-0.5 px-1 text-[9.5px]"
      : "h-5 gap-1 px-1.5 text-[10.5px]";
  const iconSz = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-[0.08em] ${sz} ${cfg.tone} ${className}`}
      aria-label={`Corte de açougue: ${cfg.label}`}
      title={`Corte de açougue: ${cfg.label}`}
    >
      <cfg.Icon className={iconSz} strokeWidth={2.2} aria-hidden />
      {cfg.label}
    </span>
  );
}
