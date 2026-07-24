import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store as StoreIcon, ArrowRight, Flame, History as HistoryIcon, X, Trash2 } from "lucide-react";
import { listPublicStores } from "@/lib/stores-public.functions";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import { useConfirm } from "@/components/feedback/confirm-provider";

const POPULAR: string[] = [
  "arroz 5kg",
  "feijão carioca",
  "café 500g",
  "leite integral",
  "óleo de soja",
  "açúcar refinado",
];

type Props = {
  recent: string[];
  onPickQuery: (q: string) => void;
  onRemoveRecent?: (q: string) => void;
  onClearRecent?: () => void;
};

export function SearchSidebar({ recent, onPickQuery, onRemoveRecent, onClearRecent }: Props) {
  const stores = useQuery({
    queryKey: ["public-stores-sidebar"],
    queryFn: () => listPublicStores(),
    staleTime: 5 * 60_000,
  });
  const confirm = useConfirm();

  const list = (stores.data ?? []).slice(0, 6);

  async function handleClearAll() {
    if (!onClearRecent || recent.length === 0) return;
    const ok = await confirm({
      title: "Limpar histórico de buscas?",
      description: "As últimas consultas salvas neste navegador serão removidas. Esta ação não pode ser desfeita.",
      confirmLabel: "Limpar tudo",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (ok) onClearRecent();
  }

  return (
    <aside className="sticky top-24 space-y-4">
      {/* Últimas buscas */}
      <SidebarSection
        icon={<HistoryIcon className="h-3.5 w-3.5" />}
        title="Últimas buscas"
        action={
          recent.length > 0 && onClearRecent ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              aria-label="Limpar histórico de buscas"
            >
              <Trash2 className="h-3 w-3" /> Limpar
            </button>
          ) : undefined
        }
      >
        {recent.length === 0 ? (
          <p className="px-1 text-[12px] text-muted-foreground">
            Suas últimas consultas aparecem aqui.
          </p>
        ) : (
          <ul className="space-y-1">
            {recent.slice(0, 6).map((t) => (
              <li key={t} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPickQuery(t)}
                  className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[12.5px] text-foreground/90 transition-colors hover:bg-brand-gold/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  {t}
                </button>
                {onRemoveRecent && (
                  <button
                    type="button"
                    onClick={() => onRemoveRecent(t)}
                    className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold group-hover:opacity-100"
                    aria-label={`Remover "${t}" do histórico`}
                    title="Remover do histórico"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SidebarSection>


      {/* Populares */}
      <SidebarSection
        icon={<Flame className="h-3.5 w-3.5 text-brand-gold" />}
        title="Buscas populares"
      >
        <ul className="space-y-1">
          {POPULAR.map((p, i) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPickQuery(p)}
                className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-foreground/90 transition-colors hover:bg-brand-gold/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <span className="w-4 text-[11px] font-semibold tabular-nums text-brand-gold">
                  {i + 1}
                </span>
                <span className="truncate">{p}</span>
              </button>
            </li>
          ))}
        </ul>
      </SidebarSection>

      {/* Mercados parceiros */}
      <SidebarSection
        icon={<StoreIcon className="h-3.5 w-3.5" />}
        title="Mercados parceiros"
        action={
          <Link
            to="/estabelecimentos"
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-gold hover:underline"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {stores.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {list.map((s) => (
              <li key={s.id}>
                <Link
                  to="/estabelecimento/$slug"
                  params={{ slug: slugifyEstablishment(s.name) }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-brand-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md border border-brand-gold/30 bg-background">
                    {s.logoUrl ? (
                      <img
                        src={s.logoUrl}
                        alt={s.name}
                        className="h-full w-full object-contain p-0.5"
                        loading="lazy"
                      />
                    ) : (
                      <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-foreground">
                      {s.name}
                    </div>
                    {s.neighborhood && (
                      <div className="truncate text-[10.5px] text-muted-foreground">
                        {s.neighborhood}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
            {list.length === 0 && (
              <p className="px-1 text-[12px] text-muted-foreground">
                Nenhum mercado disponível.
              </p>
            )}
          </ul>
        )}
      </SidebarSection>
    </aside>
  );
}

function SidebarSection({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-card/40 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em]">{title}</h3>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
