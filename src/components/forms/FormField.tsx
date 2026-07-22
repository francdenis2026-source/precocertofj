import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

/**
 * FormField — padrão único Navy Trust Executive.
 * ----------------------------------------------
 * Encapsula label + input + hint + mensagem de erro/sucesso com o mesmo
 * espaçamento, tipografia e estados de validação em todo o produto.
 *
 * Uso simples:
 *   <FormField label="E-mail" required value={email} onChange={setEmail}
 *              type="email" error={errors.email} hint="Nunca compartilhamos." />
 *
 * Uso com input customizado (children):
 *   <FormField label="Plano" required error={errors.plan}>
 *     <Select value={plan} onValueChange={setPlan}>...</Select>
 *   </FormField>
 */

export type FormFieldStatus = "idle" | "checking" | "valid" | "error";

type BaseProps = {
  /** Label acima do campo. Obrigatório para acessibilidade. */
  label: React.ReactNode;
  /** Marca visualmente como obrigatório (adiciona *). */
  required?: boolean;
  /** Texto opcional de ajuda embaixo. Suprimido quando há error. */
  hint?: React.ReactNode;
  /** Mensagem de erro compacta em vermelho. */
  error?: string | null;
  /** Mensagem de sucesso compacta em verde (savings). */
  success?: string | null;
  /** Estado da validação — controla o ícone à direita. */
  status?: FormFieldStatus;
  /** id do input — gerado automaticamente se ausente. */
  id?: string;
  /** Classe extra no wrapper externo. */
  className?: string;
  /** Rótulo à direita do label (ex.: "opcional"). */
  labelAddon?: React.ReactNode;
};

type WithChildren = BaseProps & {
  children: React.ReactNode;
} & { [K in keyof React.InputHTMLAttributes<HTMLInputElement>]?: never };

type WithInput = BaseProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
    children?: undefined;
    onChange?: (value: string) => void;
  };

export type FormFieldProps = WithChildren | WithInput;

export function FormField(props: FormFieldProps) {
  const uid = React.useId();
  const id = props.id ?? uid;
  const errorId = `${id}-err`;
  const hintId = `${id}-hint`;

  const {
    label,
    required,
    hint,
    error,
    success,
    status,
    className,
    labelAddon,
  } = props;

  const describedBy = [
    error ? errorId : null,
    hint && !error ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const isChildren = "children" in props && props.children !== undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label
          htmlFor={id}
          className="text-[12.5px] font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {labelAddon && (
          <span className="text-[11px] text-muted-foreground">{labelAddon}</span>
        )}
      </div>

      <div className="relative">
        {isChildren ? (
          // Renderiza filhos custom (Select, Textarea, etc.) e injeta id via context não é seguro,
          // então o consumer deve passar id={id} manualmente quando precisar. Wrapper mantém aria.
          <div aria-describedby={describedBy}>{(props as WithChildren).children}</div>
        ) : (
          <>
            <Input
              id={id}
              aria-invalid={!!error}
              aria-describedby={describedBy}
              className={cn(
                "h-10 rounded-lg border-border/70 bg-card px-3 text-[14px]",
                "focus-visible:ring-2 focus-visible:ring-primary/40",
                error &&
                  "border-destructive/60 focus-visible:ring-destructive/40",
                status === "valid" &&
                  "border-savings/50 focus-visible:ring-savings/30",
                (props as WithInput).className,
              )}
              {...(() => {
                const {
                  label: _l,
                  required: _r,
                  hint: _h,
                  error: _e,
                  success: _s,
                  status: _st,
                  className: _c,
                  labelAddon: _la,
                  onChange,
                  ...rest
                } = props as WithInput;
                return {
                  ...rest,
                  onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
                    onChange?.(ev.target.value),
                };
              })()}
            />
            {status && status !== "idle" && (
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                {status === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {status === "valid" && (
                  <CheckCircle2 className="h-4 w-4 text-savings" />
                )}
                {status === "error" && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </span>
            )}
          </>
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-[11.5px] font-medium text-destructive"
        >
          <AlertCircle className="mt-[1px] h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : success ? (
        <p className="flex items-start gap-1 text-[11.5px] font-medium text-savings">
          <CheckCircle2 className="mt-[1px] h-3 w-3 shrink-0" />
          {success}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11.5px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
