import { createFileRoute, Link } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Database, Loader2, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getEstablishmentMetrics,
  rebuildComparisonCache,
  type EstablishmentMetric,
} from "@/lib/comparison-cache.functions";

import { AdminOnly } from "@/components/auth/AdminOnly";

export const Route = createFileRoute("/admin_/metricas")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Métricas por estabelecimento — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <MetricasPage />
    </AdminOnly>
  ),
});


function MetricasPage() {
  const qc = useQueryClient();
  const fetchMetrics = useServerFn(getEstablishmentMetrics);
  const rebuildFn = useServerFn(rebuildComparisonCache);
  const [filter, setFilter] = useState("");

  const metricsQ = useQuery({
    queryKey: ["admin", "establishment-metrics"],
    queryFn: () => fetchMetrics(),
    staleTime: 30_000,
  });

  const rebuild = useMutation({
    mutationFn: () => rebuildFn(),
    onSuccess: (r) => {
      toast.success(
        `Cache reconstruído: ${r.rebuilt} chaves em ${(r.duration_ms / 1000).toFixed(1)}s (${r.cache_rows} linhas)`,
      );
      qc.invalidateQueries({ queryKey: ["admin", "establishment-metrics"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro no rebuild"),
  });

  const rows: EstablishmentMetric[] = metricsQ.data ?? [];
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, filter]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.scans += r.scans_total;
        acc.unique += r.unique_products;
        acc.variants += r.size_variants;
        acc.cache += r.cache_rows;
        if (r.stale) acc.stale += 1;
        return acc;
      },
      { scans: 0, unique: 0, variants: 0, cache: 0, stale: 0 },
    );
  }, [rows]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Voltar ao admin
            </Link>
            <h1 className="text-2xl font-bold">Métricas por estabelecimento</h1>
            <p className="text-sm text-muted-foreground">
              Cadastros, produtos únicos, variações por tamanho e cache de comparação.
            </p>
          </div>
          <Button
            onClick={() => rebuild.mutate()}
            disabled={rebuild.isPending}
            className="gap-2"
          >
            {rebuild.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Reconstruindo cache…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" /> Reconstruir cache global
              </>
            )}
          </Button>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-5">
          <Kpi label="Estabelecimentos" value={rows.length.toString()} />
          <Kpi label="Registros de preço" value={totals.scans.toLocaleString("pt-BR")} />
          <Kpi label="Produtos únicos" value={totals.unique.toLocaleString("pt-BR")} />
          <Kpi label="Variantes (produto+tamanho)" value={totals.variants.toLocaleString("pt-BR")} />
          <Kpi
            label="Caches defasados"
            value={totals.stale.toString()}
            highlight={totals.stale > 0}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" /> Detalhamento
              </CardTitle>
              <CardDescription>Ordenado por volume de cadastros.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {metricsQ.isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
              </div>
            ) : metricsQ.isError ? (
              <div className="py-8 text-center text-destructive">
                Erro ao carregar métricas. {metricsQ.error instanceof Error ? metricsQ.error.message : ""}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead className="text-right">Cadastros</TableHead>
                      <TableHead className="text-right">Únicos</TableHead>
                      <TableHead className="text-right">Variantes</TableHead>
                      <TableHead className="text-right">Cache</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última atualização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.establishment_id}>
                        <TableCell className="font-medium">
                          {r.name}
                          {!r.active && (
                            <Badge variant="outline" className="ml-2">inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.scans_total.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.unique_products.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.size_variants.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.cache_rows.toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          {r.stale ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> defasado
                            </Badge>
                          ) : r.scans_total > 0 ? (
                            <Badge variant="secondary">ok</Badge>
                          ) : (
                            <Badge variant="outline">sem dados</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.last_scan_at ? new Date(r.last_scan_at).toLocaleString("pt-BR") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum estabelecimento encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-destructive" : undefined}>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold tabular-nums ${highlight ? "text-destructive" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
