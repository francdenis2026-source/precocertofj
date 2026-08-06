import { PRODUCT_CATEGORIES } from "@/lib/product-category";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatShortDate } from "@/components/product/TrustIndicator";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, Download, Loader2, MapPin, RefreshCw, Search, Store, PackageX, PackageCheck } from "lucide-react";
import { getCoverageOverview, getMissingProducts, getPresentProducts, type EstablishmentCoverage } from "@/lib/coverage.functions";
import { CoverageDiagnosticsPanel, CoverageErrorBanner } from "@/components/admin/CoverageDiagnosticsPanel";
import { RefreshBar as SharedRefreshBar } from "@/components/admin/RefreshBar";
import { useWindowFocusRefresh } from "@/hooks/useWindowFocusRefresh";
import { Price } from "@/components/ds/Price";

function formatQueryStatus(query: { isFetching: boolean; error: unknown; dataUpdatedAt: number; errorUpdatedAt: number }) {
  if (query.isFetching) return { label: "Consultando…", tone: "muted" as const };
  const ts = query.error ? query.errorUpdatedAt : query.dataUpdatedAt;
  if (!ts) return { label: "Sem consulta ainda", tone: "muted" as const };
  const rel = new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (query.error) return { label: `Falha às ${rel}`, tone: "error" as const };
  return { label: `Atualizado às ${rel}`, tone: "ok" as const };
}

export const Route = createFileRoute("/admin_/cobertura")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Cobertura por estabelecimento — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <CoveragePage />
    </AdminOnly>
  ),
});

const CATEGORIES = ["todos", ...PRODUCT_CATEGORIES];

