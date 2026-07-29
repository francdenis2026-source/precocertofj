import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Crown,
  Layers,
  Loader2,
  Medal,
  Minus,
  Percent,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { SectionKicker } from "@/components/dashboard/SectionKicker";
import { QuickFilterBar } from "@/components/search/QuickFilterBar";
import { getCheapestStoresRanking } from "@/lib/stores-public.functions";
import { PRODUCT_TYPE_LABEL } from "@/lib/product-type";

import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  laticinios: "Laticínios",
  higiene: "Higiene",
  limpeza: "Limpeza",
  mercearia: "Mercearia",
  biscoitos: "Biscoitos",
  bebidas: "Bebidas",
  bebidas_em_po: "Bebidas em pó",
  doces: "Doces",
  carnes: "Carnes",
  padaria: "Padaria",
  congelados: "Congelados",
  outros: "Outros",
};

const rankAccent = (idx: number) => {
  if (idx === 0) return "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/40";
  if (idx === 1) return "bg-slate-500/10 text-slate-700 dark:text-slate-200 ring-slate-500/40";
  if (idx === 2) return "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/40";
  return "bg-muted text-muted-foreground ring-border";
};

const rankIcon = (idx: number) => {
  if (idx === 0) return Crown;
  if (idx === 1) return Trophy;
  if (idx === 2) return Medal;
  return Store;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Ranking dos mercados mais baratos — agora com filtro por categoria e
 * evolução (hoje vs. semana anterior) para o usuário entender rapidamente
 * quem está melhorando ou piorando na disputa.
 */
export function CheapestStoresRanking() {
  const fetchRanking = useServerFn(getCheapestStoresRanking);
  const [category, setCategory] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [sort, setSort] = useState<"wins" | "savings" | "ticket">("wins");

  const rankingQ = useQuery({
    queryKey: ["app-cheapest-stores-ranking", "v4", category ?? "all", type ?? "all"],
    queryFn: () => fetchRanking({ data: { category, type } }),
    staleTime: 5 * 60_000,
  });

  const allRows = rankingQ.data?.rows ?? [];
  const sortedRows = [...allRows].sort((a, b) => {
    // Critério primário
    let primary = 0;
    if (sort === "savings") primary = b.avgSavingsPct - a.avgSavingsPct;
    else if (sort === "ticket") {
      const at = a.avgTicketWins || Infinity;
      const bt = b.avgTicketWins || Infinity;
      primary = at - bt;
    } else primary = b.wins - a.wins;
    if (primary !== 0) return primary;
    // Desempates: menor ticket → maior economia → mais vitórias → nome
    const tA = a.avgTicketWins || Infinity;
    const tB = b.avgTicketWins || Infinity;
    if (tA !== tB) return tA - tB;
    if (a.avgSavingsPct !== b.avgSavingsPct) return b.avgSavingsPct - a.avgSavingsPct;
    if (a.wins !== b.wins) return b.wins - a.wins;
    return a.storeName.localeCompare(b.storeName, "pt-BR");
  });
  const rows = sortedRows.slice(0, 6);
  const summary = rankingQ.data?.summary;
  const topWins = rows[0]?.wins ?? 0;


  const categoryOptions = (summary?.availableCategories ?? [])
    .slice(0, 8)
    .map((c) => ({
      value: c.key,
      label: CATEGORY_LABEL[c.key] ?? c.key,
      count: c.count,
    }));

  const typeOptions = (summary?.availableTypes ?? [])
    .slice(0, 10)
    .map((t) => ({
      value: t.key,
      label: PRODUCT_TYPE_LABEL[t.key as keyof typeof PRODUCT_TYPE_LABEL] ?? t.key,
      count: t.count,
    }));



  return (
    <section aria-label="Ranking de mercados mais baratos" className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <SectionKicker eyebrow="Radar de preços" title="Mercados mais baratos" />
          <p className="mt-1 truncate text-[11.5px] text-muted-foreground md:text-xs">
            Últimos 7 dias — cruzamento por categoria, economia média e evolução.
          </p>
        </div>
        {summary && summary.totalProductsCompared > 0 && (
          <Link
            to="/melhores-precos"
            className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary hover:border-primary/40 hover:bg-primary/5"
          >
            Ver todos
          </Link>
        )}
      </div>

      {/* Filtros por categoria */}
      {categoryOptions.length > 1 && (
        <QuickFilterBar
          label="Categoria"
          ariaLabel="Filtrar ranking por categoria"
          options={categoryOptions}
          value={category}
          onChange={(next) => {
            setCategory(next);
            setType(null); // troca de categoria zera o tipo, para evitar combos vazios
          }}
          size="sm"
        />
      )}

      {/* Ordenação — clicar em "Padrão" restaura ordem original por vitórias */}
      <div className="flex items-center gap-2">
        <QuickFilterBar<"wins" | "savings" | "ticket">
          label="Ordenar"
          ariaLabel="Ordenar ranking"
          options={[
            { value: "wins", label: "Padrão · mais vitórias" },
            { value: "savings", label: "Maior economia %" },
            { value: "ticket", label: "Menor ticket médio" },
          ]}
          value={sort}
          onChange={(next) => setSort(next ?? "wins")}
          size="sm"
        />
        {sort !== "wins" && (
          <button
            type="button"
            onClick={() => setSort("wins")}
            className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
            aria-label="Voltar à ordenação padrão"
          >
            Padrão
          </button>
        )}
      </div>




      {/* Filtros por tipo de produto (subcategoria) */}
      {typeOptions.length > 1 && (
        <QuickFilterBar
          label="Tipo"
          ariaLabel="Filtrar ranking por tipo de produto"
          options={typeOptions}
          value={type}
          onChange={(next) => setType(next)}
          size="sm"
        />
      )}


      {/* Summary strip: cruzamento agregado */}
      {summary && summary.totalProductsCompared > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryTile
            icon={Layers}
            label="Produtos comparados"
            value={String(summary.totalProductsCompared)}
            hint={`em ${summary.categoriesCovered} categorias`}
          />
          <SummaryTile
            icon={Store}
            label="Mercados no ranking"
            value={String(summary.totalStores)}
            hint="ativos nesta janela"
          />
          <SummaryTile
            icon={Percent}
            label="Economia média"
            value={`${summary.avgSavingsPct.toFixed(1)}%`}
            hint="menor vs. média dos concorrentes"
          />
          <SummaryTile
            icon={Sparkles}
            label="Janela"
            value={`${summary.windowDays}d`}
            hint={category ? "categoria filtrada" : "atualizado agora"}
          />
        </dl>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        {rankingQ.isLoading ? (
          <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cruzando preços dos últimos 7 dias…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            {category
              ? "Nenhum mercado com disputas suficientes nessa categoria."
              : "Ainda não temos comparações suficientes nesta região. Volte em breve."}
          </p>
        ) : (
          <ol className="divide-y divide-border/60">
            {rows.map((r, idx) => {
              const RankIcon = rankIcon(idx);
              const winRate =
                r.productsCompared > 0
                  ? Math.round((r.wins / r.productsCompared) * 100)
                  : 0;
              const relative = topWins > 0 ? Math.round((r.wins / topWins) * 100) : 0;

              return (
                <li key={r.establishmentId} className="group relative">
                  <Link
                    to="/loja/$id"
                    params={{ id: r.establishmentId }}
                    search={{ q: "", from: "ranking" }}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none md:gap-4 md:px-4 md:py-3"
                    aria-label={`Abrir catálogo de ${r.storeName}. ${r.wins} vitórias em ${r.productsCompared} produtos comparados, tendência ${r.trend}.`}
                  >
                    <div
                      className={cn(
                        "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl ring-1 md:h-11 md:w-11",
                        rankAccent(idx),
                      )}
                      aria-hidden="true"
                    >
                      {r.logoUrl ? (
                        <img
                          src={r.logoUrl}
                          alt=""
                          className="h-full w-full object-contain p-1"
                          loading="lazy"
                        />
                      ) : (
                        <RankIcon className="h-4 w-4" />
                      )}
                      <span className="absolute -bottom-1 -right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full border border-background bg-foreground px-1 text-[11px] font-bold leading-none text-background">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <p className="truncate font-display text-[13.5px] font-semibold md:text-sm">
                          {r.storeName}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {r.city}
                          {r.state ? ` · ${r.state}` : ""}
                        </p>
                        <TrendChip trend={r.trend} deltaPct={r.deltaPct} deltaWins={r.deltaWins} />
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full",
                              idx === 0 ? "bg-amber-500" : "bg-primary",
                            )}
                            style={{ width: `${relative}%` }}
                            aria-hidden="true"
                          />
                        </div>
                        <span className="shrink-0 pc-price text-[11px] text-muted-foreground">
                          {r.wins}/{r.productsCompared}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {r.topCategories.slice(0, 3).map((c) => (
                          <span
                            key={c.category}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                            title={`${c.wins} vitórias em ${c.appearances} disputas`}
                          >
                            {CATEGORY_LABEL[c.category] ?? c.category}
                            <span className="font-bold text-foreground/80">{c.wins}</span>
                          </span>
                        ))}
                        {r.exclusiveProducts > 0 && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-primary"
                            title="Produtos que só este mercado tem cadastrados"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {r.exclusiveProducts} exclusivos
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 text-right">
                      <div
                        className={cn(
                          "rounded-md px-1.5 py-0.5 leading-tight",
                          sort === "wins" && "bg-primary/10 ring-1 ring-primary/30",
                        )}
                        title="Vitórias / Comparações"
                      >
                        <p className="pc-price text-[15px] font-bold text-foreground md:text-lg">
                          {winRate}
                          <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">%</span>
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          vitórias
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-md px-1.5 py-0.5 leading-tight",
                          sort === "savings" && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
                        )}
                        title="Economia média vs. concorrentes"
                      >
                        <p className="pc-price text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {r.avgSavingsPct > 0 ? `−${r.avgSavingsPct.toFixed(1)}%` : "—"}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          economia
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-md px-1.5 py-0.5 leading-tight",
                          sort === "ticket" && "bg-primary/10 ring-1 ring-primary/30",
                        )}
                        title="Ticket médio das vitórias"
                      >
                        <p className="pc-price text-[11px] font-bold text-foreground">
                          {r.avgTicketWins > 0 ? brl(r.avgTicketWins) : "—"}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          ticket médio
                        </p>
                      </div>
                    </div>

                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        {rows.length > 0 && (
          <div className="border-t border-border/60 bg-muted/30 px-4 py-2 text-right md:px-5">
            <Link
              to="/melhores-precos"
              search={{ cat: category ?? undefined }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Ver ranking completo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function TrendChip({
  trend,
  deltaPct,
  deltaWins,
}: {
  trend: "up" | "down" | "flat" | "new";
  deltaPct: number;
  deltaWins: number;
}) {
  if (trend === "flat") return null;
  const isUp = trend === "up" || trend === "new";
  const Icon = trend === "new" ? Sparkles : isUp ? TrendingUp : TrendingDown;
  const tone = isUp
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30"
    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30";
  const label =
    trend === "new"
      ? "novo"
      : `${isUp ? "+" : ""}${deltaWins} vit · ${isUp ? "+" : ""}${deltaPct.toFixed(0)}%`;
  return (
    <span
      className={cn(
        "ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ring-1",
        tone,
      )}
      title={
        trend === "new"
          ? "Entrou no ranking nesta semana"
          : `Comparado à semana anterior (${deltaWins > 0 ? "+" : ""}${deltaWins} vitórias)`
      }
    >
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {label}
    </span>
  );
}

// Mantém uso do ícone Minus pra tree-shaking previsível em edições futuras.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MinusIcon = Minus;

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border/60 bg-card px-2.5 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate pc-price text-[15px] font-bold leading-tight text-foreground">
          {value}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
