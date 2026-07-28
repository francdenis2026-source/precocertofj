import { createFileRoute } from "@tanstack/react-router";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { QuickPricePage } from "./admin_.preco-rapido";
import { HistoricoPrecosPage } from "./admin_.historico-precos";
import { formatShortDate } from "@/components/product/TrustIndicator";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { AppShell } from "@/components/brand/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  adminSearchScans,
  updateScanPrice,
  deleteScanAdmin,
  verifyScanAdmin,
  invalidateCacheAdmin,
  listAuditLog,
  type AdminScanRow,
} from "@/lib/admin-price.functions";
import { listPublicStores } from "@/lib/stores-public.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  Trash2,
  Pencil,
  RefreshCw,
  Search,
  Filter,
  Zap,
  CheckCircle2,
  XCircle,
  History,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/brand/PageHeader";
import { ScanEditDialog } from "@/components/admin/ScanEditDialog";
import { AuditLogTable } from "@/components/admin/AuditLogTable";

type PrecosTab = "completo" | "rapido" | "historico";
const PRECOS_TABS = [
  { key: "completo", label: "Modo completo" },
  { key: "rapido", label: "Registro rápido" },
  { key: "historico", label: "Histórico" },
];

export const Route = createFileRoute("/admin_/precos")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  validateSearch: (s: Record<string, unknown>): { tab: PrecosTab } => {
    const t = String(s.tab ?? "completo");
    const tab: PrecosTab = t === "rapido" || t === "historico" ? t : "completo";
    return { tab };
  },
  head: () => ({
    meta: [
      { title: "Gestão de preços — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrecosShell,
});

function PrecosShell() {
  const { tab } = Route.useSearch();
  return (
    <AppShell scope="admin">
      <AdminOnly>
        <AdminTabs to="/admin/precos" items={PRECOS_TABS} active={tab} />
        {tab === "completo" && <AdminPrecosPage />}
        {tab === "rapido" && <QuickPricePage />}
        {tab === "historico" && <HistoricoPrecosPage />}
      </AdminOnly>
    </AppShell>
  );
}


const brl = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function AdminPrecosPage() {
  const qc = useQueryClient();
  const { prompt } = useConfirm();


  const searchFn = useServerFn(adminSearchScans);
  const updateFn = useServerFn(updateScanPrice);
  const deleteFn = useServerFn(deleteScanAdmin);
  const verifyFn = useServerFn(verifyScanAdmin);
  const invalidateFn = useServerFn(invalidateCacheAdmin);
  const auditFn = useServerFn(listAuditLog);

  const [query, setQuery] = useState("");
  const [establishmentId, setEstablishmentId] = useState<string | "">("");
  const [verifyFilter, setVerifyFilter] = useState<"all" | "verified" | "unverified">("all");
  const [editing, setEditing] = useState<AdminScanRow | null>(null);

  const stores = useQuery({
    queryKey: ["stores-public-admin-precos"],
    queryFn: () => listPublicStores(),
    staleTime: 5 * 60 * 1000,
  });

  const scans = useQuery({
    queryKey: ["admin-scans", query, establishmentId, verifyFilter],
    queryFn: () =>
      searchFn({
        data: {
          query,
          establishmentId: establishmentId || null,
          onlyVerified: verifyFilter === "verified",
          onlyUnverified: verifyFilter === "unverified",
          limit: 100,
        },
      }),
  });

  const audit = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: () => auditFn({ data: { limit: 100 } }),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-scans"] });
    qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
  };

  const updateMut = useMutation({
    mutationFn: (args: { scanId: string; newPrice: number; notes: string }) =>
      updateFn({ data: { scanId: args.scanId, newPrice: args.newPrice, notes: args.notes || null } }),
    onSuccess: () => {
      toast.success("Preço atualizado e registrado na auditoria.");
      invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (args: { scanId: string; reason: string }) =>
      deleteFn({ data: args }),
    onSuccess: () => {
      toast.success("Leitura removida.");
      invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover"),
  });

  const verifyMut = useMutation({
    mutationFn: (args: { scanId: string; verified: boolean }) =>
      verifyFn({ data: { scanId: args.scanId, verified: args.verified, notes: null } }),
    onSuccess: (_data, vars) => {
      toast.success(vars.verified ? "Preço marcado como verificado." : "Verificação removida.");
      invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na verificação"),
  });

  const invalidateMut = useMutation({
    mutationFn: invalidateFn,
    onSuccess: (res) => {
      toast.success(
        `Cache invalidado (${res.scope})${res.refreshed != null ? ` · ${res.refreshed} chave(s)` : ""}.`,
      );
      invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na invalidação"),
  });

  const storeOptions = useMemo(() => stores.data ?? [], [stores.data]);

  return (
    <>
      <PageHeader
        eyebrow="Painel · Preços"
        title="Gestão de preços"
        description="Atualização, verificação e invalidação de cache — cada ação fica na trilha de auditoria."
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Preços" }]}
        icon={<DollarSign className="h-5 w-5" />}
        goldRule
        actions={
          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Área restrita
          </Badge>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">


      <Tabs defaultValue="scans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scans" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Preços
          </TabsTrigger>
          <TabsTrigger value="cache" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Cache
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        {/* ================== SCANS TAB ================== */}
        <TabsContent value="scans" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
              <CardDescription>Localize a leitura de preço a ajustar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label htmlFor="q">Produto</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="q"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ex.: arroz urbano"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="store">Estabelecimento</Label>
                  <select
                    id="store"
                    value={establishmentId}
                    onChange={(e) => setEstablishmentId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Todos</option>
                    {storeOptions.map((s: { id: string; name: string }) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="verify">Verificação</Label>
                  <select
                    id="verify"
                    value={verifyFilter}
                    onChange={(e) => setVerifyFilter(e.target.value as typeof verifyFilter)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="verified">Verificados</option>
                    <option value="unverified">Não verificados</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Leituras</CardTitle>
                <CardDescription>
                  {scans.data?.length ?? 0} resultado(s) — clique para ajustar.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => qc.invalidateQueries({ queryKey: ["admin-scans"] })}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Recarregar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Mercado</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scans.isLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          Carregando…
                        </TableCell>
                      </TableRow>
                    )}
                    {!scans.isLoading && (scans.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          Nenhuma leitura encontrada com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    )}
                    {(scans.data ?? []).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-[280px]">
                          <div className="truncate text-sm font-medium">{s.product_name ?? "—"}</div>
                          {s.barcode && (
                            <div className="font-mono text-[11px] text-muted-foreground">{s.barcode}</div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {s.market_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {brl(s.price_captured)}
                        </TableCell>
                        <TableCell>
                          {s.verified ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> verificado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatShortDate(s.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(s)}
                              title="Editar preço"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                verifyMut.mutate({ scanId: s.id, verified: !s.verified })
                              }
                              disabled={verifyMut.isPending}
                              title={s.verified ? "Remover verificação" : "Marcar como verificado"}
                            >
                              {s.verified ? (
                                <XCircle className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const reason = await prompt({
                                  title: "Excluir leitura",
                                  description:
                                    "Informe o motivo da exclusão (registrado na auditoria).",
                                  placeholder: "Motivo (mín. 3 caracteres)",
                                  confirmLabel: "Excluir",
                                  tone: "danger",
                                  minLength: 3,
                                });
                                if (!reason) return;
                                deleteMut.mutate({ scanId: s.id, reason: reason.trim() });
                              }}
                              disabled={deleteMut.isPending}
                              title="Excluir leitura"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================== CACHE TAB ================== */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invalidação de cache</CardTitle>
              <CardDescription>
                Rebuild seguro do cache global de comparação. Cada operação fica registrada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold">Rebuild global</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recalcula o ranking de todos os produtos. Use após grandes cargas.
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() =>
                      invalidateMut.mutate({ data: { scope: "global", notes: null } })
                    }
                    disabled={invalidateMut.isPending}
                  >
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    Rebuild agora
                  </Button>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold">Rebuild por estabelecimento</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reprocessa apenas os produtos vinculados ao estabelecimento selecionado.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <select
                      value={establishmentId}
                      onChange={(e) => setEstablishmentId(e.target.value)}
                      className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Escolha um mercado…</option>
                      {storeOptions.map((s: { id: string; name: string }) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!establishmentId || invalidateMut.isPending}
                      onClick={() =>
                        invalidateMut.mutate({
                          data: { scope: "store", establishmentId, notes: null },
                        })
                      }
                    >
                      Rebuild
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                <Filter className="mr-1 inline h-3 w-3" />
                Rebuild global normaliza a contagem exibida na Home e nas métricas administrativas.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================== AUDIT TAB ================== */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Trilha de auditoria</CardTitle>
                <CardDescription>
                  Últimas {audit.data?.length ?? 0} ações administrativas — imutável.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => qc.invalidateQueries({ queryKey: ["admin-audit-log"] })}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              <AuditLogTable entries={audit.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScanEditDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        scan={editing}
        onSubmit={async (args) => {
          await updateMut.mutateAsync(args);
        }}
      />
      </div>
    </>
  );
}

