import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Wallet, TrendingUp, TrendingDown, Target, Plus, Trash2, Pencil,
  ShoppingBasket, Fuel, Flame, Zap, Droplets, Pill, Home as HomeIcon,
  Car, Sparkles, MoreHorizontal, PieChart, Receipt, Tag, Gauge, ShoppingCart,
  Beef, Croissant, Apple, Carrot, UtensilsCrossed,
  CreditCard, Smartphone, Landmark, Ticket,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MedidoresPanel } from "@/components/finance/MedidoresPanel";
import { QuickFoodEntry } from "@/components/finance/QuickFoodEntry";
import { FoodBudgetAlerts } from "@/components/finance/FoodBudgetAlerts";
import { FoodTrendChart } from "@/components/finance/FoodTrendChart";
import { exportFoodReportPDF, exportFoodReportCSV, FOOD_SLUGS } from "@/lib/food-report";
import { FileDown, FileSpreadsheet, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LucideIcon } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePie, Pie, Cell,
} from "recharts";
import { AppShell } from "@/components/brand/AppShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { PanelCard } from "@/components/dashboard/PanelCard";
import { IconTile } from "@/components/ui/icon-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listCategories,
  listTransactions,
  monthlySummary,
  upsertTransaction,
  deleteTransaction,
  updateCategoryBudget,
  type FinanceCategory,
  type FinanceTransaction,
  type PaymentMethod,
  type FinanceMeta,
} from "@/lib/finance.functions";

