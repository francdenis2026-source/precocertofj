import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "article" | "div";
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
}: SectionCardProps) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-4 py-3.5 md:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[clamp(1.05rem,1.5vw,1.25rem)] font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn("px-4 py-4 md:px-5 md:py-5", bodyClassName)}>{children}</div>
    </Tag>
  );
}
