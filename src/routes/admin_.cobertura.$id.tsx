import { createFileRoute, Link } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/brand/AppShell";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  Store,
} from "lucide-react";
import {
  getCoverageOverview,
  getMissingProducts,
  getPresentProducts,
} from "@/lib/coverage.functions";
import { bulkInsertScans } from "@/lib/bulk-insert.functions";

export const Route = createFileRoute("/admin_/cobertura/$id")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Detalhe de cobertura — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <StoreCoverageDetail />
    </AdminOnly>
  ),
});

const CATEGORIES = [
  "todos",
  "laticinios",
  "carnes",
  "padaria",
  "biscoitos",
  "doces",
  "bebidas",
  "bebidas_em_po",
  "limpeza",
  "higiene",
  "mercearia",
  "congelados",
  "outros",
];

const PAGE_SIZE = 20;

type MissingRow = {
  product_key: string;
  display_name: string;
  category: string | null;
  stores_count: number;
  min_price: number | null;
  avg_price: number | null;
  max_price: number | null;
};

type PresentRow = MissingRow & { local_price: number | null; last_seen_at: string | null };

function brl(v: number | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StoreCoverageDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const overviewFn = useServerFn(getCoverageOverview);
  const missingFn = useServerFn(getMissingProducts);
  const presentFn = useServerFn(getPresentProducts);
  const insertFn = useServerFn(bulkInsertScans);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [tab, setTab] = useState<"faltando" | "cadastrados">("faltando");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<MissingRow | null>(null);

  const overview = useQuery({
    queryKey: ["coverage-overview"],
    queryFn: () => overviewFn(),
    staleTime: 60_000,
  });

  const store = useMemo(
    () => (overview.data ?? []).find((r) => r.establishment_id === id) ?? null,
    [overview.data, id],
  );

  const missing = useQuery({
    enabled: tab === "faltando",
    queryKey: ["coverage-missing", id, search, category],
    queryFn: () =>
      missingFn({
        data: {
          establishmentId: id,
          search: search.trim() || undefined,
          category: category === "todos" ? undefined : category,
          limit: 2000,
        },
      }),
  });

  const present = useQuery({
    enabled: tab === "cadastrados",
    queryKey: ["coverage-present", id, search, category],
    queryFn: () =>
      presentFn({
        data: {
          establishmentId: id,
          search: search.trim() || undefined,
          category: category === "todos" ? undefined : category,
          limit: 2000,
        },
      }),
  });

  // Reset page on filter change
  const onSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onCategoryChange = (v: string) => {
    setCategory(v);
    setPage(1);
  };
  const onTabChange = (v: string) => {
    setTab(v as "faltando" | "cadastrados");
    setPage(1);
  };

  const rows = (tab === "faltando" ? missing.data : present.data) ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const insertMut = useMutation({
    mutationFn: (args: {
      product_name: string;
      price: number;
      quantity: number | null;
      unit: string | null;
    }) =>
      insertFn({
        data: {
          establishmentId: id,
          items: [
            {
              product_name: args.product_name,
              price: args.price,
              quantity: args.quantity,
              unit: args.unit,
              brand: null,
            },
          ],
        },
      }),
    onSuccess: (res) => {
      if (res.errors && res.errors.length > 0) {
        toast.error(`Cadastro falhou: ${res.errors[0]}`);
        return;
      }
      toast.success(`Produto cadastrado na estabelecimento${res.cacheRebuilt ? ` · cache atualizado` : ""}.`);
      setTarget(null);
      qc.invalidateQueries({ queryKey: ["coverage-overview"] });
      qc.invalidateQueries({ queryKey: ["coverage-missing", id] });
      qc.invalidateQueries({ queryKey: ["coverage-present", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha no cadastro"),
  });

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header =
      tab === "faltando"
        ? ["produto", "categoria", "lojas_com_ele", "preco_min", "preco_medio", "preco_max"]
        : ["produto", "categoria", "preco_local", "preco_min_mercado", "preco_medio_mercado", "ultima_vez"];
    const lines = [header.join(";")];
    for (const r of rows as (MissingRow & Partial<PresentRow>)[]) {
      if (tab === "faltando") {
        lines.push(
          [r.display_name, r.category ?? "", r.stores_count, r.min_price ?? "", r.avg_price ?? "", r.max_price ?? ""].join(";"),
        );
      } else {
        lines.push(
          [r.display_name, r.category ?? "", r.local_price ?? "", r.min_price ?? "", r.avg_price ?? "", r.last_seen_at ?? ""].join(";"),
        );
      }
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cobertura-${store?.name ?? "estabelecimento"}-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = tab === "faltando" ? missing.isLoading : present.isLoading;

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin_/cobertura"><ArrowLeft className="mr-2 h-4 w-4" />Voltar à cobertura</Link>
          </Button>
        </div>

        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Detalhe da estabelecimento</p>
          <h1 className="mt-1 flex items-center gap-3 font-serif text-4xl">
            <Store className="h-8 w-8 text-muted-foreground" aria-hidden />
            {store?.name ?? (overview.isLoading ? "Carregando…" : "Estabelecimento não encontrada")}
          </h1>
          {store && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <StatCard label="Cadastrados" value={store.produtos} tone="ok" />
              <StatCard label="Faltando" value={store.faltando} tone={store.faltando > 500 ? "warn" : "muted"} />
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">Cobertura</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{store.cobertura_pct}%</span>
                </div>
                <Progress value={Number(store.cobertura_pct)} className="mt-2 h-2" />
              </div>
            </div>
          )}
        </header>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-2xl">Produtos</CardTitle>
                <CardDescription>
                  Pesquise, pagine e cadastre em lote. O botão “Cadastrar na estabelecimento” abre um formulário rápido com preço, quantidade e unidade.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
                <Download className="mr-2 h-4 w-4" />Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={onTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="faltando">
                  <PackageX className="mr-2 h-4 w-4" />
                  Faltando {store ? `(${store.faltando})` : ""}
                </TabsTrigger>
                <TabsTrigger value="cadastrados">
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Cadastrados {store ? `(${store.produtos})` : ""}
                </TabsTrigger>
              </TabsList>

              <div className="mb-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar produto pelo nome…"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    aria-label="Buscar produto"
                  />
                </div>
                <Select value={category} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-[220px]" aria-label="Filtrar por categoria">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "todos" ? "Todas as categorias" : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="faltando" className="mt-0">
                {isLoading ? (
                  <LoadingState label="Carregando produtos faltantes…" />
                ) : rows.length === 0 ? (
                  <EmptyState label="Nada faltando com esses filtros. 🎉" />
                ) : (
                  <MissingTable
                    rows={pageRows as MissingRow[]}
                    onRegister={(r) => setTarget(r)}
                  />
                )}
              </TabsContent>
              <TabsContent value="cadastrados" className="mt-0">
                {isLoading ? (
                  <LoadingState label="Carregando produtos cadastrados…" />
                ) : rows.length === 0 ? (
                  <EmptyState label="Nenhum produto cadastrado com esses filtros." />
                ) : (
                  <PresentTable rows={pageRows as PresentRow[]} />
                )}
              </TabsContent>

              {rows.length > 0 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  total={rows.length}
                  onPage={setPage}
                />
              )}
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <RegisterDialog
        row={target}
        storeName={store?.name}
        onClose={() => setTarget(null)}
        onSubmit={(payload) => insertMut.mutate(payload)}
        submitting={insertMut.isPending}
      />
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "muted" }) {
  const toneCls =
    tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function MissingTable({
  rows,
  onRegister,
}: {
  rows: MissingRow[];
  onRegister: (r: MissingRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Estabelecimentos</TableHead>
            <TableHead className="text-right">Menor</TableHead>
            <TableHead className="text-right">Médio</TableHead>
            <TableHead className="text-right">Maior</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.product_key}>
              <TableCell className="font-medium">{r.display_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{r.category ?? "—"}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.stores_count}</TableCell>
              <TableCell className="text-right tabular-nums">{brl(r.min_price)}</TableCell>
              <TableCell className="text-right tabular-nums">{brl(r.avg_price)}</TableCell>
              <TableCell className="text-right tabular-nums">{brl(r.max_price)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => onRegister(r)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Cadastrar na estabelecimento
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PresentTable({ rows }: { rows: PresentRow[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Preço na estabelecimento</TableHead>
            <TableHead className="text-right">Menor no mercado</TableHead>
            <TableHead className="text-right">Média mercado</TableHead>
            <TableHead>Última coleta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const local = r.local_price;
            const min = r.min_price;
            const diff = local != null && min != null && min > 0 ? ((local - min) / min) * 100 : null;
            return (
              <TableRow key={r.product_key}>
                <TableCell className="font-medium">{r.display_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{r.category ?? "—"}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {brl(local)}
                  {diff != null && Math.abs(diff) > 0.5 && (
                    <span className={`ml-2 text-xs ${diff > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{brl(min)}</TableCell>
                <TableCell className="text-right tabular-nums">{brl(r.avg_price)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
      <p className="text-muted-foreground">
        Exibindo <span className="font-medium text-foreground">{from}–{to}</span> de{" "}
        <span className="font-medium text-foreground">{total.toLocaleString("pt-BR")}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RegisterDialog({
  row,
  storeName,
  onClose,
  onSubmit,
  submitting,
}: {
  row: MissingRow | null;
  storeName: string | undefined;
  onClose: () => void;
  onSubmit: (payload: {
    product_name: string;
    price: number;
    quantity: number | null;
    unit: string | null;
  }) => void;
  submitting: boolean;
}) {
  const [priceStr, setPriceStr] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [unit, setUnit] = useState<string>("un");

  // Reset local state when the target changes
  useMemo(() => {
    setPriceStr("");
    setQtyStr("");
    setUnit("un");
  }, [row?.product_key]);

  const open = !!row;
  const price = Number(priceStr.replace(",", "."));
  const qty = qtyStr ? Number(qtyStr.replace(",", ".")) : null;
  const priceValid = Number.isFinite(price) && price > 0 && price < 100000;

  const submit = () => {
    if (!row || !priceValid) return;
    onSubmit({
      product_name: row.display_name,
      price,
      quantity: qty && Number.isFinite(qty) && qty > 0 ? qty : null,
      unit: unit || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar na estabelecimento</DialogTitle>
          <DialogDescription>
            {storeName ? <>Novo preço em <span className="font-medium">{storeName}</span>.</> : "Novo preço na estabelecimento."}
            {row && (
              <div className="mt-2 rounded-md border bg-muted/40 p-2 text-xs text-foreground">
                <span className="font-medium">{row.display_name}</span>
                <span className="ml-2 text-muted-foreground">
                  · sugestão: {brl(row.avg_price)} (mín {brl(row.min_price)})
                </span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="reg-price">Preço (R$)</Label>
            <Input
              id="reg-price"
              inputMode="decimal"
              placeholder="Ex.: 6,99"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="reg-qty">Quantidade</Label>
              <Input
                id="reg-qty"
                inputMode="decimal"
                placeholder="Ex.: 500"
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reg-unit">Unidade</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="reg-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">un</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="l">L</SelectItem>
                  <SelectItem value="pct">pct</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!priceValid || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
