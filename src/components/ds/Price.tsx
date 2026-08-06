/**
 * <Price /> — componente canônico de preço do PreçoCerto.
 *
 * Objetivo: um único estilo de preço em todo o site (pesos, tamanhos, prefixo
 * "R$" e sufixos como "/kg"), evitando que cada tela invente sua própria
 * combinação de classes.
 *
 * Estrutura renderizada (sempre a mesma):
 *   <span class="pc-price pc-price--{size} pc-price--{tone}">
 *     <span class="pc-price__prefix">R$</span>
 *     <span class="pc-price__value">12,90</span>
 *     <span class="pc-price__suffix">/kg</span>
 *   </span>
 *
 * Regras de tipografia (definidas em src/styles.css):
 *  - valor: tabular-nums, peso por tamanho;
 *  - prefixo/sufixo: menores e com peso reduzido;
 *  - cores: sempre tokens semânticos.
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
  /** Valor numérico em reais. Valores inválidos (NaN/null) renderizam "—". */
  value: number | null | undefined;
  /** Escala tipográfica padronizada. */
  size?: PriceSize;
  /** Intenção visual (melhor preço, riscado, economia, etc.). */
  tone?: PriceTone;
  /** Prefixo monetário. `false` remove (útil em colunas já rotuladas). */
  prefix?: ReactNode | false;
  /** Sufixo curto: "/kg", "/un", "/mês". */
  suffix?: ReactNode;
  /** Renderiza um elemento diferente de <span> (ex.: "p", "div", "strong"). */
  as?: ElementType;
  /** Texto acessível alternativo; por padrão descreve o valor por extenso. */
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

/*
 * PERFORMANCE: `Number.prototype.toLocaleString` cria um formatador Intl novo
 * a cada chamada (operação cara). Numa tabela com 500 preços isso são 500
 * formatadores por render. Aqui o formatador é criado UMA vez por sessão e o
 * resultado de cada valor fica em cache.
 */
const BRL_DIGITS = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DIGITS_CACHE = new Map<number, string>();

/** Formata apenas os dígitos (sem símbolo), para separar prefixo do valor. */
export function formatPriceDigits(value: number): string {
  const cached = DIGITS_CACHE.get(value);
  if (cached !== undefined) return cached;
  const out = BRL_DIGITS.format(value);
  if (DIGITS_CACHE.size >= 4000) DIGITS_CACHE.clear();
  DIGITS_CACHE.set(value, out);
  return out;
}

const BLOCK_TAGS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"]);

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
  /* .pc-price é inline-flex por padrão (para ficar no meio de uma frase).
     Quando o preço é renderizado como bloco (p/div/h*), ele precisa ocupar a
     própria linha — senão encosta no eyebrow/label anterior. */
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
      {prefix !== false && <span className="pc-price__prefix" aria-hidden="true">{prefix}</span>}
      <span className="pc-price__value">{digits}</span>
      {suffix ? (
        <span className="pc-price__suffix" aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </Tag>
  );
}

/*
 * PERFORMANCE: memoizado. Como as props são primitivas, o React pula o render
 * de todos os preços que não mudaram quando a lista pai re-renderiza.
 */
export const Price = memo(PriceBase);
Price.displayName = "Price";

export default Price;

