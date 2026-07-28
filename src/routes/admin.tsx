import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { formatShortDate } from "@/components/product/TrustIndicator";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect, useCallback } from "react";
import { issueActivationCode, verifyActivationCode } from "@/lib/activation.functions";
import {
  listSubscribers,
  listWebhookEvents,
  reprocessWebhookEvent,
  getIntegrationsStatus,
} from "@/lib/admin-webhooks.functions";
import {
  listEstablishments,
  saveEstablishment,
  deleteEstablishment,
  toggleEstablishmentActive,
  type Establishment,
  type EstablishmentKind,
} from "@/lib/establishments.functions";
import { uploadImageDataUrl } from "@/lib/storage.functions";
import { extractLogoDetails, type LogoExtract } from "@/lib/logo-extract.functions";
import { LogoQualityPanel } from "@/components/brand/LogoQualityPanel";

import { claimFirstAdmin, listUsersWithRoles, grantRole, revokeRole, listRoleAuditLog, OWNER_EMAIL, type UserWithRoles, type RoleAuditEntry } from "@/lib/roles.functions";
import { AppShell } from "@/components/brand/AppShell";
import { useAdminEntitiesRealtime, describeRealtimeChange } from "@/hooks/useAdminEntitiesRealtime";
import { usePlansRealtime } from "@/hooks/usePlansRealtime";
import { EstablishmentDeleteDialog } from "@/components/admin/EstablishmentDeleteDialog";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/typeclear";

import { StoreBadge, getStoreColor } from "@/components/brand/StoreBadge";
import { admin, useAdmin } from "@/lib/admin-store";
import {
  listAllPlans,
  getPlansHealth,
  upsertPlan as upsertPlanFn,
  togglePlanActive as togglePlanFn,
  deletePlan as deletePlanFn,
  type PlanRow,
  type BillingCycle,
} from "@/lib/plans.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { Copy, Key, Mail, Plus, RefreshCw, Trash2, XCircle, Sparkles, CreditCard, Users, Gauge, Clock, AlertTriangle, ShieldAlert, ShieldCheck, Loader2, History, ArrowUpDown, ChevronLeft, ChevronRight, Package, ImageIcon, Ticket, FileText, Languages, Trophy, Store, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMyRoles } from "@/hooks/useMyRoles";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { SectionSkeleton } from "@/components/admin/SectionSkeleton";

/* Seções pesadas carregam sob demanda (gráficos, tabelas e auditoria). */
const AdminInsightsPanel = lazy(() =>
  import("@/components/admin/AdminInsightsPanel").then((m) => ({ default: m.AdminInsightsPanel })),
);
const AdminKpiBoard = lazy(() =>
  import("@/components/admin/AdminKpiBoard").then((m) => ({ default: m.AdminKpiBoard })),
);
const AdminGlobalSearch = lazy(() =>
  import("@/components/admin/AdminGlobalSearch").then((m) => ({ default: m.AdminGlobalSearch })),
);
const AdminActionsAudit = lazy(() =>
  import("@/components/admin/AdminActionsAudit").then((m) => ({ default: m.AdminActionsAudit })),
);
const AdminTeamPanel = lazy(() =>
  import("@/components/admin/AdminTeamPanel").then((m) => ({ default: m.AdminTeamPanel })),
);
import { logAdminAccess } from "@/lib/admin-team.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Admin — PreçoCerto" },
      { name: "description", content: "Painel administrativo: planos, integrações, assinantes e e-mails." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminGate,
});

