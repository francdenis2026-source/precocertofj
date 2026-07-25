import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SiteFooter } from "./SiteFooter";
import { MobileNav } from "@/components/nav/MobileNav";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  /** Extra classes for the <main> element (bottom padding for MobileNav is already applied). */
  mainClassName?: string;
  /** Hide the MobileNav (e.g. auth/checkout flows). */
  hideMobileNav?: boolean;
  /** Hide the SiteFooter. */
  hideFooter?: boolean;
}

/**
 * PageShell — layout padrão consistente para páginas internas.
 *
 * Regras de layout:
 *  • wrapper SEM `min-h-screen` e SEM spacers: o rodapé fecha imediatamente
 *    após o conteúdo (não sobra faixa em branco após a rolagem);
 *  • padding inferior para a MobileNav é aplicado no <main>, nunca no wrapper
 *    (evita gap escuro abaixo do rodapé em telas curtas);
 *  • cores e tokens 100% semânticos.
 */
export function PageShell({
  children,
  className,
  mainClassName,
  hideMobileNav = false,
  hideFooter = false,
}: PageShellProps) {
  return (
    <div className={cn("bg-background text-foreground", className)}>
      <main
        className={cn(
          !hideMobileNav && "pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0",
          mainClassName,
        )}
      >
        {children}
      </main>
      {!hideFooter && <SiteFooter />}
      {!hideMobileNav && <MobileNav />}
    </div>
  );
}
