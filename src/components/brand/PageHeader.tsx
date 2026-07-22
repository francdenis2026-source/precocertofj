import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageHeaderCrumb = {
  label: string;
  to?: string;
};

type PageHeaderProps = {
  /** Eyebrow / kicker acima do título — ex: "Painel · Licenças". */
  eyebrow?: string;
  /** Título principal. Aceita string ou ReactNode (para <em>/<span> inline). */
  title: React.ReactNode;
  /** Descrição curta abaixo do título. */
  description?: React.ReactNode;
  /** Migalhas de pão à la Executive. */
  breadcrumbs?: PageHeaderCrumb[];
  /** Ícone opcional exibido em círculo à esquerda. */
  icon?: React.ReactNode;
  /** Elementos alinhados à direita — botões, filtros, badges. */
  actions?: React.ReactNode;
  /** Meta info inline (badges, contadores) — exibido logo abaixo do título. */
  meta?: React.ReactNode;
  /** Torna o título editorial (Instrument Serif) em vez do padrão UI. */
  editorial?: boolean;
  className?: string;
  /** Se true, exibe uma linha dourada de 24px antes do título. */
  goldRule?: boolean;
};

/**
 * Cabeçalho padronizado — Navy Trust Executive.
 * Uso obrigatório em toda tela de /app e /admin para garantir consistência.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  icon,
  actions,
  meta,
  editorial = false,
  goldRule = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border/60 bg-background/90 px-4 py-5 backdrop-blur md:px-6 md:py-6",
        className,
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
        >
          <Link
            to="/app"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-foreground"
          >
            <Home className="h-3 w-3" />
            <span className="hidden sm:inline">Início</span>
          </Link>
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
              {c.to ? (
                <Link
                  to={c.to}
                  className="rounded-md px-1.5 py-0.5 hover:text-foreground"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="rounded-md px-1.5 py-0.5 font-medium text-foreground">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {eyebrow}
                </div>
              )}
              {goldRule && (
                <div
                  className="mb-2 mt-1 h-[3px] w-8 rounded-full"
                  style={{ background: "#b58a3c" }}
                />
              )}
              <h1
                className={cn(
                  "mt-1 text-[22px] font-bold leading-tight tracking-tight text-foreground md:text-[26px]",
                  editorial &&
                    "font-normal font-['Instrument_Serif',ui-serif,serif] text-[28px] tracking-normal md:text-[34px]",
                )}
              >
                {title}
              </h1>
              {description && (
                <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
              {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
            </div>
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
