import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import {
  getAiAdminConfig,
  updateAiSettings,
  setPlanAiQuota,
} from "@/lib/ai-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin_/ia")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Configurações de IA — Admin | Preço Certo" },
      {
        name: "description",
        content:
          "Ajuste a cota mensal de perguntas à IA por plano, a cota padrão e as regras de acesso ao assistente.",
      },
      { property: "og:title", content: "Configurações de IA — Admin | Preço Certo" },
      {
        property: "og:description",
        content: "Cotas de IA por plano e regras de acesso ao assistente do Preço Certo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AiAdminGate,
});

function AiAdminGate() {
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
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sem permissão</CardTitle>
            <CardDescription>Esta página é exclusiva para administradores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/admin">Voltar ao painel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <AiAdminPage />;
}

function AiAdminPage() {
  const fetchConfig = useServerFn(getAiAdminConfig);
  const saveSettings = useServerFn(updateAiSettings);
  const savePlan = useServerFn(setPlanAiQuota);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-admin-config"],
    queryFn: () => fetchConfig(),
  });

  const [defaultQuota, setDefaultQuota] = useState("");
  const [requireActivePlan, setRequireActivePlan] = useState(true);
  const [allowTrial, setAllowTrial] = useState(false);
  const [assistantEnabled, setAssistantEnabled] = useState(true);
  const [thresholds, setThresholds] = useState("");
  const [planQuotas, setPlanQuotas] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setDefaultQuota(String(data.settings.defaultQuota));
    setRequireActivePlan(data.settings.requireActivePlan);
    setAllowTrial(data.settings.allowTrial);
    setAssistantEnabled(data.settings.assistantEnabled);
    setThresholds(data.settings.warnThresholds.join(", "));
    setPlanQuotas(
      Object.fromEntries(data.plans.map((p) => [p.id, String(p.aiMonthlyQuota)])),
    );
  }, [data]);

  const settingsMut = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          defaultQuota: Number(defaultQuota) || 0,
          requireActivePlan,
          allowTrial,
          assistantEnabled,
          warnThresholds: thresholds
            .split(/[,\s]+/)
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n) && n > 0),
        },
      }),
    onSuccess: () => {
      toast.success("Regras de IA atualizadas");
      qc.invalidateQueries({ queryKey: ["ai-admin-config"] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const planMut = useMutation({
    mutationFn: (v: { planId: string; quota: number }) => savePlan({ data: v }),
    onSuccess: () => {
      toast.success("Cota do plano atualizada");
      qc.invalidateQueries({ queryKey: ["ai-admin-config"] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Painel
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">
              Configurações de IA
            </h1>
            <p className="text-xs text-muted-foreground">
              Cotas por plano, cota padrão, avisos e regras de acesso — sem alterar código.
            </p>
          </div>
        </div>

        <AiUsageObservabilityPanel />



        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" /> Regras de acesso
                </CardTitle>
                <CardDescription>
                  Define quem pode usar o assistente e a cota de quem não tem plano vinculado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-sm">Assistente de IA ativo</Label>
                    <p className="text-xs text-muted-foreground">
                      Desligue para bloquear todas as perguntas imediatamente.
                    </p>
                  </div>
                  <Switch checked={assistantEnabled} onCheckedChange={setAssistantEnabled} />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-sm">Exigir plano ativo</Label>
                    <p className="text-xs text-muted-foreground">
                      Somente assinantes com assinatura vigente usam a IA.
                    </p>
                  </div>
                  <Switch checked={requireActivePlan} onCheckedChange={setRequireActivePlan} />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-sm">Liberar no período de teste</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite IA durante o trial (usa a cota padrão).
                    </p>
                  </div>
                  <Switch
                    checked={allowTrial}
                    onCheckedChange={setAllowTrial}
                    disabled={!requireActivePlan}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="default-quota" className="text-sm">
                      Cota padrão (perguntas/mês)
                    </Label>
                    <Input
                      id="default-quota"
                      type="number"
                      min={0}
                      value={defaultQuota}
                      onChange={(e) => setDefaultQuota(e.target.value)}
                    />
                    <p className="text-[12.5px] text-muted-foreground">
                      Usada quando o usuário não tem plano resgatado.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="thresholds" className="text-sm">
                      Avisos progressivos (% da cota)
                    </Label>
                    <Input
                      id="thresholds"
                      value={thresholds}
                      onChange={(e) => setThresholds(e.target.value)}
                      placeholder="75, 95"
                    />
                    <p className="text-[12.5px] text-muted-foreground">
                      Ex.: 75, 95 → avisa em 15/20 e 19/20.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => settingsMut.mutate()}
                  disabled={settingsMut.isPending}
                  className="w-full sm:w-auto"
                >
                  {settingsMut.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Salvar regras
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cota de IA por plano</CardTitle>
                <CardDescription>
                  Cada plano tem seu próprio limite mensal de perguntas ao assistente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.plans.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-[140px] flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                        {!p.active && <Badge variant="outline">inativo</Badge>}
                      </div>
                      <p className="text-[12.5px] text-muted-foreground">
                        {p.days} dias · R${" "}
                        {(p.priceCents / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-28"
                      value={planQuotas[p.id] ?? ""}
                      onChange={(e) =>
                        setPlanQuotas((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      aria-label={`Cota de IA do plano ${p.name}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={planMut.isPending}
                      onClick={() =>
                        planMut.mutate({
                          planId: p.id,
                          quota: Number(planQuotas[p.id]) || 0,
                        })
                      }
                    >
                      Salvar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
