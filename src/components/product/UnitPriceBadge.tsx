import { computeUnitPrice } from "@/lib/unit-price";

type Props = {
  price: number | null | undefined;
  productName: string | null | undefined;
  sizeValue?: number | null;
  sizeUnit?: string | null;
  className?: string;
  /** Quando true, mostra também o preço/unidade em multipack. */
  showPack?: boolean;
  /**
   * Quando true, sinaliza visualmente que o valor foi convertido
   * a partir de outra unidade (g→kg, ml→L ou multipack).
   * Default: true — sempre marcar conversões para permitir comparação
   * segura entre produtos vendidos em unidades diferentes.
   */
  showConverted?: boolean;
};

/**
 * Badge compacto de preço unitário normalizado (R$/kg, R$/L, R$/un).
 * Renderiza null quando o produto não tem tamanho detectável — não estima.
 * Marca com "conv." quando o valor foi normalizado a partir de uma unidade
 * diferente da base (ex.: 900ml → R$/L, 6x350ml → R$/L), de forma que a
 * comparação entre itens vendidos em unidades diferentes fique explícita.
 */
export function UnitPriceBadge({
  price,
  productName,
  sizeValue,
  sizeUnit,
  className,
  showPack = false,
  showConverted = true,
}: Props) {
  const u = computeUnitPrice(price, productName, {
    sizeValue: sizeValue ?? null,
    sizeUnit: sizeUnit ?? null,
  });
  if (!u) return null;
  const ariaLabel = u.isPack && u.perPackLabel
    ? `Unit price: ${u.label}, ${u.perPackLabel}${u.converted ? `, converted from ${u.sourceLabel}` : ""}`
    : `Unit price: ${u.label}${u.converted ? `, converted from ${u.sourceLabel}` : ""}`;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-sm border border-accent-strong/40 bg-accent/[0.08] px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase leading-none tracking-wide text-accent-ink " +
        (className ?? "")
      }
      aria-label={ariaLabel}
    >

      {u.label}
      {showConverted && u.converted ? (
        <span
          aria-label={`converted from ${u.sourceLabel}`}
          className="ml-1 rounded-[3px] bg-accent-strong/15 px-1 py-[1px] font-sans text-[11px] font-semibold uppercase tracking-wide text-accent-ink"
        >
          conv.
        </span>
      ) : null}
      {showPack && u.isPack && u.perPackLabel ? (
        <span className="ml-1 font-sans text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
          • {u.perPackLabel}
        </span>
      ) : null}
    </span>
  );
}