function CoveragePage() {
  const overviewFn = useServerFn(getCoverageOverview);
  const missingFn = useServerFn(getMissingProducts);
  const presentFn = useServerFn(getPresentProducts);

  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [tab, setTab] = useState<"faltando" | "cadastrados">("faltando");

  const overview = useQuery({
    queryKey: ["coverage-overview"],
    queryFn: () => overviewFn(),
  });

  const rows = overview.data ?? [];
  const selectedRow = useMemo(() => rows.find((r) => r.establishment_id === selected), [rows, selected]);

  const missing = useQuery({
    enabled: !!selected && tab === "faltando",
    queryKey: ["coverage-missing", selected, search, category],
    queryFn: () =>
      missingFn({
        data: {
          establishmentId: selected!,
          search: search.trim() || undefined,
          category: category === "todos" ? undefined : category,
          limit: 800,
        },
      }),
  });

  const present = useQuery({
    enabled: !!selected && tab === "cadastrados",
    queryKey: ["coverage-present", selected, search, category],
    queryFn: () =>
      presentFn({
        data: {
          establishmentId: selected!,
          search: search.trim() || undefined,
          category: category === "todos" ? undefined : category,
          limit: 800,
        },
      }),
  });

  const exportCsv = () => {
    const data = tab === "faltando" ? missing.data : present.data;
    if (!data || data.length === 0) return;
    const header =
      tab === "faltando"
        ? ["produto", "categoria", "lojas_com_ele", "preco_min", "preco_medio", "preco_max"]
        : ["produto", "categoria", "preco_local", "preco_min_mercado", "preco_medio_mercado", "ultima_vez"];
    const lines = [header.join(";")];
    for (const r of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = r;
      if (tab === "faltando") {
        lines.push([r.display_name, r.category ?? "", row.stores_count, row.min_price ?? "", row.avg_price ?? "", row.max_price ?? ""].join(";"));
      } else {
        lines.push([r.display_name, r.category ?? "", row.local_price ?? "", row.min_price ?? "", row.avg_price ?? "", row.last_seen_at ?? ""].join(";"));
      }
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cobertura-${selectedRow?.name ?? "estabelecimento"}-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Painel · Catálogo"
        title="Onde falta cadastrar?"
        description="Veja quais produtos já estão cadastrados em cada estabelecimento e quais ainda faltam, comparando com o catálogo total da plataforma."
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Cobertura" }]}
        icon={<MapPin className="h-5 w-5" />}
        editorial
        goldRule
      />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <CoverageDiagnosticsPanel />
        </div>

        <CoverageAutoFocusRefresh onRefresh={() => overview.refetch()} />
        <SharedRefreshBar
          scope="coverage"
          label="Ranking de cobertura"
          rpc="get_coverage_overview"
          status={formatQueryStatus(overview)}
          disabled={overview.isFetching}
          onRefresh={() => overview.refetch()}
          trailing={<AutoFocusToggle scope="coverage" />}
        />

        {overview.isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : overview.error ? (
          <div className="mt-4"><CoverageErrorBanner error={overview.error} onRetry={() => overview.refetch()} /></div>
        ) : (
          <div className="mt-4">
            <OverviewTable rows={rows} onSelect={(id) => { setSelected(id); setSearch(""); setCategory("todos"); }} selected={selected} />
          </div>
        )}

        {selected && selectedRow && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-serif text-2xl flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    {selectedRow.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedRow.produtos} produtos cadastrados · {selectedRow.faltando} faltando ({selectedRow.cobertura_pct}% de cobertura)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="mr-2 h-4 w-4" />Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={tab} onValueChange={(v) => setTab(v as "faltando" | "cadastrados")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="faltando"><PackageX className="mr-2 h-4 w-4" />Faltando ({selectedRow.faltando})</TabsTrigger>
                  <TabsTrigger value="cadastrados"><PackageCheck className="mr-2 h-4 w-4" />Cadastrados ({selectedRow.produtos})</TabsTrigger>
                </TabsList>

                <div className="mb-4 flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar produto…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c === "todos" ? "Todas as categorias" : c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <TabsContent value="faltando">
                  <SharedRefreshBar
                    scope={`coverage-missing-${selected ?? "none"}`}
                    label="Produtos faltantes"
                    rpc="get_missing_products_for_establishment"
                    status={formatQueryStatus(missing)}
                    disabled={missing.isFetching || !selected}
                    onRefresh={() => missing.refetch()}
                    compact
                  />
                  <div className="mt-3">
                    {missing.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos faltantes…</div>
                    ) : missing.error ? (
                      <CoverageErrorBanner error={missing.error} onRetry={() => missing.refetch()} />
                    ) : (
                      <MissingTable rows={missing.data ?? []} />
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="cadastrados">
                  <SharedRefreshBar
                    scope={`coverage-present-${selected ?? "none"}`}
                    label="Produtos cadastrados"
                    rpc="get_present_products_for_establishment"
                    status={formatQueryStatus(present)}
                    disabled={present.isFetching || !selected}
                    onRefresh={() => present.refetch()}
                    compact
                  />

                  <div className="mt-3">
                    {present.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos cadastrados…</div>
                    ) : present.error ? (
                      <CoverageErrorBanner error={present.error} onRetry={() => present.refetch()} />
                    ) : (
                      <PresentTable rows={present.data ?? []} />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </section>
    </AppShell>
  );
}

const AUTO_KEY = "pc:refresh:auto:coverage";

function readAuto(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTO_KEY) === "1";
  } catch {
    return false;
  }
}

function CoverageAutoFocusRefresh({ onRefresh }: { onRefresh: () => void | Promise<unknown> }) {
  const [enabled, setEnabled] = useState<boolean>(readAuto);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setEnabled(readAuto());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  useWindowFocusRefresh({ enabled, onRefresh });
  return null;
}

function AutoFocusToggle({ scope: _scope }: { scope: string }) {
  const [enabled, setEnabled] = useState<boolean>(readAuto);
  const toggle = useCallback((next: boolean) => {
    setEnabled(next);
    try {
      window.localStorage.setItem(AUTO_KEY, next ? "1" : "0");
      window.dispatchEvent(new StorageEvent("storage", { key: AUTO_KEY }));
    } catch {
      /* ignora modo privado */
    }
  }, []);
  return (
    <div className="flex items-center gap-1.5">
      <Switch
        id="coverage-auto-focus"
        checked={enabled}
        onCheckedChange={toggle}
        aria-label="Auto-atualizar ao focar a janela"
      />
      <Label
        htmlFor="coverage-auto-focus"
        className="cursor-pointer text-[12.5px] font-normal text-muted-foreground"
      >
        Auto ao focar
      </Label>
    </div>
  );
}

/**
 * @deprecated Preferir {@link SharedRefreshBar} de `@/components/admin/RefreshBar`.
 * Mantido apenas para compat interna caso ainda haja consumidores.
 */
export function RefreshBar({
  status,
  onRefresh,
  disabled,
  label,
  compact,
}: {
  status: { label: string; tone: "muted" | "ok" | "error" };
  onRefresh: () => void;
  disabled?: boolean;
  label: string;
  compact?: boolean;
}) {
  const dotClass =
    status.tone === "ok"
      ? "bg-emerald-500"
      : status.tone === "error"
        ? "bg-destructive"
        : "bg-muted-foreground/40";
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 ${compact ? "py-1.5" : "py-2"}`}
      role="status"
      aria-live="polite"
      data-testid="coverage-refresh-bar-legacy"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        <span className="font-medium text-foreground/80">{label}</span>
        <span>· {status.label}</span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRefresh}
        disabled={disabled}
        aria-label={`Atualizar ${label}`}
      >
        {disabled ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        Atualizar
      </Button>
    </div>

  );
}


function OverviewTable({
  rows,
  onSelect,
  selected,
}: {
  rows: EstablishmentCoverage[];
  onSelect: (id: string) => void;
  selected: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-xl">Ranking de cobertura</CardTitle>
        <CardDescription>Clique em uma estabelecimento para ver o que está faltando cadastrar.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estabelecimento</TableHead>
              <TableHead className="text-right">Cadastrados</TableHead>
              <TableHead className="text-right">Faltando</TableHead>
              <TableHead className="w-[240px]">Cobertura</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const isSelected = r.establishment_id === selected;
              return (
                <TableRow
                  key={r.establishment_id}
                  className={`cursor-pointer ${isSelected ? "bg-accent/50" : ""}`}
                  onClick={() => onSelect(r.establishment_id)}
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.produtos}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant={r.faltando > 500 ? "destructive" : "secondary"}>{r.faltando}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Number(r.cobertura_pct)} className="h-2" />
                      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{r.cobertura_pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button asChild size="sm" variant="outline">
                      {/* @ts-ignore */}
                      <Link to="/admin/cobertura/$id" params={{ id: r.establishment_id }}>
                        Ver detalhes
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MissingTable({ rows }: { rows: Array<{ product_key: string; display_name: string; category: string | null; stores_count: number; min_price: number | null; avg_price: number | null; max_price: number | null }> }) {
  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nada faltando com esses filtros. 🎉</div>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Estabelecimentos com ele</TableHead>
            <TableHead className="text-right">Menor</TableHead>
            <TableHead className="text-right">Médio</TableHead>
            <TableHead className="text-right">Maior</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.product_key}>
              <TableCell className="font-medium">{r.display_name}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{r.category ?? "—"}</Badge></TableCell>
              <TableCell className="text-right tabular-nums">{r.stores_count}</TableCell>
              <TableCell className="text-right">
                <Price value={r.min_price} size="sm" tone="best" className="justify-end" />
              </TableCell>
              <TableCell className="text-right">
                <Price value={r.avg_price} size="sm" className="justify-end" />
              </TableCell>
              <TableCell className="text-right">
                <Price value={r.max_price} size="sm" tone="muted" className="justify-end" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PresentTable({ rows }: { rows: Array<{ product_key: string; display_name: string; category: string | null; local_price: number | null; min_price: number | null; avg_price: number | null; last_seen_at: string | null }> }) {
  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum produto cadastrado com esses filtros.</div>;
  }
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
                <TableCell><Badge variant="outline" className="text-xs">{r.category ?? "—"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Price value={local} size="sm" className="justify-end" />
                  {diff != null && Math.abs(diff) > 0.5 && (
                    <span className={`ml-2 text-xs ${diff > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Price value={min} size="sm" tone="best" className="justify-end" />
                </TableCell>
                <TableCell className="text-right">
                  <Price value={r.avg_price} size="sm" className="justify-end" />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatShortDate(r.last_seen_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
