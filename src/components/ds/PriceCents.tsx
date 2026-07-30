/**
 * <PriceCents /> — exibição padronizada de valores armazenados em centavos.
 *
 * Motivação: licenças, pedidos e checkout guardam o valor como inteiro em
 * centavos (ex.: 2990 = R$ 29,90). Antes cada rota tinha o seu próprio
 * `brl(cents)` com `toLocaleString`, o que quebrava a tipografia Oswald +
 * tabular-nums do design system.
 *
 * Este componente é apenas um adaptador fino sobre <Price />: converte
 * centavos → reais e repassa todas as props (size, tone, suffix, as...).
 * Assim, licenças e pedidos herdam exatamente as mesmas escalas e tons
 * usados nos preços de produto.
 */

import { Price, type PriceProps } from "@/components/ds/Price";

export interface PriceCentsProps extends Omit<PriceProps, "value"> {
  /** Valor inteiro em centavos. `null`/`undefined`/NaN renderiza "—". */
  cents: number | null | undefined;
  /**
   * Quando `true`, valores nulos são tratados como 0 (R$ 0,00) em vez de "—".
   * Útil em tabelas financeiras onde "sem valor" significa gratuito.
   */
  zeroWhenEmpty?: boolean;
}

/** Converte centavos em reais de forma defensiva (evita NaN e float drift). */
export function centsToReais(cents: number | null | undefined): number | null {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return null;
  return Math.round(cents) / 100;
}

/** Formata centavos como texto puro — use apenas fora da UI visual
 *  (aria-labels compostos, toasts, exportações CSV/PDF). */
export function formatCentsText(cents: number | null | undefined): string {
  const reais = centsToReais(cents) ?? 0;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PriceCents({ cents, zeroWhenEmpty = false, ...rest }: PriceCentsProps) {
  const reais = centsToReais(cents);
  const value = reais === null && zeroWhenEmpty ? 0 : reais;
  return <Price {...rest} value={value} />;
}

export default PriceCents;