export const Route = createFileRoute("/financas")({
  head: () => ({
    meta: [
      { title: "Minhas Finanças — PreçoCerto" },
      { name: "description", content: "Gerencie seus gastos mensais, metas por categoria e economize na feira, combustível, gás e contas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinancasPage,
});

const ICONS: Record<string, LucideIcon> = {
  "shopping-basket": ShoppingBasket,
  fuel: Fuel,
  flame: Flame,
  zap: Zap,
  droplets: Droplets,
  pill: Pill,
  home: HomeIcon,
  car: Car,
  sparkles: Sparkles,
  "more-horizontal": MoreHorizontal,
  beef: Beef,
  croissant: Croissant,
  apple: Apple,
  carrot: Carrot,
  utensils: UtensilsCrossed,
};

const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  pix: Smartphone,
  debit: CreditCard,
  credit: CreditCard,
  cash: Wallet,
  transfer: Landmark,
  voucher: Ticket,
  other: MoreHorizontal,
};
const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
  transfer: "Transferência",
  voucher: "Vale",
  other: "Outro",
};
const iconFor = (slug: string | null) => (slug && ICONS[slug]) || Tag;

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
};
const shortDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

function FinancasPage() {
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState("dashboard");
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [showFoodDialog, setShowFoodDialog] = useState(false);

  const qc = useQueryClient();
  const fetchCats = useServerFn(listCategories);
  const fetchTx = useServerFn(listTransactions);
  const fetchSummary = useServerFn(monthlySummary);

  const catsQ = useQuery({ queryKey: ["fin-cats"], queryFn: () => fetchCats() });
  const txQ = useQuery({ queryKey: ["fin-tx", month], queryFn: () => fetchTx({ data: { month } }) });
  const sumQ = useQuery({ queryKey: ["fin-sum", month], queryFn: () => fetchSummary({ data: { month } }) });
  const prevSumQ = useQuery({
    queryKey: ["fin-sum-prev", month],
    queryFn: () => {
      const [y, m] = month.split("-").map(Number);
      const prev = new Date(y, m - 2, 1);
      const iso = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
      return fetchSummary({ data: { month: iso } });
    },
  });

  const prevMonthIso = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const p = new Date(y, m - 2, 1);
    return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-01`;
  }, [month]);
  const prevTxQ = useQuery({
    queryKey: ["fin-tx", prevMonthIso],
    queryFn: () => fetchTx({ data: { month: prevMonthIso } }),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["fin-tx"] });
    qc.invalidateQueries({ queryKey: ["fin-sum"] });
    qc.invalidateQueries({ queryKey: ["fin-sum-prev"] });
    qc.invalidateQueries({ queryKey: ["fin-cats"] });
  };

  const cats = catsQ.data ?? [];
  const tx = txQ.data ?? [];
  const prevTx = prevTxQ.data ?? [];
  const sum = sumQ.data;
  const prev = prevSumQ.data;

  const monthTotal = sum?.total ?? 0;
  const prevTotal = prev?.total ?? 0;
  const deltaAbs = monthTotal - prevTotal;
  const deltaPct = prevTotal > 0 ? (deltaAbs / prevTotal) * 100 : 0;

  const totalBudget = useMemo(
    () => cats.reduce((acc, c) => acc + (c.monthlyBudget ?? 0), 0),
    [cats]
  );
  const budgetUsedPct = totalBudget > 0 ? Math.min(100, (monthTotal / totalBudget) * 100) : 0;
  const budgetRemaining = totalBudget - monthTotal;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-7">
        {/* HEADER compacto com SVG decorativo */}
        <header className="relative mb-5 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card px-4 py-4 md:px-6 md:py-5">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-4 h-32 w-32 opacity-[0.08] text-primary"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1" />
            <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
            <path d="M20 65 Q35 50 50 60 T80 55" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>

          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Painel financeiro
                </p>
                <h1 className="font-display text-xl font-semibold leading-tight tracking-tight md:text-2xl">
                  Minhas Finanças
                </h1>
                <p className="text-xs text-muted-foreground capitalize">{monthLabel(month)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="month"
                value={month.slice(0, 7)}
                onChange={(e) => setMonth(`${e.target.value}-01`)}
                className="h-9 w-36"
                aria-label="Mês de referência"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFoodDialog(true)}
                className="h-9 gap-1.5 border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              >
                <UtensilsCrossed className="h-4 w-4" /> Alimentação
              </Button>
              <Button
                size="sm"
                onClick={() => { setEditingTx(null); setShowTxDialog(true); }}
                className="btn-signal h-9"
              >
                <Plus className="mr-1 h-4 w-4" /> Lançamento
              </Button>
            </div>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-5 flex w-full flex-wrap gap-1 rounded-xl bg-muted/40 p-1 md:w-auto md:inline-flex">
            <TabsTrigger value="dashboard" className="gap-1.5 rounded-lg text-xs md:text-sm"><PieChart className="h-4 w-4" /> Resumo</TabsTrigger>
            <TabsTrigger value="medidores" className="gap-1.5 rounded-lg text-xs md:text-sm"><Gauge className="h-4 w-4" /> Medidores</TabsTrigger>
            <TabsTrigger value="gastos" className="gap-1.5 rounded-lg text-xs md:text-sm"><Receipt className="h-4 w-4" /> Lançamentos</TabsTrigger>
            <TabsTrigger value="categorias" className="gap-1.5 rounded-lg text-xs md:text-sm"><Target className="h-4 w-4" /> Categorias</TabsTrigger>
            <TabsTrigger value="lista" asChild className="gap-1.5 rounded-lg text-xs md:text-sm">
              <Link to="/lista"><ShoppingCart className="h-4 w-4" /> Lista</Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-3">
            <DashboardView
              monthTotal={monthTotal}
              prevTotal={prevTotal}
              deltaAbs={deltaAbs}
              deltaPct={deltaPct}
              totalBudget={totalBudget}
              budgetUsedPct={budgetUsedPct}
              budgetRemaining={budgetRemaining}
              sum={sum}
              prev={prev}
              cats={cats}
              month={month}
              prevMonthIso={prevMonthIso}
              transactions={tx}
              prevTransactions={prevTx}
              onQuickFood={() => setShowFoodDialog(true)}
            />
          </TabsContent>

          <TabsContent value="medidores">
            <MedidoresPanel month={month} categories={cats} />
          </TabsContent>

          <TabsContent value="gastos">
            <TransactionsView
              transactions={tx}
              loading={txQ.isLoading}
              onNew={() => { setEditingTx(null); setShowTxDialog(true); }}
              onEdit={(t) => { setEditingTx(t); setShowTxDialog(true); }}
              onDeleted={invalidateAll}
            />
          </TabsContent>

          <TabsContent value="categorias">
            <CategoriesView cats={cats} summary={sum} onSaved={invalidateAll} />
          </TabsContent>
        </Tabs>
      </div>

      <TransactionDialog
        open={showTxDialog}
        onOpenChange={setShowTxDialog}
        categories={cats}
        editing={editingTx}
        onSaved={() => { setShowTxDialog(false); invalidateAll(); }}
      />

      <QuickFoodEntry
        open={showFoodDialog}
        onOpenChange={setShowFoodDialog}
        categories={cats}
        onSaved={invalidateAll}
      />
    </AppShell>
  );
}

function DashboardView({
  monthTotal, prevTotal, deltaAbs, deltaPct,
  totalBudget, budgetUsedPct, budgetRemaining, sum, prev, cats, onQuickFood,
  month, prevMonthIso, transactions, prevTransactions,
}: {
  monthTotal: number; prevTotal: number; deltaAbs: number; deltaPct: number;
  totalBudget: number; budgetUsedPct: number; budgetRemaining: number;
  sum: Awaited<ReturnType<typeof monthlySummary>> | undefined;
  prev: Awaited<ReturnType<typeof monthlySummary>> | undefined;
  cats: FinanceCategory[];
  onQuickFood: () => void;
  month: string;
  prevMonthIso: string;
  transactions: FinanceTransaction[];
  prevTransactions: FinanceTransaction[];
}) {
  const foodCategoryIds = useMemo(
    () =>
      new Set(
        cats
          .filter((c) => c.slug && (FOOD_SLUGS as readonly string[]).includes(c.slug))
          .map((c) => c.id)
      ),
    [cats]
  );

  const handleExportPDF = () => {
    try {
      exportFoodReportPDF({ month, transactions, foodCategoryIds, prevTotal });
      toast.success("Relatório PDF gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar PDF");
    }
  };
  const handleExportCSV = () => {
    try {
      exportFoodReportCSV({ month, transactions, foodCategoryIds });
      toast.success("Relatório CSV gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar CSV");
    }
  };
  const chartData = useMemo(() => {
    const byDay = new Map((sum?.byDay ?? []).map((d) => [d.day.slice(-2), d.total]));
    const byDayPrev = new Map((prev?.byDay ?? []).map((d) => [d.day.slice(-2), d.total]));
    const days = 31;
    return Array.from({ length: days }, (_, i) => {
      const dd = String(i + 1).padStart(2, "0");
      return { day: dd, atual: byDay.get(dd) ?? 0, anterior: byDayPrev.get(dd) ?? 0 };
    });
  }, [sum, prev]);

  const donutData = (sum?.byCategory ?? []).slice(0, 8).map((c) => ({
    name: c.categoryName,
    value: c.total,
    color: c.color ?? "hsl(var(--primary))",
  }));

  const overBudget = cats
    .filter((c) => c.monthlyBudget && c.monthlyBudget > 0)
    .map((c) => {
      const spent = sum?.byCategory.find((s) => s.categoryId === c.id)?.total ?? 0;
      return { cat: c, spent, pct: (spent / (c.monthlyBudget ?? 1)) * 100 };
    })
    .filter((x) => x.pct >= 80)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const foodTotal = (sum?.byCategory ?? [])
    .filter((c) => c.categorySlug && ["alimentacao", "acougue", "padaria", "hortifruti", "feira"].includes(c.categorySlug))
    .reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-3">
      {/* Quick food CTA */}
      <button
        type="button"
        onClick={onQuickFood}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/12 via-emerald-500/6 to-transparent p-3.5 text-left transition-all hover:border-emerald-500/50 hover:shadow-sm md:p-4"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-64 text-emerald-500 opacity-[0.09]"
          viewBox="0 0 200 80"
          fill="none"
          preserveAspectRatio="xMaxYMid slice"
        >
          <path d="M0 60 Q40 30 80 45 T160 40 T200 30" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="150" cy="42" r="18" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle cx="150" cy="42" r="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" fill="none" />
        </svg>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/40 dark:text-emerald-300">
          <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Registrar gasto com alimentação</span>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              rápido
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cesta do mês, compras do dia (açougue, padaria, feira…) ou lista de itens.
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Este mês</p>
          <p className="font-display text-base font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {BRL(foodTotal)}
          </p>
        </div>
      </button>

      {/* Alertas de orçamento (alimentação) */}
      <FoodBudgetAlerts cats={cats} summary={sum} />

      {/* Tendência mensal (alimentação) + export */}
      <div className="space-y-3">
        <FoodTrendChart
          cats={cats}
          currentTx={transactions}
          previousTx={prevTransactions}
          monthLabel={monthLabel(month)}
          prevMonthLabel={monthLabel(prevMonthIso)}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            Exportar relatório mensal de alimentação:
          </span>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gasto no mês"
          value={BRL(monthTotal)}
          icon={Wallet}
          hint={`${sum?.entries ?? 0} lançamento(s)`}
        />
        <StatCard
          label="Meta mensal"
          value={totalBudget > 0 ? BRL(totalBudget) : "Sem meta"}
          icon={Target}
          iconTone="accent"
          hint={totalBudget > 0 ? `${budgetUsedPct.toFixed(0)}% usado` : "Defina em Categorias"}
        />
        <StatCard
          label="Saldo do orçamento"
          value={BRL(Math.max(0, budgetRemaining))}
          icon={budgetRemaining >= 0 ? TrendingDown : TrendingUp}
          iconTone={budgetRemaining >= 0 ? "primary" : "accent"}
          hint={budgetRemaining < 0 ? `Estouro: ${BRL(Math.abs(budgetRemaining))}` : "Restante"}
        />
        <StatCard
          label="vs mês anterior"
          value={prevTotal > 0 ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%` : "—"}
          icon={deltaAbs >= 0 ? TrendingUp : TrendingDown}
          iconTone={deltaAbs >= 0 ? "accent" : "primary"}
          hint={prevTotal > 0 ? `${deltaAbs >= 0 ? "+" : ""}${BRL(deltaAbs)}` : "Sem histórico"}
          trend={prevTotal > 0 ? {
            value: `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
            direction: deltaAbs > 0 ? "down" : deltaAbs < 0 ? "up" : "neutral",
          } : undefined}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <PanelCard className="lg:col-span-2" title="Evolução diária" description="Gasto por dia vs mês anterior">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="finStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => BRL(Number(v)) as any}
                />
                <Line type="monotone" dataKey="anterior" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Anterior" />
                <Line type="monotone" dataKey="atual" stroke="url(#finStroke)" strokeWidth={2.5} dot={false} name="Atual" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>

        <PanelCard title="Por categoria" description={`${donutData.length} categorias com gasto`}>
          {donutData.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sem lançamentos no mês.</p>
          ) : (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePie>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => BRL(Number(v)) as any} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </RePie>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {donutData.slice(0, 5).map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 truncate">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{BRL(d.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </PanelCard>
      </div>

      {overBudget.length > 0 && (
        <PanelCard title="Alertas de orçamento" description="Categorias que passaram de 80% da meta">
          <ul className="space-y-3">
            {overBudget.map(({ cat, spent, pct }) => (
              <li key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <IconTile icon={iconFor(cat.icon)} size="xs" tone={pct >= 100 ? "accent" : "primary"} />
                    <span className="font-medium">{cat.name}</span>
                  </span>
                  <span className={pct >= 100 ? "font-semibold text-warning-foreground" : "text-muted-foreground"}>
                    {BRL(spent)} / {BRL(cat.monthlyBudget ?? 0)}
                  </span>
                </div>
                <Progress value={Math.min(100, pct)} />
              </li>
            ))}
          </ul>
        </PanelCard>
      )}
    </div>
  );
}

/* ---------------- Lançamentos ---------------- */

function TransactionsView({
  transactions, loading, onNew, onEdit, onDeleted,
}: {
  transactions: FinanceTransaction[];
  loading: boolean;
  onNew: () => void;
  onEdit: (t: FinanceTransaction) => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteTransaction);
  const [pendingDelete, setPendingDelete] = useState<FinanceTransaction | null>(null);

  const total = useMemo(
    () => transactions.reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    // Optimistic update: remove from the current cache so totals refresh instantly
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["fin-tx"] });
      const snapshots = qc.getQueriesData<FinanceTransaction[]>({ queryKey: ["fin-tx"] });
      for (const [key, list] of snapshots) {
        if (!list) continue;
        qc.setQueryData<FinanceTransaction[]>(key, list.filter((t) => t.id !== id));
      }
      return { snapshots };
    },
    onError: (e: Error, _id, ctx) => {
      if (ctx?.snapshots) {
        for (const [key, list] of ctx.snapshots) qc.setQueryData(key, list);
      }
      toast.error(e.message);
    },
    onSuccess: () => { toast.success("Lançamento removido"); onDeleted(); },
  });

  return (
    <>
      <PanelCard
        title="Lançamentos do mês"
        description={`${transactions.length} registro(s) · Total ${BRL(total)}`}
        actions={<Button size="sm" onClick={onNew} className="btn-signal"><Plus className="mr-1 h-4 w-4" /> Novo</Button>}
      >
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-2">Data</th>
                  <th className="py-2 pr-2">Categoria</th>
                  <th className="py-2 pr-2">Descrição</th>
                  <th className="py-2 pr-2">Local</th>
                  <th className="py-2 pr-2 text-right">Valor</th>
                  <th className="py-2 pr-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 pr-2 tabular-nums text-muted-foreground">{shortDay(t.occurredOn)}</td>
                    <td className="py-2 pr-2">
                      {t.categoryName ? (
                        <Badge variant="outline" style={{ borderColor: t.categoryColor ?? undefined }}>
                          {t.categoryName}
                        </Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-2">{t.description || <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{t.establishmentName ?? "—"}</td>
                    <td className="py-2 pr-2 text-right font-semibold tabular-nums">{BRL(t.amount)}</td>
                    <td className="py-2 pr-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(t)}
                          aria-label={`Editar lançamento ${t.description || BRL(t.amount)}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setPendingDelete(t)}
                          disabled={del.isPending}
                          aria-label={`Excluir lançamento ${t.description || BRL(t.amount)}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={4} className="py-2 pr-2 text-right text-xs uppercase tracking-wider text-muted-foreground">
                    Total
                  </td>
                  <td className="py-2 pr-2 text-right font-display text-base font-semibold tabular-nums">{BRL(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </PanelCard>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => { if (!v) setPendingDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Excluir lançamento?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Esta ação não pode ser desfeita.</p>
                {pendingDelete && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-foreground">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {shortDay(pendingDelete.occurredOn)} · {pendingDelete.categoryName ?? "Sem categoria"}
                    </p>
                    <p className="font-medium">{pendingDelete.description || "(sem descrição)"}</p>
                    <p className="font-display text-lg font-semibold tabular-nums">
                      {BRL(pendingDelete.amount)}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={del.isPending}
              onClick={() => {
                if (pendingDelete) {
                  del.mutate(pendingDelete.id);
                  setPendingDelete(null);
                }
              }}
            >
              {del.isPending ? "Removendo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------------- Categorias ---------------- */

function CategoriesView({
  cats, summary, onSaved,
}: {
  cats: FinanceCategory[];
  summary: Awaited<ReturnType<typeof monthlySummary>> | undefined;
  onSaved: () => void;
}) {
  const updFn = useServerFn(updateCategoryBudget);
  const upd = useMutation({
    mutationFn: (v: { id: string; monthlyBudget: number | null }) => updFn({ data: v }),
    onSuccess: () => { toast.success("Meta atualizada"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PanelCard title="Metas por categoria" description="Defina quanto pretende gastar em cada categoria no mês">
      <ul className="space-y-4">
        {cats.map((c) => {
          const spent = summary?.byCategory.find((s) => s.categoryId === c.id)?.total ?? 0;
          const budget = c.monthlyBudget ?? 0;
          const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
          return (
            <li key={c.id} className="space-y-2 rounded-xl border bg-card/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <IconTile icon={iconFor(c.icon)} size="sm" tone="primary" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {BRL(spent)} gasto{budget > 0 && ` / ${BRL(budget)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`b-${c.id}`} className="text-xs text-muted-foreground">Meta</Label>
                  <Input
                    id={`b-${c.id}`}
                    type="number"
                    step="10"
                    min="0"
                    defaultValue={c.monthlyBudget ?? ""}
                    placeholder="0,00"
                    className="w-32"
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v !== c.monthlyBudget) upd.mutate({ id: c.id, monthlyBudget: v });
                    }}
                  />
                </div>
              </div>
              {budget > 0 && <Progress value={pct} />}
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}

