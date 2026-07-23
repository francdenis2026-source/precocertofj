import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listImportBatches,
  listImportItems,
  backfillBatchFromScans,
  deleteImportBatch,
  type ImportBatch,
  type ImportItem,
} from "@/lib/imports.functions";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, PackagePlus, PackageCheck, PackageX, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin_/importacoes")({
  head: () => ({
    meta: [
      { title: "Importações — Admin" },
      { name: "description", content: "Acompanhe lotes de importação de produtos: criados, atualizados, pulados e erros." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImportacoesPage,
});

function statusBadge(status: string) {
  const cls =
    status === "created"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : status === "updated"
        ? "bg-blue-500/15 text-blue-700 border-blue-500/30"
        : status === "skipped"
          ? "bg-muted text-muted-foreground border-border"
          : status === "low_confidence"
            ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
            : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <Badge variant="outline" className={cls}>
      {status}
    </Badge>
  );
}

function ImportacoesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listImportBatches);
  const backfillFn = useServerFn(backfillBatchFromScans);
  const deleteFn = useServerFn(deleteImportBatch);

  const batchesQ = useQuery({
    queryKey: ["import-batches"],
    queryFn: () => listFn(),
  });

  const [detailBatch, setDetailBatch] = useState<ImportBatch | null>(null);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [market, setMarket] = useState("Comercial Vanderley");
  const [hours, setHours] = useState(24);
  const [note, setNote] = useState("");

  const backfillM = useMutation({
    mutationFn: (v: { market_name: string; hours: number; note: string }) =>
      backfillFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`Lote criado com ${r.count} itens.`);
      setBackfillOpen(false);
      qc.invalidateQueries({ queryKey: ["import-batches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Lote removido.");
      qc.invalidateQueries({ queryKey: ["import-batches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const batches = batchesQ.data ?? [];
  const totalCreated = batches.reduce((s, b) => s + (b.created_count || 0), 0);
  const totalUpdated = batches.reduce((s, b) => s + (b.updated_count || 0), 0);
  const totalSkipped = batches.reduce((s, b) => s + (b.skipped_count || 0), 0);
  const totalErrors = batches.reduce((s, b) => s + (b.error_count || 0), 0);

  return (
    <AppShell>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Importações" },
        ]}
        title="Painel de importações"
        description="Cada lote registra o que foi criado, atualizado, pulado ou falhou durante a importação."
        actions={
          <Button variant="executive" onClick={() => setBackfillOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo lote (a partir de scans)
          </Button>
        }
      />
      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<PackagePlus className="h-4 w-4" />} label="Criados" value={totalCreated} tone="emerald" />
          <KpiCard icon={<PackageCheck className="h-4 w-4" />} label="Atualizados" value={totalUpdated} tone="blue" />
          <KpiCard icon={<PackageX className="h-4 w-4" />} label="Pulados" value={totalSkipped} tone="muted" />
          <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Erros" value={totalErrors} tone="destructive" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lotes recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {batchesQ.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : batches.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Nenhum lote registrado ainda. Use o botão acima para criar um lote a partir dos últimos scans.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Mercado</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Criados</TableHead>
                      <TableHead className="text-right">Atual.</TableHead>
                      <TableHead className="text-right">Pulados</TableHead>
                      <TableHead className="text-right">Erros</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(b.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm">{b.market_name ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.source}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-700 font-medium">
                          {b.created_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-blue-700">
                          {b.updated_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {b.skipped_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-destructive">
                          {b.error_count}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{b.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost-navy" onClick={() => setDetailBatch(b)}>
                            Detalhes
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Remover este lote?")) deleteM.mutate(b.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Backfill dialog */}
      <Dialog open={backfillOpen} onOpenChange={setBackfillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar lote a partir de scans recentes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Mercado</Label>
              <Input value={market} onChange={(e) => setMarket(e.target.value)} />
            </div>
            <div>
              <Label>Janela (horas)</Label>
              <Input
                type="number"
                min={1}
                max={720}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Nota (opcional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fotos das gôndolas" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBackfillOpen(false)}>Cancelar</Button>
            <Button
              variant="executive"
              disabled={backfillM.isPending}
              onClick={() => backfillM.mutate({ market_name: market, hours, note })}
            >
              {backfillM.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Criar lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <BatchDetailDialog batch={detailBatch} onClose={() => setDetailBatch(null)} />
    </AppShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "emerald" | "blue" | "muted" | "destructive";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "blue"
        ? "text-blue-700"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function BatchDetailDialog({
  batch,
  onClose,
}: {
  batch: ImportBatch | null;
  onClose: () => void;
}) {
  const listItemsFn = useServerFn(listImportItems);
  const itemsQ = useQuery({
    queryKey: ["import-items", batch?.id],
    queryFn: () => listItemsFn({ data: { batch_id: batch!.id } }),
    enabled: !!batch,
  });

  return (
    <Dialog open={!!batch} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Lote — {batch?.market_name ?? "—"}{" "}
            <span className="text-xs text-muted-foreground font-normal">
              ({batch ? new Date(batch.created_at).toLocaleString("pt-BR") : ""})
            </span>
          </DialogTitle>
        </DialogHeader>
        {itemsQ.isLoading ? (
          <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens…
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Log</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(itemsQ.data ?? []).map((i: ImportItem) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">{i.product_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.price != null ? `R$ ${Number(i.price).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {i.quantity != null ? `${i.quantity} ${i.unit ?? ""}` : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(i.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.log ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
