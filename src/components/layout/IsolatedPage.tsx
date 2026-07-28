import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageShell, PageShellContent } from "./PageShell";

/**
 * IsolatedPage — página compacta e isolada (sem footer, sem elementos extras).
 *
 * Garante:
 *  • Sem SiteFooter (visualização isolada);
 *  • MobileNav preservada (a11y de navegação persistente);
 *  • Padding interno consistente (via PageShellContent);
 *  • Tokens semânticos apenas — nada de cores hard-coded.
 *
 * Ative `fit` para single-viewport (100dvh, sem scroll de body). Nesse modo
 * o container interno usa altura calculada e `flex-initial`, resolvendo o
 * conflito histórico entre `flex-1` e `h-[...]` dos filhos.
 */
export function IsolatedPage({
  children,
  className,
  contentClassName,
  hideMobileNav = false,
  fit = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  hideMobileNav?: boolean;
  fit?: boolean;
}) {
  return (
    <PageShell
      hideFooter
      hideMobileNav={hideMobileNav}
      fit={fit}
      className={className}
    >
      <PageShellContent fit={fit} className={cn("mx-auto w-full", contentClassName)}>
        {children}
      </PageShellContent>
    </PageShell>
  );
}
