import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NumberInput — componente único para entradas numéricas em todo o sistema.
 *
 * Padrões aplicados:
 * - Spinner nativo removido em todos os navegadores (Chrome/Safari/Firefox).
 * - `inputMode="decimal"` para teclado numérico correto em mobile.
 * - `min=0` por padrão; bloqueia negativos via teclado, paste e clamp em blur.
 * - Bloqueia notação exponencial (`e`/`E`) e sinais `+`/`-`.
 * - Estados focus/hover/disabled consistentes (WCAG 2.1: ring ≥ 3px, contraste AA).
 * - Suporte a `prefix`/`suffix` visuais (ex.: "R$", "kg").
 *
 * Escape hatches:
 * - `allowNegative` habilita valores negativos (o guard global respeita `data-allow-negative`).
 * - `allowExponent` permite `e`/`E` (raro; útil só para inputs científicos).
 */

export interface NumberInputProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "type" | "prefix"> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  allowNegative?: boolean;
  allowExponent?: boolean;
  invalid?: boolean;
  containerClassName?: string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      containerClassName,
      prefix,
      suffix,
      allowNegative = false,
      allowExponent = false,
      invalid = false,
      min,
      inputMode = "decimal",
      onKeyDown,
      onPaste,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!allowNegative && (e.key === "-" || e.key === "Subtract")) {
          e.preventDefault();
        }
        if (e.key === "+") e.preventDefault();
        if (!allowExponent && (e.key === "e" || e.key === "E")) {
          e.preventDefault();
        }
        onKeyDown?.(e);
      },
      [allowNegative, allowExponent, onKeyDown],
    );

    const handlePaste = React.useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text").trim();
        if (!allowNegative && /^-/.test(text)) e.preventDefault();
        if (!allowExponent && /[eE]/.test(text)) e.preventDefault();
        onPaste?.(e);
      },
      [allowNegative, allowExponent, onPaste],
    );

    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        if (el.value === "-" || el.value === "+") {
          el.value = "";
        } else if (!allowNegative && el.value !== "") {
          const n = Number(el.value);
          if (Number.isFinite(n) && n < 0) el.value = "0";
        }
        onBlur?.(e);
      },
      [allowNegative, onBlur],
    );

    const hasAffix = Boolean(prefix) || Boolean(suffix);

    const inputEl = (
      <input
        {...props}
        ref={ref}
        type="number"
        inputMode={inputMode}
        min={min ?? (allowNegative ? undefined : 0)}
        data-allow-negative={allowNegative ? "true" : undefined}
        aria-invalid={invalid || undefined}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        className={cn(
          // base
          "flex h-10 w-full rounded-md border border-input bg-transparent text-base shadow-xs md:text-sm",
          "px-3 py-2",
          hasAffix && "border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-transparent",
          // numeric
          "tabular-nums",
          // motion
          "transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
          // placeholder
          "placeholder:text-muted-foreground",
          // hover
          !hasAffix && "hover:border-ring/40",
          // focus
          !hasAffix &&
            "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          // invalid
          invalid && "border-destructive focus-visible:ring-destructive/40",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );

    if (!hasAffix) return inputEl;

    return (
      <div
        className={cn(
          "flex h-10 w-full items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-xs",
          "transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
          "hover:border-ring/40",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-1 focus-within:ring-offset-background",
          invalid && "border-destructive focus-within:ring-destructive/40",
          containerClassName,
        )}
      >
        {prefix ? (
          <span
            aria-hidden="true"
            className="flex items-center border-r border-input bg-muted/40 px-2.5 text-sm font-medium text-muted-foreground"
          >
            {prefix}
          </span>
        ) : null}
        {inputEl}
        {suffix ? (
          <span
            aria-hidden="true"
            className="flex items-center border-l border-input bg-muted/40 px-2.5 text-sm font-medium text-muted-foreground"
          >
            {suffix}
          </span>
        ) : null}
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
