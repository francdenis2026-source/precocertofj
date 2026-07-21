import { createFileRoute, Link } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { AppShell } from "@/components/brand/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  Pause,
  RefreshCw,
  ImageIcon,
  Plus,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Globe,
  Clock,
  Upload,
  Zap,
  Trash2,
} from "lucide-react";
import {
  enqueueImageJobs,
  getImageJobStats,
  listImageJobs,
  processNextImageJob,
  retryImageJob,
  retryAllFailedImageJobs,
  cancelPendingImageJobs,
  getImageJobProviderStats,
  type ImageJob,
  type ImageJobStatus,
  type ProviderStats,
} from "@/lib/catalog-image-jobs.functions";
import {
  getImageSearchSettings,
  saveImageSearchSettings,
  type ImageSearchSettings,
} from "@/lib/image-settings.functions";
import {
  enqueueImageRefresh,
  importImagesZip,
} from "@/lib/image-import.functions";

import { AdminOnly } from "@/components/auth/AdminOnly";

export const Route = createFileRoute("/admin_/image-jobs")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Fila de imagens do catálogo — Admin — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <ImageJobsPage />
    </AdminOnly>
  ),
});


function ImageJobsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ImageJobStatus | "all">("all");
  const [running, setRunning] = useState(false);
  const [webOnly, setWebOnly] = useState(true);
  const runningRef = useRef(false);


  const enqueueFn = useServerFn(enqueueImageJobs);
  const statsFn = useServerFn(getImageJobStats);
  const listFn = useServerFn(listImageJobs);
  const processFn = useServerFn(processNextImageJob);
  const retryFn = useServerFn(retryImageJob);
  const retryAllFn = useServerFn(retryAllFailedImageJobs);
  const cancelFn = useServerFn(cancelPendingImageJobs);
  const enqueueRefreshFn = useServerFn(enqueueImageRefresh);
  const providerStatsFn = useServerFn(getImageJobProviderStats);

  const statsQ = useQuery({
    queryKey: ["image-job-stats"],
    queryFn: () => statsFn(),
    refetchInterval: running ? 2000 : 5000,
  });
  const providerStatsQ = useQuery({
    queryKey: ["image-job-provider-stats"],
    queryFn: () => providerStatsFn(),
    refetchInterval: running ? 3000 : 10000,
  });
  const jobsQ = useQuery({
    queryKey: ["image-jobs", statusFilter],
    queryFn: () => listFn({ data: { status: statusFilter, limit: 100 } }),
    refetchInterval: running ? 2000 : 8000,
  });
  // Sempre observa falhas recentes para detectar erros de cota (402/429) mesmo com outro filtro ativo.
  const failedProbeQ = useQuery({
    queryKey: ["image-jobs", "failed-probe"],
    queryFn: () => listFn({ data: { status: "failed", limit: 20 } }),
    refetchInterval: 10000,
  });

  const enqueueM = useMutation({
    mutationFn: () => enqueueFn(),
    onSuccess: (r) => {
      toast.success(`${r.enqueued} produto(s) adicionado(s) à fila`);
      qc.invalidateQueries({ queryKey: ["image-job-stats"] });
      qc.invalidateQueries({ queryKey: ["image-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshM = useMutation({
    mutationFn: (v: { force: boolean; olderThanDays: number }) =>
      enqueueRefreshFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`${r.enqueued} produto(s) enfileirados para re-busca`);
      qc.invalidateQueries({ queryKey: ["image-job-stats"] });
      qc.invalidateQueries({ queryKey: ["image-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const retryM = useMutation({
    mutationFn: (id: string) => retryFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Job reenfileirado");
      qc.invalidateQueries({ queryKey: ["image-jobs"] });
      qc.invalidateQueries({ queryKey: ["image-job-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const retryAllM = useMutation({
    mutationFn: () => retryAllFn(),
    onSuccess: (r) => {
      toast.success(`${r.retried} job(s) reenfileirado(s)`);
      qc.invalidateQueries({ queryKey: ["image-jobs"] });
      qc.invalidateQueries({ queryKey: ["image-job-stats"] });
    },
  });

  const cancelM = useMutation({
    mutationFn: () => cancelFn(),
    onSuccess: (r) => {
      toast.success(`${r.cancelled} pendente(s) cancelado(s)`);
      qc.invalidateQueries({ queryKey: ["image-jobs"] });
      qc.invalidateQueries({ queryKey: ["image-job-stats"] });
    },
  });

  async function startProcessing() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    let consecutiveEmpty = 0;
    while (runningRef.current) {
      try {
        const r = await processFn({ data: { mode: webOnly ? "web" : "web_then_ai" } });

        if (!r.processed) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 2) break;
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
        consecutiveEmpty = 0;
        if (r.error) {
          toast.error(`Falha em job ${r.jobId?.slice(0, 8)}: ${r.error}`);
        }
        qc.invalidateQueries({ queryKey: ["image-job-stats"] });
        qc.invalidateQueries({ queryKey: ["image-jobs"] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao processar");
        break;
      }
    }
    runningRef.current = false;
    setRunning(false);
    toast.info("Processamento pausado");
  }

  function stopProcessing() {
    runningRef.current = false;
    setRunning(false);
  }

  const stats = statsQ.data;
  const totalActive = stats ? stats.pending + stats.processing + stats.done + stats.failed : 0;
  const progressPct =
    totalActive > 0 ? Math.round(((stats!.done + stats!.failed) / totalActive) * 100) : 0;
  
  const failedJobs = (failedProbeQ.data ?? []).filter((j) => j.lastError);
  const gatewayCreditFailedCount = failedJobs.filter((j) =>
    /402|payment_required|not enough credits|insufficient/i.test(j.lastError!),
  ).length;
  const geminiQuotaFailedCount = failedJobs.filter((j) =>
    /429|quota|rate.?limit|exceeded your current quota|RESOURCE_EXHAUSTED/i.test(j.lastError!),
  ).length;
  const lastQuotaError = failedJobs.find((j) =>
    /402|429|quota|payment_required|not enough credits/i.test(j.lastError!),
  )?.lastError;

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl">Fila de imagens do catálogo</h1>
              <p className="text-sm text-muted-foreground">
                Gere, re-busque e importe fotos em lote — com preferências de fonte e agendamento.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/catalogo">Voltar ao Catálogo</Link>
          </Button>
        </header>

        <Tabs defaultValue="queue" className="mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="queue">Fila</TabsTrigger>
            <TabsTrigger value="sources">Fontes</TabsTrigger>
            <TabsTrigger value="schedule">Agendamento</TabsTrigger>
            <TabsTrigger value="import">Importar ZIP</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-6 space-y-6">
            {gatewayCreditFailedCount > 0 && (
              <div
                role="alert"
                className="flex flex-wrap items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
              >
                <Coins className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">
                    AI Gateway sem créditos — {gatewayCreditFailedCount} job(s) travado(s) com{" "}
                    <span className="font-mono text-xs">402 payment_required</span>
                  </p>
                  <p className="text-xs opacity-90">
                    Recarregue créditos em <span className="font-medium">Workspace → Settings → Plans &amp; credits</span>{" "}
                    e clique em <span className="font-medium">Reenfileirar falhas</span> para retomar.
                  </p>
                  {lastQuotaError && (
                    <p className="mt-1 max-w-full truncate font-mono text-[11px] opacity-70">
                      {lastQuotaError.slice(0, 180)}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 bg-background"
                  onClick={() => retryAllM.mutate()}
                  disabled={retryAllM.isPending}
                >
                  {retryAllM.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Reenfileirar falhas
                </Button>
              </div>
            )}
            {geminiQuotaFailedCount > 0 && (
              <div
                role="alert"
                className="flex flex-wrap items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm text-warning dark:text-warning"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">
                    Gemini API com cota esgotada — {geminiQuotaFailedCount} job(s) com{" "}
                    <span className="font-mono text-xs">429 quota exceeded</span>
                  </p>
                  <p className="text-xs opacity-90">
                    A <span className="font-mono">GEMINI_API_KEY</span> atingiu o limite do plano.
                    Aguarde o reset diário, faça upgrade no Google AI Studio, ou remova a chave para
                    o sistema usar o AI Gateway como fallback.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-warning/50 bg-background"
                  onClick={() => retryAllM.mutate()}
                  disabled={retryAllM.isPending}
                >
                  {retryAllM.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Reenfileirar falhas
                </Button>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Estado da fila</CardTitle>
                <CardDescription>
                  Progresso, distribuição por status e estimativa de créditos antes de iniciar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {statsQ.isLoading || !stats ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <Stat label="Pendentes" value={stats.pending} tone="warn" />
                      <Stat label="Processando" value={stats.processing} tone="info" />
                      <Stat label="Concluídos" value={stats.done} tone="ok" />
                      <Stat label="Falhas" value={stats.failed} tone="err" />
                      <Stat label="Cancelados" value={stats.cancelled} />
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-sm">
                      <Coins className="h-4 w-4 text-primary" />
                      {stats.geminiDirectEnabled ? (
                        <>
                          <span className="font-medium">Provider ativo:</span>
                          <span className="font-mono">Gemini direto</span>
                          <span className="text-xs text-muted-foreground">
                            (GEMINI_API_KEY configurada; Gateway não é usado para estes jobs)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">Estimativa de créditos:</span>
                          <span className="font-mono">{stats.estimatedCredits}</span>
                          <span className="text-xs text-muted-foreground">
                            (~2 créditos por imagem × {stats.pending} pendente
                            {stats.pending === 1 ? "" : "s"})
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <ProviderStatsCard data={providerStatsQ.data ?? null} loading={providerStatsQ.isLoading} />


            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
                <CardDescription>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <Switch checked={webOnly} onCheckedChange={setWebOnly} />
                    <Globe className="h-4 w-4" />
                    <span>
                      Modo econômico — buscar só na web (sem gerar por IA).{" "}
                      <span className="text-xs text-muted-foreground">
                        Recomendado quando os créditos do AI Gateway estão baixos.
                      </span>
                    </span>
                  </label>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">

                <Button
                  onClick={() => enqueueM.mutate()}
                  disabled={enqueueM.isPending}
                  variant="secondary"
                >
                  {enqueueM.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Enfileirar sem imagem
                </Button>

                <Button
                  onClick={() => refreshM.mutate({ force: true, olderThanDays: 0 })}
                  disabled={refreshM.isPending}
                  variant="secondary"
                >
                  {refreshM.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Forçar re-busca de TODAS
                </Button>

                <Button
                  onClick={() => refreshM.mutate({ force: true, olderThanDays: 30 })}
                  disabled={refreshM.isPending}
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar imagens antigas (30+ dias)
                </Button>

                {!running ? (
                  <Button onClick={startProcessing} disabled={!stats?.pending}>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar processamento
                  </Button>
                ) : (
                  <Button onClick={stopProcessing} variant="destructive">
                    <Pause className="mr-2 h-4 w-4" />
                    Pausar
                  </Button>
                )}

                <Button
                  onClick={() => retryAllM.mutate()}
                  variant="outline"
                  disabled={!stats?.failed || retryAllM.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Reenfileirar falhas
                </Button>

                <Button
                  onClick={() => cancelM.mutate()}
                  variant="outline"
                  disabled={!stats?.pending || cancelM.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar pendentes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-3">
                <div>
                  <CardTitle>Jobs</CardTitle>
                  <CardDescription>
                    Ordenados por prioridade (produtos com mais leituras primeiro).
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { key: "all", label: "Todos", count: stats ? stats.pending + stats.processing + stats.done + stats.failed + stats.cancelled : null },
                      { key: "pending", label: "Pendentes", count: stats?.pending ?? null },
                      { key: "processing", label: "Em progresso", count: stats?.processing ?? null },
                      { key: "failed", label: "Falharam", count: stats?.failed ?? null },
                      { key: "done", label: "Concluídos", count: stats?.done ?? null },
                      { key: "cancelled", label: "Cancelados", count: stats?.cancelled ?? null },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key as ImageJobStatus | "all")}
                      className={
                        "rounded-full border px-3 py-1 text-xs transition-colors " +
                        (statusFilter === f.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-foreground/30")
                      }
                    >
                      {f.label}
                      {f.count !== null && ` (${f.count})`}
                    </button>
                  ))}
                </div>
                {statusFilter === "failed" && stats?.failed ? (
                  <Button
                    onClick={() => retryAllM.mutate()}
                    disabled={retryAllM.isPending}
                    className="w-full sm:w-auto"
                  >
                    {retryAllM.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Reprocessar {stats.failed} falha{stats.failed === 1 ? "" : "s"} em massa
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {jobsQ.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : (jobsQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum job neste filtro.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {(jobsQ.data ?? []).map((j) => (
                      <JobRow key={j.id} job={j} onRetry={(id) => retryM.mutate(id)} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-6">
            <SourcesPanel />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <SchedulePanel />
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <ImportZipPanel />
          </TabsContent>
        </Tabs>
      </section>
    </AppShell>
  );
}

// ============ Fontes preferidas ============
function SourcesPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getImageSearchSettings);
  const saveFn = useServerFn(saveImageSearchSettings);

  const q = useQuery({ queryKey: ["image-settings"], queryFn: () => getFn() });
  const [draft, setDraft] = useState<string>("");
  const [domains, setDomains] = useState<string[] | null>(null);

  const list = domains ?? q.data?.preferredDomains ?? [];

  const saveM = useMutation({
    mutationFn: (patch: Partial<ImageSearchSettings>) => {
      const merged: ImageSearchSettings = {
        preferredDomains: patch.preferredDomains ?? q.data?.preferredDomains ?? [],
        scheduleEnabled: patch.scheduleEnabled ?? q.data?.scheduleEnabled ?? false,
        scheduleFrequency: patch.scheduleFrequency ?? q.data?.scheduleFrequency ?? "monthly",
        refreshOlderThanDays:
          patch.refreshOlderThanDays ?? q.data?.refreshOlderThanDays ?? 30,
      };
      return saveFn({ data: merged });
    },
    onSuccess: () => {
      toast.success("Preferências salvas");
      qc.invalidateQueries({ queryKey: ["image-settings"] });
      setDomains(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addDomain() {
    const clean = draft.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
      toast.error("Domínio inválido (ex: amazon.com.br)");
      return;
    }
    if (list.includes(clean)) {
      toast.error("Domínio já está na lista");
      return;
    }
    setDomains([...list, clean]);
    setDraft("");
  }

  function removeDomain(d: string) {
    setDomains(list.filter((x) => x !== d));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...list];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setDomains(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Fontes preferidas para busca de imagens
        </CardTitle>
        <CardDescription>
          A IA vai priorizar estes domínios (nesta ordem) ao procurar fotos oficiais dos produtos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="ex: amazon.com.br"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain();
                  }
                }}
              />
              <Button onClick={addDomain} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ol className="space-y-2">
              {list.map((d, idx) => (
                <li
                  key={d}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <Badge variant="outline" className="font-mono text-[10px]">
                    #{idx + 1}
                  </Badge>
                  <span className="flex-1 font-mono text-sm">{d}</span>
                  {idx > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => moveUp(idx)}>
                      ↑
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDomain(d)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
              {list.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sem domínios configurados — a IA usará defaults.
                </p>
              )}
            </ol>

            <div className="flex justify-end">
              <Button
                onClick={() => saveM.mutate({ preferredDomains: list })}
                disabled={saveM.isPending || domains === null}
              >
                {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar preferências
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Agendamento ============
function SchedulePanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getImageSearchSettings);
  const saveFn = useServerFn(saveImageSearchSettings);
  const q = useQuery({ queryKey: ["image-settings"], queryFn: () => getFn() });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [freq, setFreq] = useState<"weekly" | "monthly" | null>(null);
  const [days, setDays] = useState<number | null>(null);

  const eEnabled = enabled ?? q.data?.scheduleEnabled ?? false;
  const eFreq = freq ?? q.data?.scheduleFrequency ?? "monthly";
  const eDays = days ?? q.data?.refreshOlderThanDays ?? 30;

  const saveM = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          preferredDomains: q.data?.preferredDomains ?? [],
          scheduleEnabled: eEnabled,
          scheduleFrequency: eFreq,
          refreshOlderThanDays: eDays,
        },
      }),
    onSuccess: () => {
      toast.success("Agendamento salvo");
      qc.invalidateQueries({ queryKey: ["image-settings"] });
      setEnabled(null);
      setFreq(null);
      setDays(null);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Reprocessamento automático
        </CardTitle>
        <CardDescription>
          Enfileira imagens antigas periodicamente para corrigir fotos desatualizadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium">Agendamento ativo</p>
                <p className="text-xs text-muted-foreground">
                  Quando ligado, o cron chamará automaticamente o endpoint de refresh.
                </p>
              </div>
              <Switch checked={eEnabled} onCheckedChange={setEnabled} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Frequência</Label>
                <div className="mt-1 flex gap-2">
                  {(["weekly", "monthly"] as const).map((f) => (
                    <Button
                      key={f}
                      type="button"
                      variant={eFreq === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFreq(f)}
                    >
                      {f === "weekly" ? "Semanal" : "Mensal"}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="days">Reprocessar imagens com mais de (dias)</Label>
                <Input
                  id="days"
                  type="number"
                  min={0}
                  max={365}
                  value={eDays}
                  onChange={(e) => setDays(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveM.mutate()}
                disabled={
                  saveM.isPending || (enabled === null && freq === null && days === null)
                }
              >
                {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar agendamento
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs">
              <p className="mb-2 font-medium text-foreground">
                📌 Ativação do cron (uma vez, no banco)
              </p>
              <p className="mb-2 text-muted-foreground">
                Para o agendamento realmente disparar, um administrador precisa configurar o{" "}
                <code>pg_cron</code> uma única vez. Peça ao suporte para executar o SQL abaixo
                (ele chama nosso endpoint público conforme a frequência escolhida acima).
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-[11px]">
                {`SELECT cron.schedule(
  'refresh-catalog-images-${eFreq}',
  '${eFreq === "weekly" ? "0 3 * * 0" : "0 3 1 * *"}',
  $$ SELECT net.http_post(
    url:='https://precocerto-fj.lovable.app/api/public/hooks/refresh-catalog-images',
    headers:='{"Content-Type":"application/json","apikey":"<SUPABASE_ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  ); $$
);`}
              </pre>
              <p className="mt-2 text-muted-foreground">
                Frequência: <strong>{eFreq === "weekly" ? "toda semana (dom 03h)" : "todo mês (dia 1, 03h)"}</strong>.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Importar ZIP ============
function ImportZipPanel() {
  const importFn = useServerFn(importImagesZip);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof importFn>> | null>(null);
  const qc = useQueryClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Arquivo maior que 30 MB");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const r = await importFn({ data: { zipBase64: b64 } });
      setResult(r);
      toast.success(`${r.imported} imagens importadas`);
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Importar fotos em lote (ZIP)
        </CardTitle>
        <CardDescription>
          Envie um ZIP com imagens nomeadas por <strong>código de barras</strong>,{" "}
          <strong>ID do produto</strong> ou <strong>slug do nome</strong>. Ex:{" "}
          <code>7891234567890.jpg</code>, <code>abc-123-uuid.png</code>,{" "}
          <code>leite-integral-parmalat-1l.jpg</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="zip">Arquivo ZIP (máx 30 MB)</Label>
          <Input
            id="zip"
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={onFile}
            disabled={busy}
          />
        </div>

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Processando arquivos...
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-lg border border-border bg-card/60 p-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <Stat label="Encontrados" value={result.totalFiles} />
              <Stat label="Importados" value={result.imported} tone="ok" />
              <Stat label="Ignorados" value={result.skipped} tone="warn" />
            </div>
            {result.errors.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  Erros ({result.errors.length})
                </summary>
                <ul className="mt-2 max-h-64 overflow-auto text-xs">
                  {result.errors.slice(0, 100).map((e, i) => (
                    <li key={i} className="border-b border-border py-1">
                      <span className="font-mono">{e.file}</span>: {e.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function statusLabel(s: ImageJobStatus | "all"): string {
  return (
    {
      all: "Todos",
      pending: "Pendente",
      processing: "Processando",
      done: "Concluído",
      failed: "Falha",
      cancelled: "Cancelado",
    } as const
  )[s];
}

function providerLabel(p: string): string {
  return (
    {
      gemini_direct: "Gemini (direto)",
      gemini_direct_search: "Gemini · busca web",
      lovable_gateway: "Lovable Gateway",
      lovable_gateway_search: "Lovable Gateway · busca",
      unknown: "Sem provider registrado",
    } as Record<string, string>
  )[p] ?? p;
}

function providerTone(p: string): "ok" | "info" | "warn" {
  if (p.startsWith("gemini_direct")) return "ok";
  if (p.startsWith("lovable_gateway")) return "info";
  return "warn";
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ProviderStatsCard({
  data,
  loading,
}: {
  data: ProviderStats[] | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Comparativo por provider
        </CardTitle>
        <CardDescription>
          Jobs concluídos e falhos por provider (Gemini direto vs Lovable Gateway), com
          tempo médio e total de tentativas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum job finalizado ainda — os números aparecem após o primeiro
            processamento.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((p) => {
              const successRate =
                p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              const tone = providerTone(p.provider);
              const dot =
                tone === "ok"
                  ? "bg-savings"
                  : tone === "info"
                    ? "bg-primary"
                    : "bg-warning";
              return (
                <div
                  key={p.provider}
                  className="rounded-lg border border-border bg-card/60 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                    <span className="font-medium">{providerLabel(p.provider)}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {p.total} job{p.total === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Sucesso</p>
                      <p className="font-mono text-lg text-savings dark:text-savings">
                        {p.done}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({successRate}%)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                      <p className="font-mono text-lg text-destructive">{p.failed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo médio</p>
                      <p className="font-mono text-base">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {fmtMs(p.avgDurationMs)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tentativas</p>
                      <p className="font-mono text-base">{p.totalAttempts}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "ok" | "err" | "warn" | "info";
}) {
  const color =
    tone === "ok"
      ? "text-savings dark:text-savings"
      : tone === "err"
        ? "text-destructive"
        : tone === "warn"
          ? "text-warning dark:text-warning"
          : tone === "info"
            ? "text-primary dark:text-primary"
            : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={"mt-1 font-mono text-2xl " + color}>{value}</p>
    </div>
  );
}

function JobRow({ job, onRetry }: { job: ImageJob; onRetry: (id: string) => void }) {
  const isCreditError =
    !!job.lastError &&
    /402|payment_required|not enough credits|insufficient/i.test(job.lastError);
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{job.displayName}</span>
          {job.brand && <span className="text-xs text-muted-foreground">{job.brand}</span>}
          <StatusBadge status={job.status} />
          {isCreditError && (
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/10 text-[10px] text-warning dark:text-warning"
            >
              <Coins className="mr-1 h-3 w-3" /> sem créditos
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            prioridade {job.priority}
          </Badge>
          {job.provider && (
            <Badge
              variant="outline"
              className={
                "text-[10px] " +
                (job.provider.startsWith("gemini_direct")
                  ? "border-savings/40 bg-savings/10 text-savings dark:text-savings"
                  : "border-primary/40 bg-primary/10 text-primary dark:text-primary")
              }
            >
              {providerLabel(job.provider)}
            </Badge>
          )}
          {job.durationMs != null && (
            <span className="text-[11px] text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {fmtMs(job.durationMs)}
            </span>
          )}
          {job.attempts > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {job.attempts} tentativa{job.attempts > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {job.lastError && (
          <p
            className={
              "mt-1 flex items-start gap-1 text-xs " +
              (isCreditError ? "text-warning dark:text-warning" : "text-destructive")
            }
          >
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">
              {isCreditError
                ? "Créditos do AI Gateway esgotados — recarregue e clique em Reenfileirar falhas."
                : job.lastError}
            </span>
          </p>
        )}
      </div>
      {(job.status === "failed" || job.status === "cancelled") && (
        <Button size="sm" variant="outline" onClick={() => onRetry(job.id)}>
          <RefreshCw className="mr-1 h-3 w-3" /> Retry
        </Button>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: ImageJobStatus }) {
  if (status === "done")
    return (
      <Badge className="bg-savings/10 text-savings dark:text-savings" variant="outline">
        <CheckCircle2 className="mr-1 h-3 w-3" /> concluído
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" /> falha
      </Badge>
    );
  if (status === "processing")
    return (
      <Badge variant="outline" className="text-primary dark:text-primary">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> processando
      </Badge>
    );
  if (status === "cancelled")
    return <Badge variant="outline">cancelado</Badge>;
  return <Badge variant="secondary">pendente</Badge>;
}
