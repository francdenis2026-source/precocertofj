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
        "border-b border-border/60 bg-background/90 px-4 py-6 backdrop-blur md:px-8 md:py-8",
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

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            {icon && (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground md:h-12 md:w-12">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <div className="text-overline">
                  {eyebrow}
                </div>
              )}
              {goldRule && (
                <div
                  className="mb-2 mt-1.5 h-[3px] w-10 rounded-full"
                  style={{ background: "#b58a3c" }}
                />
              )}
              <h1
                className={cn(
                  "mt-1.5 text-h1 text-foreground",
                  editorial &&
                    "font-normal font-['Instrument_Serif',ui-serif,serif] text-editorial tracking-normal",
                )}
              >
                {title}
              </h1>
              {description && (
                <p className="mt-2 max-w-2xl text-body text-muted-foreground">
                  {description}
                </p>
              )}
              {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
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
