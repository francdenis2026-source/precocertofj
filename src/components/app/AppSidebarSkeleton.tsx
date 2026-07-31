import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";

/**
 * Skeleton de carregamento da sidebar do painel.
 * Mantém a mesma métrica (altura 36px, chip 32px) dos itens reais,
 * evitando saltos de layout na transição carregando → carregado.
 */
export function AppSidebarSkeleton({
  groups = [
    { label: "Comprar melhor", items: 5 },
    { label: "Minha conta", items: 4 },
    { label: "Assinatura", items: 3 },
  ],
}: {
  groups?: readonly { label: string; items: number }[];
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="pc-nav-skel-wrap animate-in fade-in-0 duration-200"
    >
      <span className="sr-only">Carregando menu do painel…</span>
      {groups.map((g) => (
        <SidebarGroup key={g.label} className="px-0 py-1.5">
          <SidebarGroupLabel className="h-6 px-2 group-data-[collapsible=icon]:hidden">
            <span className="pc-nav-skel h-2.5 w-24 rounded-full" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: g.items }).map((_, i) => (
                <div key={i} className="flex h-9 items-center gap-2.5 rounded-md px-2">
                  <span className="pc-nav-skel h-8 w-8 shrink-0 rounded-md" />
                  <span
                    className="pc-nav-skel h-2.5 rounded-full group-data-[collapsible=icon]:hidden"
                    style={{ width: `${58 + ((i * 17) % 34)}%` }}
                  />
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  );
}
