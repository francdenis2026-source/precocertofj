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
  /**
   * Single-viewport mode: fixa a altura em 100dvh e desativa o `flex-1` do
   * wrapper interno, evitando que o conteúdo cresça além da janela.
   * Use quando a página deve caber inteira sem scroll de body.
   */
  fit?: boolean;
}

/**
 * PageShell — layout padrão consistente para páginas internas.
 *
 * Modos:
 *  • padrão: `min-h-[100svh]` com wrapper `flex-1` — o conteúdo cresce
 *    naturalmente e o rodapé fecha depois;
 *  • `fit`: altura FIXA em 100dvh, wrapper interno com `flex-initial` e
 *    `min-h-0` — filhos com `h-full`/`overflow-hidden` respeitam a viewport
 *    (sem clipping, sem scroll de body).
 *
 * O padding inferior para a MobileNav é aplicado no PageShellContent
 * (nunca no wrapper), para não criar gap escuro abaixo do rodapé.
 */
export function PageShell({
  children,
  className,
  hideMobileNav = false,
  hideFooter = false,
  fit = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        fit ? "h-[100dvh] overflow-hidden" : "min-h-[100svh]",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col",
          fit ? "flex-initial min-h-0 flex-1 overflow-hidden" : "flex-1",
        )}
      >
        {children}
      </div>
      {!hideFooter && !fit && <SiteFooter />}
      {!hideMobileNav && <MobileNav />}
    </div>
  );
}

/**
 * Container do miolo da página que já aplica o safe-space para a MobileNav.
 *
 * • padrão: `flex-1` (cresce com o conteúdo) + `pb-mobile-nav`;
 * • `fit`: altura calculada `100dvh - chrome` (121px mobile, 64px desktop)
 *   e `flex-initial`/`min-h-0` — resolve o bug em que `flex-1` sobrescrevia
 *   qualquer `h-[...]` aplicada pelos filhos.
 */
export function PageShellContent({
  children,
  className,
  fit = false,
}: {
  children: ReactNode;
  className?: string;
  /** Fixa altura no viewport (usar dentro de <PageShell fit>). */
  fit?: boolean;
}) {
  return (
    <div
      className={cn(
        fit
          ? "flex-initial min-h-0 flex h-[calc(100dvh-121px)] flex-col overflow-hidden md:h-[calc(100dvh-64px)]"
          : "flex-1 pb-[calc(var(--mobile-nav-height)+1rem)] md:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