/* ---------------- Dialog de lançamento ---------------- */

function TransactionDialog({
  open, onOpenChange, categories, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: FinanceCategory[];
  editing: FinanceTransaction | null;
  onSaved: () => void;
}) {
  const saveFn = useServerFn(upsertTransaction);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [occurredOn, setOccurredOn] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [meta, setMeta] = useState<FinanceMeta>({});

  const currentCat = categories.find((c) => c.id === categoryId);

  // Reset form when opening
  useMemo(() => {
    if (!open) return;
    if (editing) {
      setAmount(String(editing.amount));
      setCategoryId(editing.categoryId ?? "");
      setOccurredOn(editing.occurredOn);
      setDescription(editing.description ?? "");
      setPaymentMethod(editing.paymentMethod ?? "");
      setMeta((editing.metadata as FinanceMeta) ?? {});
    } else {
      setAmount("");
      setCategoryId(categories[0]?.id ?? "");
      setOccurredOn(todayISO());
      setDescription("");
      setPaymentMethod("");
      setMeta({});
    }
  }, [open, editing, categories]);

  const save = useMutation({
    mutationFn: () => saveFn({
      data: {
        id: editing?.id,
        categoryId: categoryId || null,
        occurredOn,
        amount: Number(amount),
        description: description || null,
        paymentMethod: paymentMethod || null,
        metadata: meta,
      },
    }),
    onSuccess: () => { toast.success(editing ? "Lançamento atualizado" : "Lançamento adicionado"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isFuel = currentCat?.kind === "fuel";
  const isGas = currentCat?.kind === "gas";
  const isUtility = currentCat?.kind === "utility";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Compra do mês, etc." />
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod || undefined} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="voucher">Vale</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isFuel && (
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="col-span-3 text-xs font-medium text-muted-foreground">Combustível</div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={(meta.type as string) || ""} onValueChange={(v) => setMeta({ ...meta, type: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gnv">GNV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Litros</Label>
                <Input className="h-9" type="number" step="0.01" value={(meta.liters as number) ?? ""} onChange={(e) => setMeta({ ...meta, liters: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label className="text-xs">Km atual</Label>
                <Input className="h-9" type="number" value={(meta.odometer as number) ?? ""} onChange={(e) => setMeta({ ...meta, odometer: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
          )}

          {isGas && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="col-span-2 text-xs font-medium text-muted-foreground">Botijão de gás</div>
              <div>
                <Label className="text-xs">Peso</Label>
                <Select value={(meta.weight as string) || ""} onValueChange={(v) => setMeta({ ...meta, weight: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="13kg">13 kg</SelectItem>
                    <SelectItem value="20kg">20 kg</SelectItem>
                    <SelectItem value="45kg">45 kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fornecedor</Label>
                <Input className="h-9" value={(meta.supplier as string) ?? ""} onChange={(e) => setMeta({ ...meta, supplier: e.target.value })} />
              </div>
            </div>
          )}

          {isUtility && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="col-span-2 text-xs font-medium text-muted-foreground">Consumo</div>
              <div>
                <Label className="text-xs">Consumo (kWh/m³)</Label>
                <Input className="h-9" type="number" step="0.01" value={(meta.consumption as number) ?? ""} onChange={(e) => setMeta({ ...meta, consumption: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label className="text-xs">Mês de referência</Label>
                <Input className="h-9" type="month" value={(meta.reference as string) ?? ""} onChange={(e) => setMeta({ ...meta, reference: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!amount || Number(amount) < 0 || save.isPending}
            className="btn-signal"
          >
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
