import { Link } from "@tanstack/react-router";
import { UserPlus, ArrowRight } from "lucide-react";

interface SignupCTAProps {
  /** Contexto do CTA — muda a copy conforme a ação */
  context?: "save-comparison" | "build-list" | "generic";
  className?: string;
  compact?: boolean;
}

const COPY: Record<NonNullable<SignupCTAProps["context"]>, { title: string; hint: string }> = {
  "save-comparison": {
    title: "Salvar esta comparação",
    hint: "Crie uma conta grátis para acompanhar preços e receber alertas.",
  },
  "build-list": {
    title: "Montar sua lista de compras",
    hint: "Crie uma conta grátis para comparar listas entre mercados.",
  },
  generic: {
    title: "Salvar seus resultados",
    hint: "Crie uma conta grátis para acompanhar e comparar depois.",
  },
};

/**
 * CTA discreto para criação de conta — só aparece para visitantes
 * quando fazem sentido salvar ou continuar o fluxo.
 * Segue o design system Signal White (borda sutil, primary como acento).
 */
export function SignupCTA({ context = "generic", className = "", compact = false }: SignupCTAProps) {
  const { title, hint } = COPY[context];

  if (compact) {
    return (
      <Link
        to="/auth"
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline ${className}`}
      >
        <UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />
        {title}
        <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
      </Link>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-[var(--radius-2xl)] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserPlus className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Link
        to="/auth"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
      >
        Criar conta grátis
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
      </Link>
    </div>
  );
}
