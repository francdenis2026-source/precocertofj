/**
 * Marca vetorial da barra lateral.
 *
 * SVG puro (sem PNG) para ficar nítido em qualquer densidade de tela e para
 * herdar as cores do tema: o corpo usa o navy da marca e o selo usa o gold.
 * Um único `id` estável por instância evita colisão de gradientes quando o
 * componente aparece mais de uma vez (barra fixa + sheet no mobile).
 */
import { useId } from "react";

export function SidebarBrandMark({
  className,
  variant = "app",
}: {
  className?: string;
  variant?: "app" | "admin";
}) {
  const uid = useId().replace(/:/g, "");
  const g = `pcsb-g-${uid}`;
  const gold = `pcsb-gold-${uid}`;

  return (
    <svg viewBox="0 0 40 40" role="img" aria-hidden className={className} focusable="false">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--pcsb-mark-a)" />
          <stop offset="100%" stopColor="var(--pcsb-mark-b)" />
        </linearGradient>
      </defs>

      {/* Etiqueta de preço (corpo) — dourado da marca sobre a placa navy */}
      <path
        d="M6.5 12.2a5.7 5.7 0 0 1 5.7-5.7h9.3c1.5 0 2.9.6 4 1.7l8.1 8.1a5.7 5.7 0 0 1 0 8l-8 8a5.7 5.7 0 0 1-8.1 0l-8.1-8.1a5.7 5.7 0 0 1-1.7-4z"
        fill={`url(#${g})`}
      />

      {variant === "admin" ? (
        // Console: escudo interno em navy sobre o dourado
        <path
          d="M18.6 13.8l5.6 2.2v4.1c0 3.1-2.1 5.6-5.6 6.9-3.5-1.3-5.6-3.8-5.6-6.9V16z"
          fill="var(--pcsb-mark-ink)"
        />
      ) : (
        <>
          {/* Furo da etiqueta */}
          <circle cx="14.4" cy="14.4" r="2.9" fill="var(--pcsb-mark-hole)" />
          {/* Selo de conferido */}
          <path
            d="M17.4 24.9l3.6 3.6 8.2-8.9"
            fill="none"
            stroke="var(--pcsb-mark-ink)"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
