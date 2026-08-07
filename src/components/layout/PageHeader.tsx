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
        "z-10 -mx-4 mb-8 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 px-4 pb-8 pt-6 backdrop-blur-md md:-mx-6 md:px-6",
        sticky && "lg:sticky lg:top-0",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <HomeBrandLink />
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                {c.to ? (
                  <Link to={c.to} className="hover:text-[var(--text-primary)]">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-[var(--text-primary)] font-medium">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-[14px] text-[var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}