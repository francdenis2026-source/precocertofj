import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SiteFooter } from "./SiteFooter";
import { MobileNav } from "@/components/nav/MobileNav";

interface PageShellProps {
  children: ReactNode;
  className?: string;
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
 *  • o padding inferior para a MobileNav deve ser aplicado no conteúdo,
 *    NUNCA no wrapper (para não criar gap escuro abaixo do rodapé);
 *  • cores e tokens 100% semânticos.
 *
 * Use `<PageShellContent>` para o miolo (aplica pb-mobile-nav) ou aplique
 * `pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0` no seu container.
 */
export function PageShell({
  children,
  className,
  hideMobileNav = false,
  hideFooter = false,
}: PageShellProps) {
  return (
    <div className={cn("bg-background text-foreground", className)}>
      {children}
      {!hideFooter && <SiteFooter />}
      {!hideMobileNav && <MobileNav />}
    </div>
  );
}

/**
 * Container do miolo da página que já aplica o safe-space para a MobileNav.
 * Use como wrapper de todo o conteúdo acima do footer.
 */
export function PageShellContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
