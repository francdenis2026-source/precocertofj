import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
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
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <header className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Gestão administrativa</h1>
        </header>
        <MetricsCards />
        <Tabs defaultValue="licencas" className="space-y-4">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            <TabsTrigger value="licencas"><Ticket className="w-4 h-4 mr-1" />Licenças</TabsTrigger>
            <TabsTrigger value="contas"><Users className="w-4 h-4 mr-1" />Contas</TabsTrigger>
            <TabsTrigger value="colaboradores"><Gift className="w-4 h-4 mr-1" />Colaboradores</TabsTrigger>
            <TabsTrigger value="logins"><Activity className="w-4 h-4 mr-1" />Logins</TabsTrigger>
            <TabsTrigger value="planos"><KeyRound className="w-4 h-4 mr-1" />Planos</TabsTrigger>
            <TabsTrigger value="pagamentos"><Wallet className="w-4 h-4 mr-1" />Pagamentos</TabsTrigger>
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
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [qty, setQty] = useState(10);
  const [expDays, setExpDays] = useState(180);

  const { data: plans } = useQuery({ queryKey: ["license-plans"], queryFn: () => fetchPlans() });
  const { data: codes, isLoading } = useQuery({
    queryKey: ["license-codes", status, search],
    queryFn: () => listFn({ data: { status: status === "all" ? undefined : status, search, limit: 200 } }),
  });

  const generate = useMutation({
    mutationFn: async () => genFn({ data: { planId, quantity: qty, expiresInDays: expDays } }),
    onSuccess: (r) => {
      toast.success(`${r.codes.length} códigos gerados`);
      qc.invalidateQueries({ queryKey: ["license-codes"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Código revogado");
      qc.invalidateQueries({ queryKey: ["license-codes"] });
    },
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
        {isLoading ? <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2 px-2">Código</th>
                  <th className="py-2 px-2">Valor</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Expira em</th>
                  <th className="py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(codes ?? []).map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-muted/40">
                    <td className="py-2 px-2 font-mono">{c.code}</td>
                    <td className="py-2 px-2">{brl(c.price_cents)}</td>
                    <td className="py-2 px-2">
                      <Badge variant={c.status === "paid" ? "default" : "secondary"}>{c.status}</Badge>
                    </td>
                    <td className="py-2 px-2 text-xs">{new Date(c.expires_at).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 px-2 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => {
                        navigator.clipboard.writeText(c.code);
                        toast.success("Código copiado");
                      }}><Copy className="w-3.5 h-3.5" /></Button>
                      {c.status !== "redeemed" && c.status !== "revoked" && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (await confirm({ title: "Revogar código?", description: c.code, tone: "danger" })) {
                            revoke.mutate(c.id);
                          }
                        }}>Revogar</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(codes ?? []).length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum código encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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
