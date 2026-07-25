import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BackButton } from "./BackButton";

export type InternalCrumb = { label: string; to?: string };

interface InternalPageHeaderProps {
  /** Título principal. O termo passado em `highlight` recebe o acento gold. */
  title: string;
  /** Palavra do título que deve receber o acento gold da homepage. */
  highlight?: string;
  /** Sublinha curta (12.5–13px). */
  description?: ReactNode;
  /** Ações à direita (botões, badges). */
  actions?: ReactNode;
  /** Trilha compacta acima do título. */
  breadcrumbs?: InternalCrumb[];
  /** Exibe botão "Voltar" inteligente (usa histórico do SPA). Default: true. */
  showBack?: boolean;
  /** Rota de fallback do botão voltar quando não há histórico. Default: "/". */
  backFallback?: string;
  className?: string;
}

/**
 * Cabeçalho reutilizável para páginas internas — segue a mesma linguagem
 * visual da homepage:
 *  • título em `--font-display` (Instrument Serif) com acento gold opcional
 *  • breadcrumb inline compacto
 *  • cores 100% tokens semânticos (funciona em light e dark)
 */
export function InternalPageHeader({
  title,
  highlight,
  description,
  actions,
  breadcrumbs,
  showBack = true,
  backFallback = "/",
  className,
}: InternalPageHeaderProps) {
  const renderTitle = () => {
    if (!highlight) return title;
    const idx = title.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return title;
    return (
      <>
        {title.slice(0, idx)}
        <span
          style={{ color: "var(--pc-home-gold, hsl(var(--primary)))" }}
          className="font-medium"
        >
          {title.slice(idx, idx + highlight.length)}
        </span>
        {title.slice(idx + highlight.length)}
      </>
    );
  };

  return (
    <header
      className={cn(
        "mb-3 border-b border-border/50 pb-3",
        className,
      )}
    >
      {showBack && (
        <div className="mb-1.5">
          <BackButton fallbackTo={backFallback} variant="ghost" />
        </div>
      )}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Trilha de navegação"
          className="mb-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground"
        >
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true" className="opacity-50">/</span>}
              {c.to ? (
                <Link to={c.to} className="transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="truncate text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.05] tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {renderTitle()}
          </h1>
          {description && (
            <p className="mt-0.5 max-w-2xl text-[12.5px] leading-snug text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
