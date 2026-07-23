import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getShoppingList, computeBestPrices } from "@/lib/shopping-list.functions";
import {
  ArrowRight,
  Check,
  ListChecks,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Store,
  TrendingDown,
} from "lucide-react";

const searchSchema = z.object({ id: z.string().min(1) });

export const Route = createFileRoute("/lista_/pronta")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Lista pronta — PreçoCerto" },
      {
        name: "description",
        content:
          "Sua lista está pronta. Veja o resumo e o próximo passo para comparar preços nos mercados de Feijó.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <ListaProntaPage />
    </ProtectedGate>
  ),
});

function ListaProntaPage() {
  const { id } = useSearch({ from: "/lista/pronta" });
  const getListFn = useServerFn(getShoppingList);
  const bestFn = useServerFn(computeBestPrices);

  const detail = useQuery({
    queryKey: ["shopping-list", id],
    queryFn: () => getListFn({ data: { id } }),
  });

  const best = useQuery({
    queryKey: ["shopping-list-best", id],
    queryFn: () => bestFn({ data: { listId: id } }),
    enabled: !!detail.data && detail.data.items.length > 0,
    staleTime: 60_000,
  });

  const totals = useMemo(() => {
    const items = detail.data?.items ?? [];
    const totalItems = items.length;
    const totalUnits = items.reduce(
      (s, it) => s + Number((it as { quantity?: number }).quantity ?? 1),
      0,
    );
    return { totalItems, totalUnits };
  }, [detail.data]);

  const bestCart = best.data?.bestCart ?? null;
  const covered = best.data?.items.filter((i) => i.best).length ?? 0;
  const matchable = best.data?.items.length ?? 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-10">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground md:text-4xl">
            Sua lista está pronta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.isLoading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando resumo...
              </span>
            ) : (
              <>
                <span className="font-semibold text-foreground">
                  {detail.data?.name ?? "Lista"}
                </span>
                {" "}• {totals.totalItems} {totals.totalItems === 1 ? "item" : "itens"} • {totals.totalUnits} un.
              </>
            )}
          </p>
        </div>

        {/* Melhor mercado (auto) */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
              Buscando os melhores preços em Feijó
            </span>
          </div>

          {best.isLoading || (best.isFetching && !best.data) ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Comparando com os mercados cadastrados...
            </div>
          ) : bestCart ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-2xl font-extrabold text-foreground">
                    {bestCart.marketName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cesta com {bestCart.itemsCovered} de {bestCart.itemsTotal} itens
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Estimado
                  </p>
                  <p className="text-2xl font-extrabold tabular-nums text-primary">
                    R$ {bestCart.total.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>
              {best.data?.splitRoute && best.data.splitRoute.savings > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Economize R$ {best.data.splitRoute.savings.toFixed(2).replace(".", ",")}
                  {" "}dividindo em {best.data.splitRoute.assignments.length} mercados
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              Ainda não conseguimos casar seus itens com preços coletados nos
              mercados. Isso é normal quando eles são adicionados manualmente —
              use a busca no catálogo para linkar os produtos e ver ofertas
              automáticas.
            </div>
          )}
        </div>

        {/* Checklist do próximo passo */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-2 text-foreground">
            <ListChecks className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              O que fazer agora
            </span>
          </div>
          <ol className="mt-3 space-y-3">
            <ChecklistItem
              done
              title="Lista criada"
              subtitle={`${totals.totalItems} ${totals.totalItems === 1 ? "item" : "itens"} salvos com segurança.`}
            />
            <ChecklistItem
              done={!best.isLoading}
              title={
                best.isLoading
                  ? "Comparando preços nos mercados..."
                  : bestCart
                    ? `Melhor mercado encontrado: ${bestCart.marketName}`
                    : "Comparação concluída"
              }
              subtitle={
                bestCart
                  ? `Cobertura de ${covered} de ${matchable} itens do catálogo.`
                  : "Nenhum casamento automático. Refine no próximo passo."
              }
              spinner={best.isLoading}
            />
            <ChecklistItem
              title="Abra sua lista e ajuste quantidades"
              subtitle="Marque o que já comprou e edite valores conforme for às compras."
              action={{ to: "/lista", label: "Abrir minha lista", icon: ArrowRight }}
              primary
            />
            <ChecklistItem
              title="Adicione mais itens do catálogo"
              subtitle="Itens do catálogo têm comparação automática por barcode e nome."
              action={{ to: "/buscar", label: "Buscar no catálogo", icon: Search }}
            />
          </ol>
        </div>

        {/* Detalhes por mercado (top 3) */}
        {best.data && best.data.markets.length > 1 && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Outros mercados comparados
            </p>
            <ul className="mt-3 divide-y divide-border">
              {best.data.markets.slice(0, 4).map((m) => (
                <li key={m.marketName} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{m.marketName}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.itemsCovered} de {m.itemsTotal} itens
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    R$ {m.total.toFixed(2).replace(".", ",")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA principal */}
        <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/app"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
          >
            Voltar ao painel
          </Link>
          <Link
            to="/lista"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            <MapPin className="h-4 w-4" /> Ver comparação completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

type ChecklistItemProps = {
  done?: boolean;
  title: string;
  subtitle?: string;
  spinner?: boolean;
  primary?: boolean;
  action?: { to: string; label: string; icon: typeof ArrowRight };
};

function ChecklistItem({ done, title, subtitle, spinner, primary, action }: ChecklistItemProps) {
  const ActionIcon = action?.icon ?? ArrowRight;
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          done
            ? "border-primary bg-primary text-primary-foreground"
            : primary
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground"
        }`}
      >
        {spinner ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : done ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : (
          <span className="text-[11px] font-bold">→</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-foreground"}`}>{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        {action && (
          <Link
            to={action.to}
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              primary
                ? "bg-primary text-primary-foreground hover:brightness-105"
                : "border border-border bg-background text-foreground hover:border-primary/50"
            }`}
          >
            {action.label} <ActionIcon className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </li>
  );
}
