import type { SVGProps } from "react";

/**
 * StorefrontMark — ícone de fachada de mercado desenhado sob medida.
 *
 * Substitui o `Store` do lucide-react no botão "Comparar em todos os mercados"
 * por uma marca vetorial mais editorial: toldo com ripas, entrada arqueada
 * e base sólida. Segue o mesmo contrato de props do lucide (size / strokeWidth /
 * color via `currentColor`), então cabe em qualquer lugar sem ajustes.
 */
export function StorefrontMark({
  size = 24,
  strokeWidth = 1.8,
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Toldo — trapézio superior */}
      <path d="M3.2 8.2 L4.6 4.8 A1 1 0 0 1 5.5 4.2 H18.5 A1 1 0 0 1 19.4 4.8 L20.8 8.2 Z" />
      {/* Ripas do toldo */}
      <path d="M8 4.2 V8.2" />
      <path d="M12 4.2 V8.2" />
      <path d="M16 4.2 V8.2" />
      {/* Corpo da loja */}
      <path d="M4.8 8.2 V19.4 A0.6 0.6 0 0 0 5.4 20 H18.6 A0.6 0.6 0 0 0 19.2 19.4 V8.2" />
      {/* Porta arqueada */}
      <path d="M10 20 V14.2 A2 2 0 0 1 14 14.2 V20" />
      {/* Maçaneta */}
      <circle cx="12.8" cy="17.2" r="0.35" fill="currentColor" stroke="none" />
      {/* Piso */}
      <path d="M2.5 20 H21.5" />
    </svg>
  );
}
