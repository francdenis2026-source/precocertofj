/**
 * <Price /> — componente canônico de preço do PreçoCerto.
 */

import { memo, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PriceSize = "xs" | "sm" | "md" | "lg" | "xl" | "display";
export type PriceTone =
  | "default"
  | "best"
  | "muted"
  | "strike"
  | "savings"
  | "onhero";

export interface PriceProps extends Omit<ComponentPropsWithoutRef<"span">, "prefix" | "children"> {
  value: number | null | undefined;
  size?: PriceSize;
  tone?: PriceTone;
  prefix?: ReactNode | false;
  suffix?: ReactNode;
  as?: ElementType;
  srLabel?: string;
}

const SIZE_CLASS: Record<PriceSize, string> = {
  xs: "pc-price--xs",
  sm: "pc-price--sm",
  md: "pc-price--md",
  lg: "pc-price--lg",
  xl: "pc-price--xl",
  display: "pc-price--display",
};

const TONE_CLASS: Record<PriceTone, string> = {
  default: "",
  best: "pc-price--best",
  muted: "pc-price--muted",
  strike: "pc-price--strike",
  savings: "pc-price--savings",
  onhero: "pc-price--onhero",
};

const BRL_DIGITS = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DIGITS_CACHE = new Map<number, string>();

export function formatPriceDigits(value: number): string {
  const cached = DIGITS_CACHE.get(value);
  if (cached !== undefined) return cached;
  const out = BRL_DIGITS.format(value);
  if (DIGITS_CACHE.size >= 4000) DIGITS_CACHE.clear();
  DIGITS_CACHE.set(value, out);
  return out;
}

function PriceBase({
  value,
  size = "md",
  tone = "default",
  prefix = "R$",
  suffix,
  as,
  srLabel,
  className,
  ...rest
}: PriceProps) {
  const Tag = (as ?? "span") as ElementType;
  const blockish =
    typeof Tag === "string" && ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"].includes(Tag);
  const layoutClass = blockish ? "pc-price--block" : undefined;
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : null;

  if (numeric === null) {
    return (
      <Tag
        {...rest}
        className={cn("pc-price", SIZE_CLASS[size], "pc-price--muted", layoutClass, className)}
        aria-label={srLabel ?? "Preço indisponível"}
      >
        <span className="pc-price__value">—</span>
      </Tag>
    );
  }

  const digits = formatPriceDigits(numeric);

  return (
    <Tag
      {...rest}
      className={cn("pc-price", SIZE_CLASS[size], TONE_CLASS[tone], layoutClass, className)}
      aria-label={srLabel ?? `${digits.replace(",", " reais e ")} centavos`}
    >
      {prefix !== false && <span className="pc-price__prefix mr-0.5" aria-hidden="true">{prefix}</span>}
      <span className="pc-price__value tabular-nums">{digits}</span>

      {suffix ? (
        <span className="pc-price__suffix" aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </Tag>
  );
}

export const Price = memo(PriceBase);
Price.displayName = "Price";
export default Price;
