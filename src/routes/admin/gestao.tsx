import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLicensePlans, generateLicenseCodes, listLicenseCodes, revokeLicenseCode,
  reactivateLicenseCode, deleteLicenseCode, updateLicenseCodeExpiry, reissueLicenseCode,
  upsertLicensePlan,
  listAccounts, adminResetUserPin, adminExtendUserAccess,
  listLoginEvents, getAdminMetrics,
} from "@/lib/licenses.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { KeyRound, Users, Ticket, Activity, Copy, RefreshCcw, Shield, Loader2, Wallet, Gift, Pencil, Trash2, RotateCcw, CalendarClock, Send, Plus } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-provider";
import { PaymentsTab } from "@/components/admin/PaymentsTab";
import { CollaboratorsTab } from "@/components/admin/CollaboratorsTab";
import { DataTable } from "@/components/data/DataTable";

export const Route = createFileRoute("/admin/gestao")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({ meta: [{ title: "Gestão — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminOnly><Gestao /></AdminOnly>,
});

const brl = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

function Gestao() {
  return (
    <AppShell>
      <PageHeader
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Gestão" }]}
        eyebrow="Painel Executive"
        title="Gestão administrativa"
        description="Licenças, contas, colaboradores, logins, planos e pagamentos — tudo em um só lugar."
        icon={<Shield className="h-5 w-5" style={{ color: "#b58a3c" }} />}
        goldRule
      />
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <MetricsCards />
        <Tabs defaultValue="licencas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1 md:grid-cols-6">
            <TabsTrigger value="licencas" className="rounded-lg text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Ticket className="mr-1.5 h-3.5 w-3.5" />Licenças
            </TabsTrigger>
            <TabsTrigger value="contas" className="rounded-lg text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="mr-1.5 h-3.5 w-3.5" />Contas
            </TabsTrigger>
            <TabsTrigger value="colaboradores" className="rounded-lg text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Gift className="mr-1.5 h-3.5 w-3.5" />Colaboradores
            </TabsTrigger>
            <TabsTrigger value="logins" className="rounded-lg text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="mr-1.5 h-3.5 w-3.5" />Logins
            </TabsTrigger>
            <TabsTrigger value="planos" className="rounded-lg text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />Planos
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="rounded-lg text-[12px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wallet className="mr-1.5 h-3.5 w-3.5" />Pagamentos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="licencas"><LicensesTab /></TabsContent>
          <TabsContent value="contas"><AccountsTab /></TabsContent>
          <TabsContent value="colaboradores"><CollaboratorsTab /></TabsContent>
          <TabsContent value="logins"><LoginsTab /></TabsContent>
          <TabsContent value="planos"><PlansTab /></TabsContent>
          <TabsContent value="pagamentos"><PaymentsTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function MetricsCards() {
  const fetchMetrics = useServerFn(getAdminMetrics);
  const { data } = useQuery({ queryKey: ["admin-metrics"], queryFn: () => fetchMetrics() });
  const items = [
    { label: "Contas totais", value: data?.accounts ?? 0 },
    { label: "Assinantes ativos", value: data?.activeSubscribers ?? 0 },
    { label: "Códigos gerados", value: data?.codesTotal ?? 0 },
    { label: "Códigos resgatados", value: data?.codesRedeemed ?? 0 },
    { label: "Chamadas IA (30d)", value: data?.aiCallsLast30 ?? 0 },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {items.map((it) => (
        <Card key={it.label} className="p-3">
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div className="text-2xl font-bold">{it.value.toLocaleString("pt-BR")}</div>
        </Card>
      ))}
    </div>
  );
}

function PlansTab() {
  const qc = useQueryClient();
  const fetchPlans = useServerFn(listLicensePlans);
  const upsertFn = useServerFn(upsertLicensePlan);
  const { data: plans } = useQuery({ queryKey: ["license-plans"], queryFn: () => fetchPlans() });
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const save = useMutation({
    mutationFn: async (p: any) => upsertFn({ data: p }),
    onSuccess: () => {
      toast.success("Plano salvo");
      qc.invalidateQueries({ queryKey: ["license-plans"] });
      setEditing(null); setCreating(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Planos disponíveis</h2>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-3.5 h-3.5 mr-1" />Novo plano</Button>
      </div>
      <div className="space-y-2">
        {(plans ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <div className="font-medium">{p.name} <span className="text-xs text-muted-foreground">({p.days} dias)</span></div>
              {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
              <span className="font-semibold">{brl(p.price_cents)}</span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() =>
                save.mutate({ ...p, active: !p.active })
              }>{p.active ? "Desativar" : "Ativar"}</Button>
            </div>
          </div>
        ))}
        {(plans ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">Nenhum plano cadastrado</div>
        )}
      </div>

      <PlanEditDialog
        open={!!editing || creating}
        onOpenChange={(v) => { if (!v) { setEditing(null); setCreating(false); } }}
        plan={editing}
        onSave={(p) => save.mutate(p)}
        saving={save.isPending}
      />
    </Card>
  );
}

function PlanEditDialog({ open, onOpenChange, plan, onSave, saving }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  plan: any | null; onSave: (p: any) => void; saving: boolean;
}) {
  const [name, setName] = useState(plan?.name ?? "");
  const [slug, setSlug] = useState(plan?.slug ?? "");
  const [days, setDays] = useState<number>(plan?.days ?? 30);
  const [priceReais, setPriceReais] = useState<string>(((plan?.price_cents ?? 0) / 100).toFixed(2));
  const [active, setActive] = useState<boolean>(plan?.active ?? true);
  const [sortOrder, setSortOrder] = useState<number>(plan?.sort_order ?? 100);
  const [description, setDescription] = useState<string>(plan?.description ?? "");

  // Reset ao abrir
  useState(() => {
    setName(plan?.name ?? ""); setSlug(plan?.slug ?? "");
    setDays(plan?.days ?? 30);
    setPriceReais(((plan?.price_cents ?? 0) / 100).toFixed(2));
    setActive(plan?.active ?? true);
    setSortOrder(plan?.sort_order ?? 100);
    setDescription(plan?.description ?? "");
  });

  function submit() {
    const cents = Math.round(parseFloat(priceReais.replace(",", ".")) * 100);
    if (!name.trim() || !slug.trim() || !days || Number.isNaN(cents)) {
      toast.error("Preencha nome, slug, dias e preço"); return;
    }
    onSave({
      id: plan?.id, name: name.trim(), slug: slug.trim().toLowerCase(),
      days: Math.floor(days), price_cents: cents, active,
      sort_order: sortOrder, description: description.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan?.id ? "Editar plano" : "Novo plano"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mensal" /></div>
            <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mensal" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Dias</Label><Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} /></div>
            <div><Label>Preço (R$)</Label><Input value={priceReais} onChange={(e) => setPriceReais(e.target.value)} placeholder="19,90" /></div>
            <div><Label>Ordem</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} /></div>
          </div>
          <div><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Acesso premium por 30 dias" /></div>
          <div className="flex items-center justify-between border rounded p-2">
            <div>
              <div className="text-sm font-medium">Plano ativo</div>
              <div className="text-xs text-muted-foreground">Se desativado, não aparece no checkout.</div>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LicensesTab() {
  const qc = useQueryClient();
  const fetchPlans = useServerFn(listLicensePlans);
  const listFn = useServerFn(listLicenseCodes);
  const genFn = useServerFn(generateLicenseCodes);
  const revokeFn = useServerFn(revokeLicenseCode);
  const reactivateFn = useServerFn(reactivateLicenseCode);
  const deleteFn = useServerFn(deleteLicenseCode);
  const updateExpiryFn = useServerFn(updateLicenseCodeExpiry);
  const reissueFn = useServerFn(reissueLicenseCode);
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [qty, setQty] = useState(10);
  const [expDays, setExpDays] = useState(180);
  const [expiryEdit, setExpiryEdit] = useState<{ id: string; code: string; iso: string } | null>(null);
  const [reissueDlg, setReissueDlg] = useState<{ id: string; code: string; days: number; notify: boolean } | null>(null);

  const { data: plans } = useQuery({ queryKey: ["license-plans"], queryFn: () => fetchPlans() });
  const codesQuery = useQuery({
    queryKey: ["license-codes", status, search],
    queryFn: () => listFn({ data: { status: status === "all" ? undefined : status, search, limit: 200 } }),
  });
  const codes = codesQuery.data;
  const isLoading = codesQuery.isLoading;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["license-codes"] });

  const generate = useMutation({
    mutationFn: async () => genFn({ data: { planId, quantity: qty, expiresInDays: expDays } }),
    onSuccess: (r) => {
      toast.success(`${r.codes.length} códigos gerados`);
      invalidate();
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => { toast.success("Código revogado"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });
  const reactivate = useMutation({
    mutationFn: async (v: { id: string; addDays: number }) => reactivateFn({ data: v }),
    onSuccess: () => { toast.success("Código reativado"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Código excluído permanentemente"); invalidate(); qc.invalidateQueries({ queryKey: ["admin-metrics"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });
  const updateExpiry = useMutation({
    mutationFn: async (v: { id: string; expiresAt: string }) => updateExpiryFn({ data: v }),
    onSuccess: () => { toast.success("Validade atualizada"); setExpiryEdit(null); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });
  const reissue = useMutation({
    mutationFn: async (v: { id: string; expiresInDays: number; notifyBuyer: boolean }) => reissueFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`Novo código: ${r.newCode}`, { duration: 15000 });
      setReissueDlg(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Gerar códigos em lote</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <Label>Plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(plans ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {brl(p.price_cents)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input type="number" min={1} max={500} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} />
          </div>
          <div>
            <Label>Válido por (dias)</Label>
            <Input type="number" min={1} max={730} value={expDays} onChange={(e) => setExpDays(Number(e.target.value) || 180)} />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!planId || generate.isPending}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar códigos"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <div className="flex-1 min-w-[160px]">
            <Label>Buscar código</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PC-..." />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Disponível</SelectItem>
                <SelectItem value="redeemed">Resgatado</SelectItem>
                <SelectItem value="pending">Aguardando pgto</SelectItem>
                <SelectItem value="revoked">Revogado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable
          data={codes as any[] | undefined}
          loading={isLoading}
          error={codesQuery.error as Error | null}
          onRetry={() => codesQuery.refetch()}
          pageSize={20}
          rowKey={(c: any) => c.id}
          emptyTitle="Nenhum código encontrado"
          emptyDescription="Ajuste os filtros ou gere novos códigos em lote acima."
          emptyIcon={<Ticket className="h-5 w-5 text-muted-foreground" />}
          defaultSort={{ key: "expires_at", dir: "desc" }}
          columns={[
            {
              key: "code",
              header: "Código",
              sortable: true,
              accessor: (c: any) => c.code,
              cell: (c: any) => <span className="font-mono text-[12px]">{c.code}</span>,
            },
            {
              key: "price_cents",
              header: "Valor",
              sortable: true,
              align: "right",
              accessor: (c: any) => c.price_cents,
              cell: (c: any) => brl(c.price_cents),
            },
            {
              key: "status",
              header: "Status",
              sortable: true,
              accessor: (c: any) => c.status,
              cell: (c: any) => (
                <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                  {c.status}
                </Badge>
              ),
            },
            {
              key: "expires_at",
              header: "Expira em",
              sortable: true,
              accessor: (c: any) => (c.expires_at ? new Date(c.expires_at) : null),
              cell: (c: any) => (
                <span className="text-[12px] text-muted-foreground">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "Ações",
              align: "right",
              cell: (c: any) => {
                const isRedeemed = c.status === "redeemed";
                const isRevoked = c.status === "revoked";
                return (
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Copiar" onClick={() => {
                      navigator.clipboard.writeText(c.code);
                      toast.success("Código copiado");
                    }}><Copy className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" title="Editar validade" onClick={() =>
                      setExpiryEdit({ id: c.id, code: c.code, iso: c.expires_at?.slice(0, 10) ?? "" })
                    }><CalendarClock className="w-3.5 h-3.5" /></Button>
                    {!isRedeemed && (
                      <Button size="sm" variant="ghost" title="Reemitir código" onClick={() =>
                        setReissueDlg({ id: c.id, code: c.code, days: 180, notify: true })
                      }><Send className="w-3.5 h-3.5" /></Button>
                    )}
                    {isRevoked && (
                      <Button size="sm" variant="ghost" title="Reativar" onClick={async () => {
                        if (await confirm({ title: "Reativar código?", description: `${c.code} — volta ao status disponível.`, tone: "warning" })) {
                          reactivate.mutate({ id: c.id, addDays: 0 });
                        }
                      }}><RotateCcw className="w-3.5 h-3.5" /></Button>
                    )}
                    {!isRedeemed && !isRevoked && (
                      <Button size="sm" variant="ghost" title="Revogar" onClick={async () => {
                        if (await confirm({ title: "Revogar código?", description: c.code, tone: "danger" })) {
                          revoke.mutate(c.id);
                        }
                      }}>Revogar</Button>
                    )}
                    {!isRedeemed && (
                      <Button size="sm" variant="ghost" title="Excluir permanentemente" onClick={async () => {
                        if (await confirm({
                          title: "Excluir código permanentemente?",
                          description: `${c.code} será removido do banco. Esta ação não pode ser desfeita.`,
                          tone: "danger",
                          confirmLabel: "Excluir",
                        })) {
                          del.mutate(c.id);
                        }
                      }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </Card>


      {/* Diálogo: editar validade */}
      <Dialog open={!!expiryEdit} onOpenChange={(v) => !v && setExpiryEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar validade</DialogTitle></DialogHeader>
          {expiryEdit && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">Código: <span className="font-mono">{expiryEdit.code}</span></div>
              <div>
                <Label>Nova data de expiração</Label>
                <Input
                  type="date"
                  value={expiryEdit.iso}
                  onChange={(e) => setExpiryEdit({ ...expiryEdit, iso: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExpiryEdit(null)}>Cancelar</Button>
            <Button
              disabled={!expiryEdit?.iso || updateExpiry.isPending}
              onClick={() => expiryEdit && updateExpiry.mutate({
                id: expiryEdit.id,
                expiresAt: new Date(expiryEdit.iso + "T23:59:59Z").toISOString(),
              })}
            >{updateExpiry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: reemitir código */}
      <Dialog open={!!reissueDlg} onOpenChange={(v) => !v && setReissueDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reemitir código</DialogTitle></DialogHeader>
          {reissueDlg && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Um novo código será gerado para o mesmo plano.
                O código antigo <span className="font-mono">{reissueDlg.code}</span> será revogado.
                Se o comprador estiver identificado, ele receberá o novo código como notificação no app.
              </p>
              <div>
                <Label>Validade do novo código (dias)</Label>
                <Input
                  type="number" min={1} max={730}
                  value={reissueDlg.days}
                  onChange={(e) => setReissueDlg({ ...reissueDlg, days: Number(e.target.value) || 180 })}
                />
              </div>
              <div className="flex items-center justify-between border rounded p-2">
                <div className="text-sm">Notificar comprador no app</div>
                <Switch checked={reissueDlg.notify} onCheckedChange={(v) => setReissueDlg({ ...reissueDlg, notify: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReissueDlg(null)}>Cancelar</Button>
            <Button
              disabled={reissue.isPending}
              onClick={() => reissueDlg && reissue.mutate({
                id: reissueDlg.id, expiresInDays: reissueDlg.days, notifyBuyer: reissueDlg.notify,
              })}
            >{reissue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reemitir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



function AccountsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAccounts);
  const resetFn = useServerFn(adminResetUserPin);
  const extendFn = useServerFn(adminExtendUserAccess);
  const { confirm } = useConfirm();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-accounts", search],
    queryFn: () => listFn({ data: { search, limit: 200 } }),
  });

  const reset = useMutation({
    mutationFn: async (id: string) => resetFn({ data: { userId: id } }),
    onSuccess: (r) => toast.success(`Novo PIN: ${r.newPin}`, { duration: 12000 }),
  });
  const extend = useMutation({
    mutationFn: async (v: { id: string; days: number }) => extendFn({ data: { userId: v.id, addDays: v.days, reason: "Ajuste manual admin" } }),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Novo vencimento: ${new Date(r.newPaidUntil!).toLocaleDateString("pt-BR")}`);
      else toast.error(r.message ?? "Falha");
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
  });

  return (
    <Card className="p-4">
      <div className="flex gap-2 mb-3">
        <Input placeholder="Nome, e-mail, CPF ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr>
                <th className="py-2 px-2">Nome</th>
                <th className="py-2 px-2">Contato</th>
                <th className="py-2 px-2">Assinatura</th>
                <th className="py-2 px-2">Último acesso</th>
                <th className="py-2 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a: any) => {
                const activeMs = a.paid_until ? Date.parse(a.paid_until) : 0;
                const active = activeMs > Date.now();
                return (
                  <tr key={a.id} className="border-b hover:bg-muted/40">
                    <td className="py-2 px-2">
                      <div className="font-medium">{a.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.cpf ?? ""}</div>
                    </td>
                    <td className="py-2 px-2 text-xs">
                      <div>{a.email ?? "—"}</div>
                      <div className="text-muted-foreground">{a.phone ?? ""}</div>
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant={active ? "default" : "secondary"}>
                        {active ? `Ativo até ${new Date(a.paid_until).toLocaleDateString("pt-BR")}` : "Sem assinatura"}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-xs">
                      {a.last_seen_at ? new Date(a.last_seen_at).toLocaleString("pt-BR") : "—"}
                      <div className="text-muted-foreground">{a.total_logins ?? 0} logins</div>
                    </td>
                    <td className="py-2 px-2 flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (await confirm({ title: "Redefinir PIN?", description: "Um novo PIN será gerado e mostrado.", tone: "warning" })) {
                          reset.mutate(a.id);
                        }
                      }}><KeyRound className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => extend.mutate({ id: a.id, days: 30 })}>+30d</Button>
                      <Button size="sm" variant="ghost" onClick={() => extend.mutate({ id: a.id, days: -30 })}>-30d</Button>
                    </td>
                  </tr>
                );
              })}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhuma conta</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function LoginsTab() {
  const listFn = useServerFn(listLoginEvents);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["login-events", onlyFailed],
    queryFn: () => listFn({ data: { onlyFailed, limit: 200 } }),
  });
  return (
    <Card className="p-4">
      <div className="flex gap-2 mb-3">
        <Button size="sm" variant={onlyFailed ? "outline" : "default"} onClick={() => setOnlyFailed(false)}>Todos</Button>
        <Button size="sm" variant={onlyFailed ? "default" : "outline"} onClick={() => setOnlyFailed(true)}>Somente falhas</Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => refetch()}><RefreshCcw className="w-3.5 h-3.5" /></Button>
      </div>
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr>
                <th className="py-2 px-2">Data</th>
                <th className="py-2 px-2">Identificação</th>
                <th className="py-2 px-2">IP</th>
                <th className="py-2 px-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e: any) => (
                <tr key={e.id} className="border-b hover:bg-muted/40">
                  <td className="py-2 px-2 text-xs">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                  <td className="py-2 px-2 text-xs">{e.email ?? e.cpf_masked ?? "—"}</td>
                  <td className="py-2 px-2 text-xs font-mono">{e.ip_address ?? "—"}</td>
                  <td className="py-2 px-2">
                    <Badge variant={e.success ? "default" : "destructive"}>
                      {e.success ? "OK" : e.reason ?? "falha"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Sem eventos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
