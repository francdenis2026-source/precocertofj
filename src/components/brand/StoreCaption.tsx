/**
 * StoreCaption — pílula flutuante padrão do sistema para exibir o
 * nome do estabelecimento em cards/tiles de logo.
 *
 * Substitui os `title=` nativos (tooltip cinza do browser) por um
 * componente acessível, tipograficamente consistente e com ícone SVG
 * leve. Aparece em hover/focus do elemento com classe `group`.
 *
 * Uso:
 *   <a className="group relative ..." aria-label={`Ver ${name}`}>
 *     ...conteúdo...
 *     <StoreCaption name={name} />
 *   </a>
 *
 * Requisitos do container:
 *  - `group relative`
 *  - **não** usar `overflow-hidden` (a pílula fica abaixo do tile);
 *    aplique `overflow-hidden` num filho interno se precisar cortar
 *    a logo.
 */
import { cn } from "@/lib/utils";

export type StoreCaptionProps = {
  name: string;
  /** Posição da pílula em relação ao tile. Default: `bottom`. */
  placement?: "bottom" | "top";
  /** Tom da pílula. Default: `dark` (navy + dourado). */
  tone?: "dark" | "light";
  className?: string;
};

export function StoreCaption({
  name,
  placement = "bottom",
  tone = "dark",
  className,
}: StoreCaptionProps) {
  const pos =
    placement === "bottom"
      ? "top-full mt-1.5 translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0"
      : "bottom-full mb-1.5 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0";

  const palette =
    tone === "dark"
      ? {
          background: "var(--pc-home-heading, #0a1c3d)",
          color: "var(--pc-home-gold, #c9a84c)",
          borderColor:
            "color-mix(in oklab, var(--pc-home-gold, #c9a84c) 55%, transparent)",
        }
      : {
          background: "#ffffff",
          color: "var(--pc-home-heading, #0a1c3d)",
          borderColor:
            "color-mix(in oklab, var(--pc-home-heading, #0a1c3d) 20%, transparent)",
        };

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5",
        "whitespace-nowrap rounded-full border px-2.5 py-1",
        "text-[10.5px] font-bold uppercase tracking-[0.14em]",
        "opacity-0 shadow-[0_6px_18px_-8px_rgba(8,18,42,0.55)] transition-all duration-200",
        "group-hover:opacity-100 group-focus-visible:opacity-100",
        pos,
        className,
      )}
      style={palette}
    >
      <StoreMarkIcon />
      {name}
    </span>
  );
}

function StoreMarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-2.5 w-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9l1.5-4h15L21 9" />
      <path d="M4 9v11h16V9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
