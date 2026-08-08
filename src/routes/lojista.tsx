import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useMemo, useState } from "react";
import {
  Store,
  BarChart3,
  Tag,
  Package,
  Users,
  Settings,
  TrendingUp,
  Eye,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Pencil,
  History,
  DollarSign,
  Trash2,
  Search,
  Bell,
  BellRing,
  BarChart2,
} from "lucide-react";
import { PriceHistoryDrawer } from "@/components/scans/PriceHistoryDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useLojistaStore,
  getHistory,
  deleteProduct,
  markAlertsRead,
  clearAlerts,
  type Product,
} from "@/lib/lojista-store";
import {
  ProductDialog,
  RegisterPriceDialog,
  HistorySheet,
  AlertRuleDialog,
} from "@/components/lojista/ProductDialogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";


export const Route = createFileRoute("/lojista")({
  head: () => ({
    meta: [
      { title: "Painel do lojista — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Lojista,
});

const sidenav = [
  { icon: BarChart3, label: "Visão geral", tab: "overview" as const },
  { icon: Package, label: "Produtos", tab: "products" as const },
  { icon: Tag, label: "Promoções" },
  { icon: Store, label: "Unidades" },
  { icon: Users, label: "Equipe" },
  { icon: Settings, label: "Configurações" },
];

function Lojista() {
  const [tab, setTab] = useState<"overview" | "products">("overview");

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-border bg-card md:flex md:flex-col">
        <div className="border-b border-border p-5">
          <Logo />
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            Painel do lojista
          </p>
        </div>
        <nav className="flex-1 p-3">
          {sidenav.map((n) => {
            const active = n.tab && tab === n.tab;
            return (
              <button
                key={n.label}
                onClick={() => n.tab && setTab(n.tab)}
                disabled={!n.tab}
                className={
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50")
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1 text-foreground">
            <ShieldCheck className="h-3 w-3 text-savings" /> Verificado
          </p>
          <p className="mt-1">Atacadão Centro · Curitiba</p>
          <Link to="/" className="mt-3 inline-block hover:text-foreground">
            ← voltar ao site
          </Link>
        </div>
      </aside>

      <main className="min-w-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <div className="border-b border-border bg-background px-8 pt-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Atacadão Centro · Curitiba
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <h1 className="font-display text-4xl tracking-tight text-foreground">
                {tab === "overview" ? "Visão geral" : "Produtos"}
              </h1>
            </div>
            <TabsList className="mt-4 bg-transparent p-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Visão geral
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Produtos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-8"><Overview /></TabsContent>
          <TabsContent value="products" className="p-8"><ProductsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ---- Overview (unchanged content, extracted) -----------------------------

function Overview() {
  const { alertEvents } = useLojistaStore();
  const unread = alertEvents.filter((a) => !a.read);

  return (
    <>
      {alertEvents.length > 0 && (
        <div className="mb-6 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={
                  "flex h-9 w-9 items-center justify-center rounded-full " +
                  (unread.length > 0
                    ? "bg-destructive/15 text-destructive"
                    : "bg-muted text-muted-foreground")
                }
              >
                {unread.length > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-display text-lg text-foreground">
                  {unread.length > 0
                    ? `${unread.length} alerta${unread.length > 1 ? "s" : ""} de preço`
                    : "Alertas de preço"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Baseados nas regras que você configurou nos produtos.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {unread.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => markAlertsRead()}>
                  Marcar como lidos
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => clearAlerts()}>
                Limpar
              </Button>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {alertEvents.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className={
                  "flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs " +
                  (a.read ? "bg-background text-muted-foreground" : "bg-muted/40 text-foreground")
                }
              >
                <span>{a.message}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <KPI label="Visualizações do perfil" value="12.4k" delta="+18%" icon={Eye} />
        <KPI label="Cliques em produtos" value="3.2k" delta="+9%" icon={ArrowUpRight} />
        <KPI label="Rota até a mercado" value="847" delta="+22%" icon={Store} />
        <KPI label="Preços atualizados" value="1.129" delta="+4%" icon={TrendingUp} />
      </div>


      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 lg:col-span-2 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between">
            <p className="font-display text-xl text-foreground">Produtos mais buscados</p>
            <button className="text-xs text-muted-foreground hover:text-foreground">
              exportar CSV
            </button>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="pb-2">Produto</th>
                <th className="pb-2">Buscas</th>
                <th className="pb-2">Seu preço</th>
                <th className="pb-2">Vs. média</th>
                <th className="pb-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {[
                { n: "Arroz Tio João 5kg", s: "847", p: "27,90", d: -12, best: true },
                { n: "Café Pilão 500g", s: "612", p: "17,29", d: -8, best: true },
                { n: "Leite Piracanjuba 1L", s: "489", p: "5,49", d: 4, best: false },
                { n: "Óleo Soya 900ml", s: "402", p: "7,20", d: 6, best: false },
                { n: "Feijão Kicaldo 1kg", s: "388", p: "8,90", d: -3, best: true },
              ].map((r) => (
                <tr key={r.n} className="border-b border-border/60 last:border-0">
                  <td className="py-3 text-foreground">{r.n}</td>
                  <td className="py-3 font-mono text-muted-foreground">{r.s}</td>
                  <td className="py-3 font-mono text-foreground">R$ {r.p}</td>
                  <td className="py-3">
                    <span
                      className={
                        "font-mono text-xs " +
                        (r.d < 0 ? "text-savings-foreground" : "text-destructive")
                      }
                    >
                      {r.d > 0 ? "+" : ""}{r.d}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {r.best ? (
                      <span className="rounded-full bg-savings/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-widest text-savings-foreground">
                        Melhor preço
                      </span>
                    ) : (
                      <button className="text-xs text-foreground underline-offset-4 hover:underline">
                        ajustar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Promoção ativa
            </p>
            <p className="mt-2 font-display text-2xl text-foreground">Café Pilão · R$ 15,90</p>
            <p className="mt-1 text-sm text-muted-foreground">
              −22% sobre a média · até 12/07 22h
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-savings/10 px-4 py-3">
              <span className="text-sm text-foreground">Cliques hoje</span>
              <span className="font-mono text-lg font-semibold text-foreground">218</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground">
            <ShieldCheck className="h-5 w-5 text-savings" />
            <p className="mt-3 font-display text-xl">Selo Verificado</p>
            <p className="mt-1 text-sm text-primary-foreground/90">
              Sua mercado atualiza preços regularmente. Continue postando para manter o selo.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ---- Products tab --------------------------------------------------------

function ProductsTab() {
  const { products, prices } = useLojistaStore();
  const [q, setQ] = useState("");

  const [productDialog, setProductDialog] = useState<{ open: boolean; editing: Product | null }>({
    open: false,
    editing: null,
  });
  const [priceDialog, setPriceDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [historySheet, setHistorySheet] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [crossMarket, setCrossMarket] = useState<{ open: boolean; name: string }>({
    open: false,
    name: "",
  });
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);


  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.ean.includes(term) ||
        p.category.toLowerCase().includes(term),
    );
  }, [products, q]);

  const historyForOpen = historySheet.product
    ? getHistory(historySheet.product.id)
    : [];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <KPI label="Produtos cadastrados" value={products.length.toString()} delta="local" icon={Package} />
        <KPI label="Alterações de preço" value={prices.length.toString()} delta="histórico" icon={DollarSign} />
        <KPI
          label="Preço médio"
          value={
            "R$ " +
            (
              products.reduce((s, p) => s + p.currentPrice, 0) /
              Math.max(products.length, 1)
            ).toFixed(2)
          }
          delta="catálogo atual"
          icon={TrendingUp}
        />
      </div>

      <div className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, EAN ou categoria…"
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => setProductDialog({ open: true, editing: null })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">EAN</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Preço atual</th>
                <th className="px-4 py-3">Atualizado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.unit}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.ean}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">
                    R$ {p.currentPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <RowBtn
                        icon={DollarSign}
                        label="Registrar preço"
                        onClick={() => setPriceDialog({ open: true, product: p })}
                        primary
                      />
                      <RowBtn
                        icon={History}
                        label="Histórico"
                        onClick={() => setHistorySheet({ open: true, product: p })}
                      />
                      <RowBtn
                        icon={BarChart2}
                        label="Comparar mercados"
                        onClick={() => setCrossMarket({ open: true, name: p.name })}
                      />
                      <RowBtn
                        icon={Bell}
                        label="Alertas"
                        onClick={() => setAlertDialog({ open: true, product: p })}
                      />

                      <RowBtn
                        icon={Pencil}
                        label="Editar"
                        onClick={() => setProductDialog({ open: true, editing: p })}
                      />
                      <RowBtn
                        icon={Trash2}
                        label="Excluir"
                        onClick={() => setDeleteTarget(p)}
                        destructive
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {q
                      ? "Nenhum produto encontrado para essa busca."
                      : "Cadastre seu primeiro produto para começar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Os dados são salvos localmente no navegador. Serão migrados para o Lovable
        Cloud quando o backend for habilitado.
      </p>

      <ProductDialog
        open={productDialog.open}
        onOpenChange={(v) => setProductDialog((s) => ({ ...s, open: v }))}
        editing={productDialog.editing}
      />
      <RegisterPriceDialog
        open={priceDialog.open}
        onOpenChange={(v) => setPriceDialog((s) => ({ ...s, open: v }))}
        product={priceDialog.product}
      />
      <HistorySheet
        open={historySheet.open}
        onOpenChange={(v) => setHistorySheet((s) => ({ ...s, open: v }))}
        product={historySheet.product}
        history={historyForOpen}
      />
      <PriceHistoryDrawer
        open={crossMarket.open}
        onOpenChange={(v) => setCrossMarket((s) => ({ ...s, open: v }))}
        productName={crossMarket.name}
      />
      <AlertRuleDialog
        open={alertDialog.open}
        onOpenChange={(v) => setAlertDialog((s) => ({ ...s, open: v }))}
        product={alertDialog.product}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove <span className="font-medium text-foreground">{deleteTarget?.name}</span> e todo
              o histórico de preços associado. Ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteProduct(deleteTarget.id);
                toast.success("Produto excluído");
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RowBtn({
  icon: Icon,
  label,
  onClick,
  primary,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs transition-colors " +
        (primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : destructive
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:bg-muted hover:text-foreground")
      }
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function KPI({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const positive = delta.startsWith("+");
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 font-mono text-3xl font-medium text-foreground">{value}</p>
      <p
        className={
          "mt-1 font-mono text-xs " +
          (positive ? "text-savings-foreground" : "text-muted-foreground")
        }
      >
        {delta}
      </p>
    </div>
  );
}
