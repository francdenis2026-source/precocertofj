import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store as StoreIcon, ArrowRight, Flame, History as HistoryIcon, X, Trash2 } from "lucide-react";
import { listPublicStores } from "@/lib/stores-public.functions";
import { listPopularQueries } from "@/lib/search-popular.functions";
import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import { useConfirm } from "@/components/ui/confirm-provider";
import { LazyImage } from "@/components/media/LazyImage";
import { AcougueCutsBar } from "@/components/ds/AcougueCutsBar";


const POPULAR_FALLBACK: string[] = [
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
  const popular = useQuery({
    queryKey: ["popular-queries", 30, 6],
    queryFn: () => listPopularQueries({ data: { days: 30, limit: 6 } }),
    staleTime: 5 * 60_000,
  });
  const { confirm } = useConfirm();

  const list = (stores.data ?? []).slice(0, 6);
  const popularItems: string[] =
    (popular.data ?? []).map((p) => p.query).filter(Boolean).slice(0, 6);
  const useReal = popularItems.length >= 3;
  const popularList = useReal ? popularItems : POPULAR_FALLBACK;


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
    <aside
      className="pc-sidebar-typo sticky top-24 space-y-5 font-sans antialiased subpixel-antialiased"
      style={{
        fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1, "tnum" 1',
        textRendering: "optimizeLegibility",
        letterSpacing: "normal",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >

      {/* Atalhos de cortes de açougue */}
      <AcougueCutsBar variant="compact" />



      {/* Últimas buscas */}
      <SidebarSection
        icon={<HistoryIcon className="h-4 w-4" />}
        title="Últimas buscas"
        action={
          recent.length > 0 && onClearRecent ? (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              aria-label="Limpar histórico de buscas"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpar
            </button>
          ) : undefined
        }
      >
        {recent.length === 0 ? (
          <p className="px-1 text-[13px] leading-relaxed text-foreground/70">
            Suas últimas consultas aparecem aqui.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {recent.slice(0, 6).map((t) => (
              <li key={t} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPickQuery(t)}
                  className="min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-[var(--pc-hover-tint)] hover:text-brand-navy dark:hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  {t}
                </button>
                {onRemoveRecent && (
                  <button
                    type="button"
                    onClick={() => onRemoveRecent(t)}
                    className="grid h-8 w-8 flex-none place-items-center rounded-md text-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold group-hover:opacity-100"
                    aria-label={`Remover "${t}" do histórico`}
                    title="Remover do histórico"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SidebarSection>


      {/* Populares */}
      <SidebarSection
        icon={<Flame className="h-4 w-4" />}
        title="Buscas populares"
        action={
          useReal ? (
            <span
              title="Agregado dos últimos 30 dias"
              className="inline-flex items-center gap-1 rounded-full bg-brand-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-navy shadow-sm"
            >
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-navy/60 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-navy" />
              </span>
              Ao vivo
            </span>
          ) : undefined
        }
      >
        <ul className="space-y-0.5">
          {popularList.map((p: string, i: number) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPickQuery(p)}
                className="group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13.5px] font-medium text-foreground transition-colors hover:bg-[var(--pc-hover-tint)] hover:text-brand-navy dark:hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-gold text-[11px] font-bold tabular-nums text-brand-navy shadow-sm">
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
        icon={<StoreIcon className="h-4 w-4" />}
        title="Mercados parceiros"
        action={
          <Link
            to="/estabelecimentos"
            className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded text-[12px] font-medium text-brand-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            Todos <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {stores.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {list.map((s) => (
              <li key={s.id}>
                <Link
                  to="/estabelecimento/$slug"
                  params={{ slug: slugifyEstablishment(s.name) }}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-border">
                    {s.logoUrl ? (
                      <LazyImage
                        src={s.logoUrl}
                        alt={s.name}
                        className="h-full w-full object-contain p-0.5"
                      />

                    ) : (
                      <StoreIcon className="h-4 w-4 text-foreground/60" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-foreground">
                      {s.name}
                    </div>
                    {s.neighborhood && (
                      <div className="truncate text-[11.5px] text-foreground/70">
                        {s.neighborhood}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
            {list.length === 0 && (
              <p className="px-1 text-[13px] text-foreground/70">
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
    <section className="border-t border-border/60 pt-5">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-brand-gold/15 text-brand-gold-soft dark:text-brand-gold">
            {icon}
          </span>
          <h3 className="truncate text-[12px] font-medium text-foreground">
            {title}
          </h3>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}



