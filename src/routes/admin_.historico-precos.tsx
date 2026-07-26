import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listPriceHistory,
  getProductHistory,
  type PriceHistoryRow,
} from "@/lib/price-history-admin.functions";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Sparkline } from "@/components/charts/Sparkline";
import { ArrowLeft, ArrowDown, ArrowUp, Loader2, Search, Minus } from "lucide-react";

export const Route = createFileRoute("/admin_/historico-precos")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Histórico de preços — Admin" },
      {
        name: "description",
        content: "Timeline de variações de preço por produto e estabelecimento.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Gate,
});

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function Gate() {
  const { user, loading, isAdmin } = useMyRoles();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sem permissão</CardTitle>
            <CardDescription>Página exclusiva para administradores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/admin">Voltar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <Page />;
}

function Page() {
  const listFn = useServerFn(listPriceHistory);
  const seriesFn = useServerFn(getProductHistory);

  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [onlyChanges, setOnlyChanges] = useState<boolean>(true);
  const [openRow, setOpenRow] = useState<PriceHistoryRow | null>(null);

  const { data: establishments } = useQuery({
    queryKey: ["establishments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = useQuery({
    queryKey: ["price-history", establishmentId, search, onlyChanges],
    queryFn: () =>
      listFn({
        data: {
          establishmentId: establishmentId || null,
          productSearch: search.trim() ? search.trim() : null,
          onlyChanges,
          limit: 300,
        },
      }),
  });

  const series = useQuery({
    queryKey: ["price-history-series", openRow?.establishmentId, openRow?.productKey],
    queryFn: () =>
      seriesFn({
        data: {
          establishmentId: openRow!.establishmentId,
          productKey: openRow!.productKey,
        },
      }),
    enabled: !!openRow,
  });

  const rows = list.data ?? [];
  const stats = useMemo(() => {
    const drops = rows.filter((r) => (r.changePct ?? 0) < 0).length;
    const ups = rows.filter((r) => (r.changePct ?? 0) > 0).length;
    return { total: rows.length, drops, ups };
  }, [rows]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Histórico de preços</h1>
            <p className="text-sm text-muted-foreground">
              Variações por produto e estabelecimento — sempre que um preço novo é salvo, entra
              aqui automaticamente.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Select value={establishmentId || "all"} onValueChange={(v) => setEstablishmentId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Estabelecimento" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">Todos os estabelecimentos</SelectItem>
                {(establishments ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto…"
                className="pl-8"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyChanges}
                onChange={(e) => setOnlyChanges(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              Só mostrar variações
            </label>
            <div className="ml-auto text-xs text-muted-foreground">
              {stats.total} registros · <span className="text-emerald-600">{stats.drops} quedas</span> ·{" "}
              <span className="text-red-600">{stats.ups} altas</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {list.isLoading ? (
              <div className="flex items-center justify-center p-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-3">Produto</th>
                      <th className="p-3">Estabelecimento</th>
                      <th className="p-3 text-right">Anterior</th>
                      <th className="p-3 text-right">Atual</th>
                      <th className="p-3 text-right">Δ</th>
                      <th className="p-3">Quando</th>
                      <th className="p-3">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setOpenRow(r)}
                        className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                      >
                        <td className="p-3">
                          <div className="font-medium">{r.productName}</div>
                          {r.sizeValue != null && (
                            <div className="text-xs text-muted-foreground">
                              {r.sizeValue}
                              {r.sizeUnit ?? ""}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{r.establishmentName ?? "—"}</td>
                        <td className="p-3 text-right tabular-nums">{fmtBRL(r.previousPrice)}</td>
                        <td className="p-3 text-right font-medium tabular-nums">{fmtBRL(r.price)}</td>
                        <td className="p-3 text-right">
                          <DeltaBadge pct={r.changePct} />
                        </td>
                        <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                          {fmtDT(r.capturedAt)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="h-5 text-[11px]">
                            {r.source}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{openRow?.productName}</SheetTitle>
            <SheetDescription>
              {openRow?.establishmentName ?? ""}
              {openRow?.sizeValue != null && ` · ${openRow.sizeValue}${openRow.sizeUnit ?? ""}`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {series.isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {series.data && series.data.length > 0 && (
              <>
                <div className="rounded-lg border bg-card p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Evolução ({series.data.length} pontos)
                  </div>
                  <Sparkline
                    points={series.data.map((s) => ({ date: s.capturedAt, price: s.price }))}
                    width={480}
                    height={80}
                    className="w-full"
                  />
                </div>

                <div className="rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="p-2">Data</th>
                        <th className="p-2 text-right">Preço</th>
                        <th className="p-2 text-right">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...series.data].reverse().map((s) => (
                        <tr key={s.id} className="border-b">
                          <td className="p-2 text-xs text-muted-foreground">{fmtDT(s.capturedAt)}</td>
                          <td className="p-2 text-right tabular-nums">{fmtBRL(s.price)}</td>
                          <td className="p-2 text-right">
                            <DeltaBadge pct={s.changePct} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {series.data && series.data.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Sem histórico ainda.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />—
      </span>
    );
  }
  if (Math.abs(pct) < 0.01) {
    return <span className="text-xs text-muted-foreground">0%</span>;
  }
  const down = pct < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
        down ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {down ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