function AdminGate() {
  const { user, loading, isAdmin } = useMyRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const claim = useServerFn(claimFirstAdmin);
  const [claiming, setClaiming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="admin-scope fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <div className="admin-scope fixed inset-0 z-50 bg-background" />;


  if (!isAdmin) {
    const handleClaim = async () => {
      setClaiming(true);
      try {
        const res = await claim();
        if (res.granted) {
          toast.success("Você é o primeiro admin. Bem-vindo!");
          await qc.invalidateQueries({ queryKey: ["my-roles"] });
        } else {
          toast.error("Já existe um administrador. Peça a ele para lhe conceder acesso.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao reivindicar admin");
      } finally {
        setClaiming(false);
      }
    };

    const handleSignOutAndBack = async () => {
      setSigningOut(true);
      try {
        const { signOut } = await import("@/hooks/useSession");
        await signOut();
        toast.info("Sessão encerrada. Faça login com uma conta administradora.");
      } finally {
        navigate({ to: "/auth", replace: true });
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Sem permissão</CardTitle>
            <CardDescription className="text-center">
              Esta área é exclusiva para administradores. Sua conta ({user.email}) não possui o papel <code>admin</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleSignOutAndBack}
              disabled={signingOut}
              className="w-full"
            >
              {signingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Voltar para o login administrador
            </Button>
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full"
              variant="outline"
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Reivindicar admin (primeiro usuário)
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A reivindicação só funciona se ainda não houver nenhum admin cadastrado.
            </p>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminPage />;
}

const cycleLabel: Record<BillingCycle, string> = {
  trial: "Teste grátis",
  monthly: "Mensal",
  semester: "Semestral",
  yearly: "Anual",
};

function AdminPage() {
  const [showAdvancedKpis, setShowAdvancedKpis] = useState(false);

  // Registra o acesso ao console na auditoria (uma vez por sessão de página).
  const logAccess = useServerFn(logAdminAccess);
  useEffect(() => {
    let done = false;
    if (done) return;
    logAccess({ data: { area: "console" } }).catch(() => {});
    return () => { done = true; };
  }, [logAccess]);

  // Prefetch das rotas administrativas mais usadas quando o navegador estiver ocioso.
  const router = useRouter();
  useEffect(() => {
    const targets = [
      "/admin/catalogo",
      "/admin/precos",
      "/admin/clientes",
      "/admin/gestao",
      "/admin/metricas",
      "/admin/cobertura",
      "/admin/analytics",
      "/admin/webhooks",
    ];
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 1200));
    const handle = idle(() => {
      for (const to of targets) router.preloadRoute({ to }).catch(() => {});
    });
    return () => {
      const cancel = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (cancel) cancel(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, [router]);


  return (
    <AppShell scope="admin">
      {/* ---------- Cabeçalho executivo compacto ---------- */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/94 backdrop-blur">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-primary/10 text-primary">
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={tc.eyebrow}>Console administrativo</p>
              <h1 className={cn(tc.h1, "mt-0.5 truncate font-sans font-semibold")}>
                Gestão do PreçoCerto
              </h1>
            </div>
          </div>
          <span className={cn(tc.tag, "hidden rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground sm:inline-flex")}>
            Painel unificado
          </span>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-2.5 px-3 py-2.5 md:px-5 md:py-3">
        {/* ---------- Indicadores executivos + busca global ---------- */}
        <div className="space-y-2.5" data-admin-region="overview">
          <Suspense fallback={<SectionSkeleton rows={2} label="Carregando busca global" />}>
            <AdminGlobalSearch />
          </Suspense>
          <Suspense fallback={<SectionSkeleton rows={3} chart label="Carregando indicadores" />}>
            <AdminInsightsPanel />
          </Suspense>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/70 px-2.5 py-1.5">
            <p className={cn(tc.meta, "truncate")}>KPIs avançados ficam recolhidos para manter o painel principal legível.</p>
            <Button
              type="button"
              size="sm"
              variant={showAdvancedKpis ? "default" : "outline"}
              className={cn(tc.control, "h-7 shrink-0 rounded-full px-2.5")}
              onClick={() => setShowAdvancedKpis((v) => !v)}
              aria-expanded={showAdvancedKpis}
            >
              {showAdvancedKpis ? "Ocultar KPIs" : "Ver KPIs"}
            </Button>
          </div>
          {showAdvancedKpis && (
            <Suspense fallback={<SectionSkeleton rows={3} chart label="Carregando KPIs de preços" />}>
              <AdminKpiBoard />
            </Suspense>
          )}
        </div>

        {/* ---------- Abas de gestão detalhada ---------- */}
        <Tabs defaultValue="plans" className="flex w-full flex-col" data-admin-region="management">
          <div className="pc-tabs-rail -mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="inline-flex h-auto w-max flex-nowrap gap-1 rounded-xl border border-border/70 bg-card p-1">
              {[
                ["plans", "Planos"],
                ["establishments", "Estabelecimentos"],
                ["status", "Status"],
                ["integrations", "Integrações & IA"],
                ["subscribers", "Assinantes"],
                ["webhooks", "Webhooks"],
                ["emails", "E-mails"],
                ["users", "Usuários & Papéis"],
                ["audit", "Auditoria"],
              ].map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    tc.control,
                    "h-7 whitespace-nowrap rounded-lg px-2.5 text-muted-foreground",
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                  )}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="mt-2 rounded-xl border border-border/60 bg-card/40 p-2.5 md:p-3">
            <TabsContent value="plans"><PlansTab /></TabsContent>
            <TabsContent value="establishments"><EstablishmentsTab /></TabsContent>
            <TabsContent value="status"><StatusTab /></TabsContent>
            <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
            <TabsContent value="subscribers"><SubscribersTab /></TabsContent>
            <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
            <TabsContent value="emails"><EmailsTab /></TabsContent>
            <TabsContent value="users" className="space-y-3">
              <Suspense fallback={<SectionSkeleton rows={4} label="Carregando equipe" />}><AdminTeamPanel /></Suspense>
              <UsersTab />
            </TabsContent>
            <TabsContent value="audit" className="space-y-3">
              <Suspense fallback={<SectionSkeleton rows={5} label="Carregando auditoria" />}><AdminActionsAudit /></Suspense>
              <AuditTab />
            </TabsContent>
          </div>
        </Tabs>

      </section>

    </AppShell>
  );
}





/* -------------------- Plans -------------------- */

function PlansHealthCard() {
  const healthFn = useServerFn(getPlansHealth);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plans", "health"],
    queryFn: () => healthFn(),
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <Card><CardContent className="py-3 text-xs text-muted-foreground">Verificando integridade dos planos…</CardContent></Card>
    );
  }

  const consistent = data.consistent;
  return (
    <Card className={cn(
      "border",
      consistent ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10",
    )}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2 text-sm">
          {consistent ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          <span className="font-medium">
            {consistent ? "Planos consistentes" : "Inconsistência detectada"}
          </span>
          <span className="text-muted-foreground">
            · license_plans: <b>{data.licenseActive}</b> ativos / {data.licenseTotal} total
          </span>
          <span className="text-muted-foreground">
            · legada plans: {data.legacyPlansExists ? `${data.legacyPlansCount} registro(s)` : "removida ✓"}
          </span>
        </div>
        {!consistent && (
          <div className="w-full text-xs text-amber-700 dark:text-amber-400">
            {data.warnings.join(" · ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlansTab() {

  const qc = useQueryClient();
  const listFn = useServerFn(listAllPlans);
  const toggleFn = useServerFn(togglePlanFn);
  const deleteFn = useServerFn(deletePlanFn);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => listFn(),
  });
  usePlansRealtime();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    qc.invalidateQueries({ queryKey: ["public-plans"] });
    qc.invalidateQueries({ queryKey: ["plans-active"] });
  };

  const toggleMut = useMutation({
    mutationFn: (p: PlanRow) => toggleFn({ data: { id: p.id, active: !p.active } }),
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao alternar plano"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Plano removido"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover"),
  });

  return (
    <div className="space-y-4">
      <PlansHealthCard />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl">Planos de assinatura</h2>
          <p className="text-sm text-muted-foreground">Configure ciclos, preços e o período de teste grátis. Alterações refletem no app imediatamente.</p>
        </div>
        <PlanDialog onSaved={invalidate}>
          <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo plano</Button>
        </PlanDialog>
      </div>


      {isLoading ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Carregando planos…</CardContent></Card>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Nenhum plano cadastrado no banco.</p>
            <PlanDialog onSaved={invalidate}>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Criar primeiro plano</Button>
            </PlanDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={plan.highlight ? "border-savings" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">{cycleLabel[plan.cycle]}</Badge>
                    <CardTitle className="font-serif text-xl">{plan.name}</CardTitle>
                  </div>
                  <Switch checked={plan.active} onCheckedChange={() => toggleMut.mutate(plan)} />
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-3xl">
                      {plan.price === 0 ? "Grátis" : plan.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    {plan.original_price != null && plan.original_price > 0 && (
                      <span className="text-xs text-muted-foreground line-through">
                        {plan.original_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.days} dias de acesso</p>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {plan.features.map((f) => <li key={f}>• {f}</li>)}
                </ul>
                <div className="flex gap-2 pt-2">
                  <PlanDialog plan={plan} onSaved={invalidate}>
                    <Button variant="outline" size="sm" className="flex-1">Editar</Button>
                  </PlanDialog>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(plan.id)} disabled={deleteMut.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanDialog({
  plan,
  children,
  onSaved,
}: {
  plan?: PlanRow;
  children: React.ReactNode;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const upsertMut = useMutation({
    mutationFn: useServerFn(upsertPlanFn),
  });

  const initial = (): PlanRow => plan ?? {
    id: "",
    name: "",
    cycle: "monthly",
    days: 30,
    price: 0,
    original_price: null,
    description: "",
    features: [],
    active: true,
    highlight: false,
  };
  const [form, setForm] = useState<PlanRow>(initial);
  const [featuresText, setFeaturesText] = useState(initial().features.join("\n"));

  useEffect(() => {
    if (open) {
      const init = initial();
      setForm(init);
      setFeaturesText(init.features.join("\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome do plano"); return; }
    try {
      await upsertMut.mutateAsync({
        data: {
          id: plan?.id,
          name: form.name,
          cycle: form.cycle,
          days: form.days,
          price: form.price,
          original_price: form.original_price,
          description: form.description,
          features: featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
          active: form.active,
          highlight: form.highlight,
        },
      });
      toast.success(plan ? "Plano atualizado" : "Plano criado");
      setOpen(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plano" : "Novo plano"}</DialogTitle>
          <DialogDescription>Defina ciclo, duração em dias e preço.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Ciclo</Label>
              <Select value={form.cycle} onValueChange={(v: BillingCycle) => {
                const days = v === "trial" ? 30 : v === "monthly" ? 30 : v === "semester" ? 180 : 365;
                setForm({ ...form, cycle: v, days });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Teste grátis</SelectItem>
                  <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
                  <SelectItem value="semester">Semestral (180 dias)</SelectItem>
                  <SelectItem value="yearly">Anual (365 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Dias</Label><Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div>
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            <div className="md:col-span-2">
              <Label>Preço original (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.original_price ?? ""}
                onChange={(e) => setForm({ ...form, original_price: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Benefícios (um por linha)</Label><Textarea rows={5} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} /></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.highlight} onCheckedChange={(v) => setForm({ ...form, highlight: v })} />
              <Label>Destacar como recomendado</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={upsertMut.isPending}>
            {upsertMut.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

}

/* -------------------- Integrations -------------------- */

function IntegrationsTab() {
  const { integrations } = useAdmin();
  const [mp, setMp] = useState(integrations.mercadoPago);
  const [gm, setGm] = useState(integrations.gemini);
  const [oa, setOa] = useState(integrations.openai);
  const [em, setEm] = useState(integrations.email);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Mercado Pago */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Mercado Pago</CardTitle>
              <CardDescription>Chaves de API para processar pagamentos das assinaturas.</CardDescription>
            </div>
            <Switch checked={mp.enabled} onCheckedChange={(v) => setMp({ ...mp, enabled: v })} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Ambiente</Label>
            <Select value={mp.env} onValueChange={(v: "sandbox" | "production") => setMp({ ...mp, env: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Public Key</Label><Input placeholder="APP_USR-..." value={mp.publicKey} onChange={(e) => setMp({ ...mp, publicKey: e.target.value })} /></div>
          <div><Label>Access Token</Label><Input type="password" placeholder="APP_USR-..." value={mp.accessToken} onChange={(e) => setMp({ ...mp, accessToken: e.target.value })} /></div>
          <div><Label>Webhook Secret</Label><Input type="password" value={mp.webhookSecret} onChange={(e) => setMp({ ...mp, webhookSecret: e.target.value })} /></div>
          <Button size="sm" onClick={() => { admin.updateIntegrations({ mercadoPago: mp }); toast.success("Mercado Pago salvo"); }}>Salvar</Button>
          <p className="text-xs text-muted-foreground">Obtenha em: <span className="font-mono">mercadopago.com.br/developers</span></p>
        </CardContent>
      </Card>

      {/* Gemini */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Google Gemini</CardTitle>
              <CardDescription>IA para sugestões, análise de listas e comparação inteligente.</CardDescription>
            </div>
            <Switch checked={gm.enabled} onCheckedChange={(v) => setGm({ ...gm, enabled: v })} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><Label>API Key</Label><Input type="password" placeholder="AIza..." value={gm.apiKey} onChange={(e) => setGm({ ...gm, apiKey: e.target.value })} /></div>
          <div>
            <Label>Modelo</Label>
            <Select value={gm.model} onValueChange={(v) => setGm({ ...gm, model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.0-flash">gemini-2.0-flash (rápido)</SelectItem>
                <SelectItem value="gemini-2.0-pro">gemini-2.0-pro</SelectItem>
                <SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => { admin.updateIntegrations({ gemini: gm }); toast.success("Gemini salvo"); }}>Salvar</Button>
          <p className="text-xs text-muted-foreground">Obtenha em: <span className="font-mono">aistudio.google.com/apikey</span></p>
        </CardContent>
      </Card>

      {/* OpenAI / ChatGPT */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> ChatGPT (OpenAI)</CardTitle>
              <CardDescription>IA alternativa. Ative o modo grátis para usar o tier gratuito.</CardDescription>
            </div>
            <Switch checked={oa.enabled} onCheckedChange={(v) => setOa({ ...oa, enabled: v })} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><Label>API Key</Label><Input type="password" placeholder="sk-..." value={oa.apiKey} onChange={(e) => setOa({ ...oa, apiKey: e.target.value })} /></div>
          <div>
            <Label>Modelo</Label>
            <Select value={oa.model} onValueChange={(v) => setOa({ ...oa, model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini (grátis)</SelectItem>
                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={oa.freeMode} onCheckedChange={(v) => setOa({ ...oa, freeMode: v })} />
            <Label>Modo grátis (limita a modelos do tier gratuito)</Label>
          </div>
          <Button size="sm" onClick={() => { admin.updateIntegrations({ openai: oa }); toast.success("OpenAI salvo"); }}>Salvar</Button>
          <p className="text-xs text-muted-foreground">Obtenha em: <span className="font-mono">platform.openai.com/api-keys</span></p>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> E-mail transacional</CardTitle>
              <CardDescription>Remetente usado no envio automático dos códigos de ativação.</CardDescription>
            </div>
            <Switch checked={em.enabled} onCheckedChange={(v) => setEm({ ...em, enabled: v })} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do remetente</Label><Input value={em.fromName} onChange={(e) => setEm({ ...em, fromName: e.target.value })} /></div>
          <div><Label>E-mail do remetente</Label><Input type="email" value={em.fromEmail} onChange={(e) => setEm({ ...em, fromEmail: e.target.value })} /></div>
          <div>
            <Label>Provedor</Label>
            <Select value={em.provider} onValueChange={(v: "lovable" | "resend" | "smtp") => setEm({ ...em, provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable Emails (recomendado)</SelectItem>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="smtp">SMTP próprio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => { admin.updateIntegrations({ email: em }); toast.success("E-mail salvo"); }}>Salvar</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- Subscribers -------------------- */

function SubscribersTab() {
  const { subscribers, plans, integrations } = useAdmin();
  const issue = useServerFn(issueActivationCode);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl">Assinantes</h2>
          <p className="text-sm text-muted-foreground">Ao criar uma assinatura, o código de ativação é enviado por e-mail automaticamente.</p>
        </div>
        <NewSubscriberDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum assinante ainda. Crie o primeiro acima.</TableCell></TableRow>
              )}
              {subscribers.map((s) => {
                const plan = plans.find((p) => p.id === s.planId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell>{plan?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "default" : s.status === "trial" ? "secondary" : "outline"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button className="inline-flex items-center gap-1 font-mono text-xs hover:text-foreground" onClick={() => { navigator.clipboard.writeText(s.activationCode); toast.success("Código copiado"); }}>
                        {s.activationCode} <Copy className="h-3 w-3" />
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatShortDate(s.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={async () => {
                        admin.resendCode(s.id);
                        const plan = plans.find((p) => p.id === s.planId);
                        if (!plan) { toast.error("Plano não encontrado"); return; }
                        try {
                          const res = await issue({ data: {
                            email: s.email, name: s.name, planId: plan.id, planName: plan.name,
                            days: plan.days, isTrial: plan.cycle === "trial", subscriptionId: s.id,
                            fromEmail: integrations.email.fromEmail, fromName: integrations.email.fromName,
                          }});
                          if (res.sent) toast.success(`Novo código enviado para ${s.email}`);
                          else toast.warning(`Código gerado (${res.code}) mas e-mail falhou: ${res.error ?? "verifique o domínio"}`);
                        } catch (e) { toast.error(e instanceof Error ? e.message : "Falha no envio"); }
                      }}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { admin.cancelSubscription(s.id); toast.success("Assinatura cancelada"); }}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VerifyCodeCard />
    </div>
  );
}

type VerifyState =
  | { kind: "idle" }
  | { kind: "valid"; planId: string | null; email: string }
  | { kind: "not_found" }
  | { kind: "expired"; expiresAt: string }
  | { kind: "already_used"; usedAt: string }
  | { kind: "lookup_error" }
  | { kind: "update_error" }
  | { kind: "error"; message: string };

function VerifyCodeCard() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<VerifyState>({ kind: "idle" });
  const verify = useServerFn(verifyActivationCode);

  const submit = async () => {
    if (!email || !code) {
      toast.error("Preencha e-mail e código");
      return;
    }
    setBusy(true);
    setState({ kind: "idle" });
    try {
      const res = await verify({ data: { email, code } });
      if (res.valid) {
        setState({ kind: "valid", planId: res.planId ?? null, email: res.email ?? email });
        toast.success("Código válido — assinatura ativada");
      } else {
        switch (res.reason) {
          case "not_found":
            setState({ kind: "not_found" });
            break;
          case "expired":
            setState({ kind: "expired", expiresAt: res.expiresAt ?? "" });
            break;
          case "already_used":
            setState({ kind: "already_used", usedAt: res.usedAt ?? "" });
            break;
          case "lookup_error":
            setState({ kind: "lookup_error" });
            break;
          case "update_error":
            setState({ kind: "update_error" });
            break;
          default:
            setState({ kind: "error", message: "Código inválido" });
        }
      }
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Falha na verificação" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Verificar código de ativação</CardTitle>
        <CardDescription>
          Confirme se um código enviado por e-mail é válido, não expirou e não foi usado.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="assinante@exemplo.com"
            />
          </div>
          <div>
            <Label>Código</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PC-XXXX-XXXX-XXXX"
              className="font-mono"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={busy}>
              {busy ? "Verificando..." : "Verificar"}
            </Button>
          </div>
        </div>
        <VerifyResult state={state} />
      </CardContent>
    </Card>
  );
}

function VerifyResult({ state }: { state: VerifyState }) {
  if (state.kind === "idle") return null;

  const shell = "rounded-lg border p-3 text-sm";
  const fmt = (iso: string) =>
    iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }) : "-";

  if (state.kind === "valid") {
    return (
      <div className={`${shell} border-savings/40 bg-savings/5`}>
        <div className="flex items-center gap-2 font-medium text-savings dark:text-savings">
          <Sparkles className="h-4 w-4" /> Código válido — assinatura ativada
        </div>
        <div className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
          <div>E-mail: <span className="font-mono">{state.email}</span></div>
          <div>Plano: <span className="font-mono">{state.planId ?? "-"}</span></div>
          <div>Marcado como usado neste momento.</div>
        </div>
      </div>
    );
  }

  if (state.kind === "not_found") {
    return (
      <div className={`${shell} border-warning/40 bg-warning/5`}>
        <div className="flex items-center gap-2 font-medium text-warning dark:text-warning">
          <AlertTriangle className="h-4 w-4" /> Código não encontrado
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          O e-mail e o código precisam bater exatamente. Verifique se o assinante colou
          o código completo (formato <code>PC-XXXX-XXXX-XXXX</code>) e usou o mesmo
          e-mail do cadastro.
        </p>
      </div>
    );
  }

  if (state.kind === "expired") {
    return (
      <div className={`${shell} border-warning/40 bg-warning/5`}>
        <div className="flex items-center gap-2 font-medium text-warning dark:text-warning">
          <Clock className="h-4 w-4" /> Código expirado
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Este código expirou em <strong>{fmt(state.expiresAt)}</strong>. Códigos são
          válidos por 24 horas após o envio. Gere um novo em <em>Assinantes → Reenviar código</em>.
        </p>
      </div>
    );
  }

  if (state.kind === "already_used") {
    return (
      <div className={`${shell} border-primary/40 bg-primary/5`}>
        <div className="flex items-center gap-2 font-medium text-primary dark:text-primary">
          <XCircle className="h-4 w-4" /> Código já utilizado
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Este código foi consumido em <strong>{fmt(state.usedAt)}</strong>. Ele só pode ser
          usado uma única vez — se o assinante perdeu o acesso, gere um novo código.
        </p>
      </div>
    );
  }

  if (state.kind === "lookup_error" || state.kind === "update_error") {
    return (
      <div className={`${shell} border-destructive/40 bg-destructive/5`}>
        <div className="flex items-center gap-2 font-medium text-destructive dark:text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {state.kind === "lookup_error"
            ? "Erro ao consultar o banco"
            : "Erro ao marcar código como usado"}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Tente novamente em instantes. Se persistir, verifique os logs em
          <em> Pagamentos & Webhooks</em>.
        </p>
      </div>
    );
  }

  return (
    <div className={`${shell} border-destructive/40 bg-destructive/5`}>
      <div className="flex items-center gap-2 font-medium text-destructive dark:text-destructive">
        <AlertTriangle className="h-4 w-4" /> Falha na verificação
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{state.message}</p>
    </div>
  );
}


function NewSubscriberDialog() {
  const { plans, integrations } = useAdmin();
  const active = plans.filter((p) => p.active);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState(active[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const issue = useServerFn(issueActivationCode);

  const submit = async () => {
    if (!name || !email || !planId) { toast.error("Preencha todos os campos"); return; }
    const plan = plans.find((p) => p.id === planId);
    if (!plan) { toast.error("Plano inválido"); return; }
    setSending(true);
    const sub = admin.createSubscription({ name, email, planId });
    try {
      const res = await issue({ data: {
        email, name, planId, planName: plan.name, days: plan.days,
        isTrial: plan.cycle === "trial", subscriptionId: sub.id,
        fromEmail: integrations.email.fromEmail, fromName: integrations.email.fromName,
      }});
      if (res.sent) toast.success(`Código enviado para ${email} (expira em 24h)`);
      else toast.warning(`Assinatura criada. E-mail falhou: ${res.error ?? "verifique o domínio"}. Código: ${res.code}`);
    } catch (e) {
      toast.error(`Assinatura criada, mas envio falhou: ${e instanceof Error ? e.message : "erro"}`);
    } finally {
      setSending(false);
      setName(""); setEmail(""); setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova assinatura</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova assinatura</DialogTitle>
          <DialogDescription>O código de ativação será enviado automaticamente para o e-mail informado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {active.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.price === 0 ? "Grátis" : p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ({p.days}d)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={submit} disabled={sending}><Key className="mr-2 h-4 w-4" />{sending ? "Enviando..." : "Gerar código e enviar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Emails -------------------- */

function EmailsTab() {
  const { emails } = useAdmin();

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl">E-mails enviados</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhum e-mail enviado ainda.</TableCell></TableRow>}
              {emails.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.sentAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{e.to}</TableCell>
                  <TableCell>{e.subject}</TableCell>
                  <TableCell><Badge variant="outline">{e.type}</Badge></TableCell>
                  <TableCell><Badge>{e.status}</Badge></TableCell>
                  <TableCell>
                    <Sheet>
                      <SheetTrigger asChild><Button size="sm" variant="ghost">Ver</Button></SheetTrigger>
                      <SheetContent className="w-full max-w-lg">
                        <SheetHeader>
                          <SheetTitle>{e.subject}</SheetTitle>
                          <SheetDescription>Para {e.to}</SheetDescription>
                        </SheetHeader>
                        <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs">{e.body}</pre>
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- Status assinaturas -------------------- */

const CYCLE_FILTERS: Array<{ id: "all" | BillingCycle; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "trial", label: "Teste grátis" },
  { id: "monthly", label: "Mensal" },
  { id: "semester", label: "Semestral" },
  { id: "yearly", label: "Anual" },
];

function StatusTab() {
  const { subscribers, plans, integrations } = useAdmin();
  const [filter, setFilter] = useState<"all" | BillingCycle>("all");
  const now = Date.now();

  const rows = useMemo(() => {
    return subscribers
      .map((s) => {
        const plan = plans.find((p) => p.id === s.planId);
        const total = plan ? plan.days * 24 * 60 * 60 * 1000 : 0;
        const remaining = Math.max(0, new Date(s.expiresAt).getTime() - now);
        const elapsed = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 1;
        const daysLeft = Math.ceil(remaining / (24 * 60 * 60 * 1000));
        return { s, plan, total, remaining, elapsed, daysLeft };
      })
      .filter((r) => (filter === "all" ? true : r.plan?.cycle === filter))
      .sort((a, b) => a.remaining - b.remaining);
  }, [subscribers, plans, filter, now]);

  const expiringSoon = rows.filter((r) => r.daysLeft <= 7 && r.s.status !== "canceled");

  function generateSandboxCharge(subId: string) {
    if (!integrations.mercadoPago.enabled || !integrations.mercadoPago.accessToken) {
      toast.error("Configure o Mercado Pago primeiro", {
        description: "Preencha Access Token e ative a integração em Integrações & IA.",
      });
      return;
    }
    const code = `MP-SANDBOX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    toast.success("Cobrança sandbox gerada", {
      description: `${code} — em modo real (com Cloud ativo) o link Pix/cartão seria enviado ao assinante ${subId.slice(0, 6)}.`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">Status de assinaturas</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe a validade dos ciclos de 30 dias, 6 meses e 1 ano. Filtros por tipo de plano.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {CYCLE_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <p className="font-medium">
                {expiringSoon.length} assinatura{expiringSoon.length > 1 ? "s" : ""} expiram em até 7 dias
              </p>
              <p className="text-xs text-muted-foreground">
                Envie um lembrete ou gere uma nova cobrança de renovação.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assinante</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma assinatura {filter === "all" ? "cadastrada" : `no ciclo ${filter}`}.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ s, plan, elapsed, daysLeft }) => {
                const isExpired = daysLeft <= 0 || s.status === "expired";
                const isCanceled = s.status === "canceled";
                const barTone = isCanceled
                  ? "bg-muted-foreground"
                  : isExpired
                    ? "bg-destructive"
                    : daysLeft <= 7
                      ? "bg-destructive"
                      : daysLeft <= 30
                        ? "bg-warning"
                        : "bg-savings";
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </TableCell>
                    <TableCell>{plan?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {plan ? cycleLabel[plan.cycle] : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={isExpired ? "text-destructive" : ""}>
                          {isCanceled
                            ? "Cancelada"
                            : isExpired
                              ? "Expirada"
                              : `${daysLeft} dia${daysLeft === 1 ? "" : "s"}`}
                        </span>
                        <span className="text-muted-foreground">
                          · {formatShortDate(s.expiresAt)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${barTone}`}
                          style={{ width: `${Math.round(elapsed * 100)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "active"
                            ? "default"
                            : s.status === "trial"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          admin.resendCode(s.id);
                          toast.success("Lembrete enviado");
                        }}
                      >
                        <Mail className="mr-1 h-3 w-3" /> lembrar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateSandboxCharge(s.id)}
                      >
                        <CreditCard className="mr-1 h-3 w-3" /> cobrar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cobranças em modo sandbox são simuladas no navegador. Envio real por webhook e Pix/cartão exige Lovable Cloud ativo.
      </p>
    </div>
  );
}

// ============================================================
// Webhooks & Pagamentos — dados reais do Postgres
// ============================================================

interface WebhookEventRow {
  id: string;
  provider: string;
  event_type: string | null;
  external_id: string | null;
  status: string;
  signature_valid: boolean;
  error: string | null;
  subscriber_id: string | null;
  attempts: number;
  last_processed_at: string | null;
  created_at: string;
  payload: unknown;
}

interface SubscriberRow {
  id: string;
  name: string;
  email: string;
  plan_id: string | null;
  status: string;
  expires_at: string | null;
  email_sent: boolean;
  payment_id: string | null;
  created_at: string;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    processed: "bg-savings/15 text-savings",
    active: "bg-savings/15 text-savings",
    received: "bg-primary/15 text-primary",
    skipped: "bg-muted text-muted-foreground",
    failed: "bg-destructive/15 text-destructive",
    expired: "bg-warning/15 text-warning",
    canceled: "bg-muted text-muted-foreground",
    trial: "bg-primary/15 text-primary",
    pending: "bg-warning/15 text-warning",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function WebhooksTab() {
  const loadEvents = useServerFn(listWebhookEvents);
  const loadSubs = useServerFn(listSubscribers);
  const loadStatus = useServerFn(getIntegrationsStatus);
  const reprocess = useServerFn(reprocessWebhookEvent);

  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [subs, setSubs] = useState<SubscriberRow[]>([]);
  const [status, setStatus] = useState<{
    mercadoPago: { accessTokenConfigured: boolean; webhookSecretConfigured: boolean };
    email: { lovableApiKey: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WebhookEventRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [e, s, st] = await Promise.all([loadEvents(), loadSubs(), loadStatus()]);
      setEvents(e as WebhookEventRow[]);
      setSubs(s as SubscriberRow[]);
      setStatus(st);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [loadEvents, loadSubs, loadStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleReprocess(id: string) {
    setReprocessingId(id);
    try {
      const result = await reprocess({ data: { id } });
      if (result.status === "processed") toast.success("Evento reprocessado com sucesso");
      else if (result.status === "skipped") toast.message("Evento ignorado", { description: result.reason });
      else toast.error(`Falha: ${result.reason ?? "erro"}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reprocessar");
    } finally {
      setReprocessingId(null);
    }
  }

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/mercadopago/webhook`
      : "/api/public/mercadopago/webhook";

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Mercado Pago</CardTitle>
          <CardDescription>
            Cole a URL do webhook abaixo no painel do Mercado Pago e cadastre os
            segredos <code>MP_ACCESS_TOKEN</code> e <code>MP_WEBHOOK_SECRET</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                void navigator.clipboard.writeText(webhookUrl);
                toast.success("URL copiada");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <StatusFlag label="Access token" ok={!!status?.mercadoPago.accessTokenConfigured} />
            <StatusFlag label="Webhook secret" ok={!!status?.mercadoPago.webhookSecretConfigured} />
            <StatusFlag label="E-mail (Lovable)" ok={!!status?.email.lovableApiKey} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Assinaturas ativas ({subs.length})</CardTitle>
            <CardDescription>Sincronizadas pelo webhook do Mercado Pago.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assinante</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>E-mail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </TableCell>
                      <TableCell>{s.plan_id ?? "-"}</TableCell>
                      <TableCell><StatusPill status={s.status} /></TableCell>
                      <TableCell className="text-sm">
                        {formatShortDate(s.expires_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.payment_id ?? "-"}</TableCell>
                      <TableCell>
                        {s.email_sent ? (
                          <Badge variant="outline">enviado</Badge>
                        ) : (
                          <Badge variant="destructive">pendente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log de eventos ({events.length})</CardTitle>
          <CardDescription>
            Últimos 200 eventos recebidos pelo webhook. Você pode reprocessar qualquer evento
            que falhou.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum evento recebido ainda. Configure o webhook no Mercado Pago para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>ID externo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assinatura</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-xs">
                        {new Date(ev.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">{ev.event_type ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{ev.external_id ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusPill status={ev.status} />
                          {!ev.signature_valid && (
                            <span className="text-[11px] text-destructive">assinatura inválida</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        {ev.subscriber_id ? ev.subscriber_id.slice(0, 8) : "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm">{ev.attempts}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                        {ev.error ?? ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setDetail(ev)}>
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleReprocess(ev.id)}
                            disabled={reprocessingId === ev.id || !ev.external_id}
                          >
                            <RefreshCw className={`mr-1 h-3 w-3 ${reprocessingId === ev.id ? "animate-spin" : ""}`} />
                            Reprocessar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payload do evento</DialogTitle>
            <DialogDescription>
              {detail?.event_type ?? "evento"} — {detail?.created_at ? new Date(detail.created_at).toLocaleString("pt-BR") : ""}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-3 text-xs">
            {detail ? JSON.stringify(detail.payload, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusFlag({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${ok ? "border-savings/40 bg-savings/5" : "border-destructive/40 bg-destructive/5"}`}>
      <span className="text-sm">{label}</span>
      <span className={`text-xs font-semibold ${ok ? "text-savings" : "text-destructive"}`}>
        {ok ? "OK" : "faltando"}
      </span>
    </div>
  );
}

type SortKey = "email" | "createdAt" | "lastSignInAt" | "roles";
type SortDir = "asc" | "desc";

function UsersTab() {
  const list = useServerFn(listUsersWithRoles);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const [users, setUsers] = useState<UserWithRoles[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState<null | {
    user: UserWithRoles;
    role: "admin" | "moderator";
    hasIt: boolean;
  }>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await list();
      setUsers(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    const base = !q ? users : users.filter((u) => (u.email ?? "").toLowerCase().includes(q));
    const sorted = [...base].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "email":
          return (a.email ?? "").localeCompare(b.email ?? "") * dir;
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        case "lastSignInAt": {
          const av = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
          const bv = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
          return (av - bv) * dir;
        }
        case "roles":
          return (a.roles.length - b.roles.length) * dir;
      }
    });
    return sorted;
  }, [users, query, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [query, sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const runToggle = async () => {
    if (!confirm) return;
    const { user, role, hasIt } = confirm;
    const key = `${user.id}:${role}`;
    setBusy(key);
    try {
      if (hasIt) {
        await revoke({ data: { userId: user.id, role } });
        toast.success(`Papel "${role}" removido de ${user.email}`);
      } else {
        await grant({ data: { userId: user.id, role } });
        toast.success(`Papel "${role}" concedido a ${user.email}`);
      }
      setConfirm(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar papel");
    } finally {
      setBusy(null);
    }
  };

  const permsFor = (role: "admin" | "moderator") =>
    role === "admin"
      ? [
          "Acesso total ao painel administrativo (/admin)",
          "Gerenciar planos, integrações, webhooks e assinantes",
          "Conceder e revogar papéis de outros usuários",
          "Emitir e verificar códigos de ativação",
        ]
      : [
          "Acesso a áreas de moderação (quando disponíveis)",
          "Não pode gerenciar papéis nem integrações",
        ];

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      <ArrowUpDown className={"h-3 w-3 " + (sortKey === k ? "text-foreground" : "text-muted-foreground")} />
    </button>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Usuários & Papéis</CardTitle>
              <CardDescription>
                Gerencie quem tem acesso ao painel administrativo. O dono do sistema ({OWNER_EMAIL}) está sempre protegido.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por e-mail…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
                <RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !users ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando usuários…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortBtn label="E-mail" k="email" /></TableHead>
                    <TableHead><SortBtn label="Cadastro" k="createdAt" /></TableHead>
                    <TableHead><SortBtn label="Último acesso" k="lastSignInAt" /></TableHead>
                    <TableHead><SortBtn label="Papéis" k="roles" /></TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((u) => {
                    const isOwner = (u.email ?? "").toLowerCase() === OWNER_EMAIL.toLowerCase();
                    const hasAdmin = u.roles.includes("admin");
                    const hasMod = u.roles.includes("moderator");
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email ?? "—"}
                          {isOwner && (
                            <Badge className="ml-2" variant="secondary">
                              <ShieldCheck className="mr-1 h-3 w-3" /> Dono
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatShortDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString("pt-BR") : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 && (
                              <span className="text-xs text-muted-foreground">Sem papel</span>
                            )}
                            {u.roles.map((r) => (
                              <Badge key={r} variant={r === "admin" ? "default" : "outline"}>{r}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant={hasAdmin ? "destructive" : "default"}
                              disabled={busy === `${u.id}:admin` || (isOwner && hasAdmin)}
                              onClick={() => setConfirm({ user: u, role: "admin", hasIt: hasAdmin })}
                            >
                              {busy === `${u.id}:admin` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : hasAdmin ? "Remover admin" : "Tornar admin"}
                            </Button>
                            <Button
                              size="sm"
                              variant={hasMod ? "outline" : "secondary"}
                              disabled={busy === `${u.id}:moderator`}
                              onClick={() => setConfirm({ user: u, role: "moderator", hasIt: hasMod })}
                            >
                              {busy === `${u.id}:moderator` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : hasMod ? "Remover mod" : "Tornar mod"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Itens por página:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
                  <Button
                    variant="outline" size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {confirm.hasIt ? (
                    <><ShieldAlert className="h-5 w-5 text-destructive" /> Revogar papel "{confirm.role}"</>
                  ) : (
                    <><ShieldCheck className="h-5 w-5 text-primary" /> Conceder papel "{confirm.role}"</>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Você está prestes a {confirm.hasIt ? "remover" : "conceder"} o papel{" "}
                  <strong>{confirm.role}</strong> para <strong>{confirm.user.email}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border bg-muted/40 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {confirm.hasIt ? "Permissões que serão removidas" : "Permissões que serão concedidas"}
                </p>
                <ul className="space-y-1 text-sm">
                  {permsFor(confirm.role).map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
                <Button
                  variant={confirm.hasIt ? "destructive" : "default"}
                  onClick={runToggle}
                  disabled={busy !== null}
                >
                  {busy !== null ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Confirmar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditTab() {
  const listAudit = useServerFn(listRoleAuditLog);
  const [rows, setRows] = useState<RoleAuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAudit();
      setRows(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar auditoria");
    } finally {
      setLoading(false);
    }
  }, [listAudit]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.actorEmail ?? "").toLowerCase().includes(q) ||
        (r.targetEmail ?? "").toLowerCase().includes(q) ||
        r.role.includes(q) ||
        r.action.includes(q),
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [query]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico de alterações de papéis
            </CardTitle>
            <CardDescription>
              Registro completo de concessões e revogações de <code>admin</code> e <code>moderator</code>.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filtrar por e-mail, papel ou ação…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-72"
            />
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              <RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !rows ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum registro de auditoria encontrado.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Usuário afetado</TableHead>
                  <TableHead>Executado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.action === "grant" ? "default" : "destructive"}>
                        {r.action === "grant" ? "Concedido" : "Revogado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.role === "admin" ? "default" : "outline"}>{r.role}</Badge>
                    </TableCell>
                    <TableCell>{r.targetEmail ?? r.targetUserId}</TableCell>
                    <TableCell className="text-muted-foreground">{r.actorEmail ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Página {currentPage} de {totalPages}</span>
                <Button
                  variant="outline" size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------- Establishments -------------------- */

function LogoUploadField({
  current,
  onChange,
  onExtracted,
}: {
  current: string;
  onChange: (url: string) => void;
  onExtracted?: (data: LogoExtract) => void;
}) {
  const upload = useServerFn(uploadImageDataUrl);
  const extract = useServerFn(extractLogoDetails);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastDataUrl, setLastDataUrl] = useState<string | null>(null);

  const runExtract = async (dataUrl: string) => {
    if (!onExtracted) return;
    setAnalyzing(true);
    try {
      const result = await extract({ data: { image: dataUrl } });
      onExtracted(result);
      const filled = [
        result.name && "nome",
        result.kind && "tipo",
        result.brandColor && "cor",
        result.notes && "segmento",
      ].filter(Boolean);
      if (filled.length > 0) {
        toast.success(`IA preencheu: ${filled.join(", ")}`);
      } else {
        toast.message("IA não identificou informações claras na logo.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao analisar logo");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter até 2 MB");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("Falha ao ler arquivo"));
        fr.readAsDataURL(file);
      });
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { publicUrl } = await upload({ data: { bucket: "logos", path, dataUrl } });
      onChange(publicUrl);
      setLastDataUrl(dataUrl);
      toast.success("Logomarca enviada");
      // Extração automática após upload
      void runExtract(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Logomarca</Label>
      <div className="flex items-center gap-3">
        {current ? (
          <img
            src={current}
            alt="logo"
            className="h-16 w-16 rounded-md border object-contain bg-muted/30"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            sem logo
          </div>
        )}
        <div className="flex-1 space-y-2">
          <Input
            type="file"
            accept="image/*"
            disabled={busy || analyzing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div className="flex items-center gap-2">
            {current && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                Remover
              </Button>
            )}
            {onExtracted && (current || lastDataUrl) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={analyzing}
                onClick={() => {
                  const src = lastDataUrl ?? current;
                  if (src) void runExtract(src);
                }}
              >
                {analyzing ? (
                  <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Analisando…</>
                ) : (
                  <><Sparkles className="mr-2 h-3 w-3" /> Analisar com IA</>
                )}
              </Button>
            )}
          </div>
          {onExtracted && (
            <p className="text-xs text-muted-foreground">
              A IA lê a logo e preenche automaticamente nome, tipo, segmento e cor de marca.
            </p>
          )}
        </div>
      </div>
      <LogoQualityPanel src={current || lastDataUrl} name="Prévia" />
    </div>
  );
}




const kindLabel: Record<EstablishmentKind, string> = {
  mercado: "Mercado",
  atacado: "Atacado",
  hortifruti: "Hortifruti",
  farmacia: "Farmácia",
  conveniencia: "Conveniência",
  outro: "Outro",
};

type EstablishmentForm = {
  id?: string;
  name: string;
  cnpj: string;
  ie: string;
  kind: EstablishmentKind;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  logoUrl: string;
  brandColor: string;
  latitude: string;
  longitude: string;
  notes: string;
  active: boolean;
};

const emptyForm: EstablishmentForm = {
  name: "",
  cnpj: "",
  ie: "",
  kind: "mercado",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  logoUrl: "",
  brandColor: "",
  latitude: "",
  longitude: "",
  notes: "",
  active: true,
};

function toForm(e: Establishment): EstablishmentForm {
  return {
    id: e.id,
    name: e.name,
    cnpj: e.cnpj ?? "",
    ie: e.ie ?? "",
    kind: e.kind,
    address: e.address ?? "",
    neighborhood: e.neighborhood ?? "",
    city: e.city,
    state: e.state,
    zip: e.zip ?? "",
    phone: e.phone ?? "",
    logoUrl: e.logoUrl ?? "",
    brandColor: e.brandColor ?? "",
    latitude: e.latitude != null ? String(e.latitude) : "",
    longitude: e.longitude != null ? String(e.longitude) : "",
    notes: e.notes ?? "",
    active: e.active,
  };
}

function EstablishmentsTab() {
  const qc = useQueryClient();
  const { confirm: _confirm } = useConfirm(); void _confirm;
  const list = useServerFn(listEstablishments);
  const save = useServerFn(saveEstablishment);
  const remove = useServerFn(deleteEstablishment);
  const toggle = useServerFn(toggleEstablishmentActive);

  const [items, setItems] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EstablishmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await list();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => { void load(); }, [load]);
  useAdminEntitiesRealtime(
    () => { void load(); },
    {
      tables: ["establishments"],
      channelKey: "admin-tab-establishments",
      onEvent: (payload) => {
        const info = describeRealtimeChange(payload);
        toast.info(info.title, { description: info.description });
      },
    },
  );




  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) =>
      [e.name, e.city, e.state, e.neighborhood ?? "", e.cnpj ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [items, filter]);

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  useEffect(() => { setPage(1); }, [filter, pageSize]);
  const paged = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rowPad = density === "compact" ? "[&_th]:h-9 [&_th]:py-1.5 [&_td]:py-1.5" : "[&_th]:h-10 [&_th]:py-2.5 [&_td]:py-2.5";
  const rowText = density === "compact" ? "text-[13px]" : "text-sm";


  const openNew = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (e: Establishment) => { setForm(toForm(e)); setOpen(true); };

  const submit = async () => {
    setSaving(true);
    try {
      await save({
        data: {
          id: form.id,
          name: form.name,
          cnpj: form.cnpj || null,
          ie: form.ie || null,
          kind: form.kind,
          address: form.address || null,
          neighborhood: form.neighborhood || null,
          city: form.city,
          state: form.state,
          zip: form.zip || null,
          phone: form.phone || null,
          logoUrl: form.logoUrl || null,
          brandColor: form.brandColor || null,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          notes: form.notes || null,
          active: form.active,
        },
      });
      toast.success(form.id ? "Estabelecimento atualizado" : "Estabelecimento cadastrado");
      setOpen(false);
      await load();
      qc.invalidateQueries({ queryKey: ["establishments"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (id: string) => setPendingDeleteId(id);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await remove({ data: { id } });
      toast.success("Estabelecimento removido");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  };


  const onToggle = async (e: Establishment) => {
    try {
      await toggle({ data: { id: e.id, active: !e.active } });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    }
  };

  return (
    <div className="space-y-3">
      {/* Cabeçalho compacto: título à esquerda, ferramentas colapsáveis à direita */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className={cn(tc.h2, "truncate font-serif")}>Estabelecimentos da cidade</h2>
          <p className={cn(tc.meta, "truncate")}>
            Cadastre mercados e atacados. Produtos são vinculados depois.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 w-40 sm:w-48 md:w-56"
          />
          <Select value={density} onValueChange={(v) => setDensity(v as "compact" | "comfortable")}>
            <SelectTrigger className="h-8 w-[112px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Densa</SelectItem>
              <SelectItem value="comfortable">Confortável</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[92px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10/pág</SelectItem>
              <SelectItem value="25">25/pág</SelectItem>
              <SelectItem value="50">50/pág</SelectItem>
              <SelectItem value="0">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-2">
                <MoreHorizontal className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Atalhos</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Registro de preços</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link to="/admin/cupom">Cupom fiscal</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/admin/cupom-lote">Cupons em lote</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/precos">Histórico de preços</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Curadoria</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link to="/admin/reports">Reportes de preço</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/admin/icones-categoria">Ícones de categoria</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/admin/ia">Configurações de IA</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8" onClick={openNew}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum estabelecimento cadastrado ainda.
            </div>
          ) : (
            <>
              <div className="max-h-[calc(100dvh-320px)] min-h-[240px] overflow-auto">
                <Table className={cn(rowText, rowPad)}>
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                    <TableRow>
                      <TableHead className="min-w-[180px]">Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Tipo</TableHead>
                      <TableHead className="hidden lg:table-cell">Cidade / UF</TableHead>
                      <TableHead className="hidden xl:table-cell">Bairro</TableHead>
                      <TableHead className="hidden xl:table-cell">Telefone</TableHead>
                      <TableHead className="w-16 text-center">Ativo</TableHead>
                      <TableHead className="w-28 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="max-w-[240px]">
                          <div className="truncate font-medium">{e.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground md:hidden">
                            {kindLabel[e.kind]} · {e.city}/{e.state}
                            {e.neighborhood ? ` · ${e.neighborhood}` : ""}
                          </div>
                          {e.cnpj && <div className="hidden text-[11px] text-muted-foreground md:block">{e.cnpj}</div>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-[11px]">{kindLabel[e.kind]}</Badge>
                        </TableCell>
                        <TableCell className="hidden truncate lg:table-cell">{e.city} / {e.state}</TableCell>
                        <TableCell className="hidden truncate xl:table-cell">{e.neighborhood ?? "—"}</TableCell>
                        <TableCell className="hidden truncate xl:table-cell">{e.phone ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={e.active} onCheckedChange={() => onToggle(e)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(e)}>Editar</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(e.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
                <span>
                  {pageSize === 0
                    ? `${filtered.length} de ${filtered.length}`
                    : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length}`}
                </span>
                {pageSize !== 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="px-2">Pág. {currentPage}/{totalPages}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>

      </Card>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar estabelecimento" : "Novo estabelecimento"}</DialogTitle>
            <DialogDescription>
              Cadastro que aparecerá no mapa e ao vincular preços de produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Nome*</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Tipo*</Label>
              <Select value={form.kind} onValueChange={(v: EstablishmentKind) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(kindLabel) as EstablishmentKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{kindLabel[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <Label>Inscrição Estadual</Label>
              <Input value={form.ie} onChange={(e) => setForm({ ...form, ie: e.target.value })} placeholder="isento ou nº" />
            </div>
            <div className="md:col-span-2">
              <LogoUploadField
                current={form.logoUrl}
                onChange={(url) => setForm({ ...form, logoUrl: url })}
                onExtracted={(ai) =>
                  setForm((prev) => ({
                    ...prev,
                    name: prev.name.trim() ? prev.name : ai.name ?? prev.name,
                    kind: prev.kind !== "mercado" ? prev.kind : ai.kind ?? prev.kind,
                    brandColor: prev.brandColor ? prev.brandColor : ai.brandColor ?? prev.brandColor,
                    notes: prev.notes.trim() ? prev.notes : ai.notes ?? prev.notes,
                  }))
                }
              />

            </div>
            <div className="md:col-span-2">
              <Label>Cor de identificação da estabelecimento</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Usada para destacar o estabelecimento nas listas de comparação de preços.
                Deixe em branco para gerar automaticamente a partir do nome.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  aria-label="Cor de marca"
                  value={
                    form.brandColor && /^#[0-9A-Fa-f]{6}$/.test(form.brandColor)
                      ? form.brandColor
                      : getStoreColor(form.name || "Estabelecimento", null)
                  }
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border border-border bg-background p-1"
                />
                <Input
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  placeholder="#RRGGBB (opcional)"
                  className="w-40"
                  maxLength={7}
                />
                {form.brandColor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, brandColor: "" })}
                  >
                    Usar automática
                  </Button>
                )}
                <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
                  <StoreBadge
                    name={form.name || "Estabelecimento"}
                    logoUrl={form.logoUrl || null}
                    brandColor={form.brandColor || null}
                    size="md"
                  />
                  <span className="text-sm font-medium">
                    {form.name || "Prévia"}
                  </span>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
            <div>
              <Label>Cidade*</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>UF*</Label>
              <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Latitude</Label>
              <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo (visível ao público)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EstablishmentDeleteDialog
        open={pendingDeleteId !== null}
        establishmentId={pendingDeleteId}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}






