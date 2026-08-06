import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeBrandLink } from "./HomeBrandLink";

export type Crumb = { label: string; to?: string };

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  sticky?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  sticky = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "z-10 -mx-4 mb-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 pb-6 pt-5 backdrop-blur-md md:-mx-6 md:px-6",
        sticky && "lg:sticky lg:top-0",
        className,
      )}
    >
      {/* Marca clicável em todas as rotas — não depende do botão "Voltar". */}
      <div className="mb-1.5 flex min-w-0 items-center">
        <HomeBrandLink className="-ml-1" />
      </div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Trilha de navegação"
          className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground"
        >
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              {c.to ? (
                <Link to={c.to} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[clamp(1.5rem,2.5vw,2.5rem)] font-black tracking-tight text-[var(--text-primary)] leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
