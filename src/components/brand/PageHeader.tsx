import type { ReactNode } from "react";

/**
 * Cabeçalho editorial reutilizável — identidade "Fresh Market Refinado":
 * eyebrow em maiúsculas espaçadas, título em DM Serif Display,
 * filete verde curto abaixo do título e descrição em Fira Sans.
 *
 * Usar no topo de páginas de conteúdo (/buscar, /comparador, /melhores-precos).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Slot para botões/CTAs à direita em telas grandes. */
  actions?: ReactNode;
  /** Slot para chips/badges (ex.: FreeQuotaBadge) logo abaixo da descrição. */
  meta?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-foreground md:text-5xl">
              {title}
            </h1>
            {/* Filete verde — assinatura editorial */}
            <div
              aria-hidden="true"
              className="mt-4 h-[3px] w-14 rounded-full bg-primary"
            />
            {description && (
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground md:text-base">
                {description}
              </p>
            )}
            {meta && <div className="mt-5 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

/**
 * Cabeçalho de seção dentro de páginas — versão compacta com filete verde.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  const alignCls = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col ${alignCls}`}>
      {eyebrow && (
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-display text-2xl leading-tight text-foreground md:text-3xl">
        {title}
      </h2>
      <div aria-hidden="true" className="mt-2 h-[2px] w-10 rounded-full bg-primary" />
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
