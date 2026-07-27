import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageShell, PageShellContent } from "./PageShell";

/**
 * IsolatedPage — página compacta e isolada (sem footer, sem elementos extras).
 *
 * Componente único usado por todas as páginas internas que precisam ficar
 * "cirurgicamente" focadas no conteúdo (comparador, ranking, painéis
 * modais, etc). Garante:
 *
 *  • Sem SiteFooter (visualização isolada);
 *  • MobileNav preservada (a11y de navegação persistente);
 *  • Padding interno consistente (via PageShellContent);
 *  • Tokens semânticos apenas — nada de cores hard-coded.
 *
 * Use `contentClassName` para ajustar o container interno; o wrapper
 * externo permanece com o layout coluna/altura padrão.
 */
export function IsolatedPage({
  children,
  className,
  contentClassName,
  hideMobileNav = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  hideMobileNav?: boolean;
}) {
  return (
    <PageShell hideFooter hideMobileNav={hideMobileNav} className={className}>
      <PageShellContent className={cn("mx-auto w-full", contentClassName)}>
        {children}
      </PageShellContent>
    </PageShell>
  );
}
