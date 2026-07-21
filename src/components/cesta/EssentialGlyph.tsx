import type { EssentialKey } from "@/lib/basket.functions";

/**
 * Pictogramas SVG minimalistas para cada essencial da cesta.
 * Todos usam currentColor para herdar da cor do texto ao redor.
 */
export function EssentialGlyph({
  k,
  className = "h-4 w-4",
}: {
  k: EssentialKey;
  className?: string;
}) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (k) {
    case "arroz":
      return (
        <svg {...props}>
          <path d="M4 17c0-2 1.5-3 4-3s4 1 4 3 1.5 3 4 3 4-1 4-3" />
          <ellipse cx="8" cy="9" rx="1.2" ry="2" />
          <ellipse cx="12" cy="7" rx="1.2" ry="2" />
          <ellipse cx="16" cy="9" rx="1.2" ry="2" />
        </svg>
      );
    case "feijao":
      return (
        <svg {...props}>
          <path d="M8 6c4-2 8 0 8 5s-4 8-8 6-4-9 0-11Z" />
          <path d="M11 10c1 1 2 3 1 5" />
        </svg>
      );
    case "oleo":
      return (
        <svg {...props}>
          <path d="M9 4h6v3l2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-2Z" />
          <path d="M10 13h4" />
        </svg>
      );
    case "acucar":
      return (
        <svg {...props}>
          <rect x="4" y="8" width="16" height="10" rx="1.5" />
          <path d="M4 12h16M8 8V6h8v2" />
        </svg>
      );
    case "cafe":
      return (
        <svg {...props}>
          <path d="M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z" />
          <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
          <path d="M8 3c0 1 1 1 1 2s-1 1-1 2M11 3c0 1 1 1 1 2s-1 1-1 2" />
        </svg>
      );
    case "leite":
      return (
        <svg {...props}>
          <path d="M8 3h8l-1 3v3l1 3v7a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-7l1-3V6L8 3Z" />
          <path d="M7 9h10" />
        </svg>
      );
    case "macarrao":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M6 10c2 1 4 1 6 0s4-1 6 0M6 13c2 1 4 1 6 0s4-1 6 0" />
        </svg>
      );
    case "farinha":
      return (
        <svg {...props}>
          <path d="M6 5h12l-1 4H7L6 5Z" />
          <path d="M7 9l1 11h8l1-11" />
          <path d="M10 13h4" />
        </svg>
      );
    case "sal":
      return (
        <svg {...props}>
          <path d="M7 4h10v3H7z" />
          <path d="M8 7l-1 13h10l-1-13" />
          <circle cx="10" cy="6" r=".5" />
          <circle cx="12" cy="6" r=".5" />
          <circle cx="14" cy="6" r=".5" />
        </svg>
      );
    case "molho":
      return (
        <svg {...props}>
          <path d="M10 3h4v3l2 2v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-2Z" />
          <circle cx="12" cy="14" r="2" />
        </svg>
      );
    case "sabao":
      return (
        <svg {...props}>
          <rect x="5" y="6" width="14" height="14" rx="2" />
          <path d="M8 10c1-1 2-1 3 0M13 10c1-1 2-1 3 0M8 14c1-1 2-1 3 0M13 14c1-1 2-1 3 0" />
        </svg>
      );
    case "papel":
      return (
        <svg {...props}>
          <ellipse cx="12" cy="7" rx="7" ry="3" />
          <path d="M5 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
          <circle cx="12" cy="14" r="1.5" />
        </svg>
      );
    case "manteiga":
      return (
        <svg {...props}>
          <path d="M4 12l4-5h11l1 4-4 6H5l-1-5Z" />
          <path d="M8 7l3 5M13 7l3 5" />
        </svg>
      );
    case "ovos":
      return (
        <svg {...props}>
          <ellipse cx="9" cy="13" rx="4" ry="5.5" />
          <ellipse cx="16" cy="10" rx="3" ry="4" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export function BasketMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10h24l-2.5 14a3 3 0 0 1-3 2.5H9.5a3 3 0 0 1-3-2.5L4 10Z" />
      <path d="M10 10 14 4M22 10l-4-6" />
      <path d="M12 15v6M16 15v6M20 15v6" />
    </svg>
  );
}
