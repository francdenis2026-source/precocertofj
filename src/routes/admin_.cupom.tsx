import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/brand/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Upload,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Store,
  Sparkles,
  RotateCcw,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useMyRoles } from "@/hooks/useMyRoles";
import { listEstablishments, type Establishment } from "@/lib/establishments.functions";
import {
  createReceiptJob,
  processReceiptJob,
  getReceiptJob,
  confirmReceiptImport,
  cancelReceiptJob,
  type ReceiptJob,
  type ExtractedItem,
} from "@/lib/receipt-jobs.functions";

export const Route = createFileRoute("/admin_/cupom")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Registrar cupom fiscal — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Navigate to="/admin/promocoes" search={{ tab: "cupons" } as never} replace />,
});

type ItemDraft = ExtractedItem & { selected: boolean };

const digitsOnly = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function CupomPage() {
  const { user, loading, isAdmin } = useMyRoles();
  const navigate = useNavigate();
  const listEstab = useServerFn(listEstablishments);
  const createJob = useServerFn(createReceiptJob);
  const processJob = useServerFn(processReceiptJob);
  const getJob = useServerFn(getReceiptJob);
  const confirmImport = useServerFn(confirmReceiptImport);
  const cancelJob = useServerFn(cancelReceiptJob);

  const [estabs, setEstabs] = useState<Establishment[]>([]);
  const [imageData, setImageData] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ReceiptJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<ItemDraft[]>([]);
  const [establishmentId, setEstablishmentId] = useState<string>("");
  const [createNew, setCreateNew] = useState(false);
  const [newEst, setNewEst] = useState({
    name: "",
    cnpj: "",
    address: "",
    city: "",
    state: "",
    phone: "",
  });
  const [couponNumber, setCouponNumber] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [total, setTotal] = useState<string>("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    void listEstab()
      .then(setEstabs)
      .catch(() => setEstabs([]));
  }, [isAdmin, listEstab]);

  // Polling
  useEffect(() => {
    if (!jobId) return;
    const tick = async () => {
      try {
        const j = await getJob({ data: { jobId } });
        setJob(j);
        if (j.status === "ready_for_review" || j.status === "done" || j.status === "failed" || j.status === "cancelled") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    void tick();
    pollRef.current = setInterval(tick, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, getJob]);

  // Hidrata form quando job fica pronto
  useEffect(() => {
    if (job?.status === "ready_for_review" && job.extract && items.length === 0) {
      setItems(job.extract.items.map((it) => ({ ...it, selected: !it.duplicateOfScanId })));
      setCouponNumber(job.extract.couponNumber ?? "");
      setAccessKey(job.extract.accessKey ?? "");
      setIssuedAt(job.extract.issuedAt ? job.extract.issuedAt.slice(0, 16) : "");
      setTotal(job.extract.total != null ? String(job.extract.total) : "");
      if (job.suggested_establishment_id) {
        setEstablishmentId(job.suggested_establishment_id);
        setCreateNew(false);
      } else if (job.extract.cnpj) {
        // Divergência: sugere criar novo
        setCreateNew(true);
        setNewEst({
          name: job.extract.marketName ?? "",
          cnpj: job.extract.cnpj ?? "",
          address: job.extract.address ?? "",
          city: "",
          state: "",
          phone: "",
        });
      }
    }
  }, [job, items.length]);

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem deve ter até 8 MB");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("Falha ao ler"));
      fr.readAsDataURL(file);
    });
    setImageData(dataUrl);
  };

  const startJob = async () => {
    if (!imageData) return;
    setStarting(true);
    try {
      const { jobId: id } = await createJob({ data: { imageDataUrl: imageData } });
      setJobId(id);
      // Dispara processamento sem aguardar
      void processJob({ data: { jobId: id } }).catch((err) => {
        console.error("processJob:", err);
      });
      toast.success("Cupom enviado — processando em segundo plano");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar");
    } finally {
      setStarting(false);
    }
  };

  const reset = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setImageData(null);
    setJobId(null);
    setJob(null);
    setItems([]);
    setEstablishmentId("");
    setCreateNew(false);
    setNewEst({ name: "", cnpj: "", address: "", city: "", state: "", phone: "" });
    setCouponNumber("");
    setAccessKey("");
    setIssuedAt("");
    setTotal("");
  }, []);

  const retry = () => {
    if (jobId) void cancelJob({ data: { jobId } }).catch(() => {});
    setJobId(null);
    setJob(null);
    setItems([]);
  };

  const toggleItem = (key: string, patch: Partial<ItemDraft>) => {
    setItems((arr) => arr.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };
  const removeItem = (key: string) => {
    setItems((arr) => arr.filter((it) => it.key !== key));
  };

  const cnpjMatch = job?.extract?.cnpj
    ? estabs.find((e) => digitsOnly(e.cnpj) === digitsOnly(job.extract?.cnpj))
    : null;

  const totalCalculado = items
    .filter((it) => it.selected)
    .reduce((acc, it) => acc + (it.totalPrice ?? it.price * (it.quantity ?? 1)), 0);

  const selectedCount = items.filter((it) => it.selected).length;
  const duplicateCount = items.filter((it) => it.duplicateOfScanId).length;

  const confirm = async () => {
    if (!jobId) return;
    if (!createNew && !establishmentId) {
      toast.error("Selecione o estabelecimento ou marque para criar um novo");
      return;
    }
    if (createNew && (!newEst.name.trim() || !newEst.city.trim() || !newEst.state.trim())) {
      toast.error("Nome, cidade e UF são obrigatórios para criar o estabelecimento");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Selecione pelo menos 1 item");
      return;
    }
    setSaving(true);
    try {
      const overrides: Record<string, {
        productName: string; price: number; quantity: number | null; unit: string | null; barcode: string | null; totalPrice: number | null;
      }> = {};
      for (const it of items) {
        overrides[it.key] = {
          productName: it.productName,
          price: it.price,
          quantity: it.quantity,
          unit: it.unit,
          barcode: it.barcode,
          totalPrice: it.totalPrice,
        };
      }
      const res = await confirmImport({
        data: {
          jobId,
          establishmentId: createNew ? null : establishmentId,
          createEstablishment: createNew
            ? {
                name: newEst.name.trim(),
                cnpj: newEst.cnpj.trim() || null,
                address: newEst.address.trim() || null,
                city: newEst.city.trim(),
                state: newEst.state.trim().toUpperCase(),
                phone: newEst.phone.trim() || null,
              }
            : null,
          selectedKeys: items.filter((it) => it.selected).map((it) => it.key),
          overrides,
          issuedAt: issuedAt ? new Date(issuedAt).toISOString() : null,
          total: total ? Number(total) : null,
          amountPaid: total ? Number(total) : null,
          couponNumber: couponNumber || null,
          accessKey: accessKey || null,
        },
      });
      toast.success(`Cupom salvo com ${res.itemsSaved} itens`);
      setTimeout(() => navigate({ to: "/admin", replace: true }), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  const showProgress =
    job &&
    (job.status === "queued" ||
      job.status === "extracting" ||
      job.status === "importing");
  const showReview = job?.status === "ready_for_review";
  const showFailed = job?.status === "failed";
  const showDone = job?.status === "done";

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Link>
          </Button>
          <h1 className="font-serif text-3xl">Registrar cupom fiscal</h1>
          <p className="text-sm text-muted-foreground">
            Envie a foto. A IA processa em segundo plano e você revisa antes de confirmar.
          </p>
        </div>

        {/* Estado: sem job ativo */}
        {!jobId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">1. Foto do cupom</CardTitle>
              <CardDescription>
                PNG, JPG ou WEBP até 8 MB. Prefira imagem nítida e reta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {imageData ? (
                  <img
                    src={imageData}
                    alt="cupom"
                    className="max-h-64 rounded-md border object-contain"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground sm:w-64">
                    Nenhuma imagem
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                  <Button
                    onClick={startJob}
                    disabled={!imageData || starting}
                    className="w-full sm:w-auto"
                  >
                    {starting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Extrair em segundo plano
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado: processando */}
        {showProgress && (
          <Card className="mb-6 border-primary/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <CardTitle className="text-base">Processando…</CardTitle>
              </div>
              <CardDescription>{job?.step_label ?? "Iniciando"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={job?.progress ?? 0} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{job?.progress ?? 0}% concluído</span>
                <span>Você pode fechar esta aba e voltar depois</span>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={retry}>
                  Cancelar e recomeçar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado: falhou */}
        {showFailed && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha no processamento</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{job?.error_message ?? "Erro desconhecido"}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={retry}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>
                  Nova imagem
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Estado: concluído */}
        {showDone && (
          <Alert className="mb-6 border-primary/40">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Importação concluída</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{job?.step_label}</span>
              <Button size="sm" variant="outline" onClick={reset}>
                Importar outro cupom
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Estado: revisão */}
        {showReview && job?.extract && (
          <>
            {/* Estabelecimento */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Store className="h-4 w-4" /> Estabelecimento
                    </CardTitle>
                    <CardDescription>
                      Vinculamos automaticamente pelo CNPJ da nota.
                    </CardDescription>
                  </div>
                  {cnpjMatch ? (
                    <Badge className="bg-savings/10 text-savings hover:bg-savings/10">
                      CNPJ confere
                    </Badge>
                  ) : job.extract.cnpj ? (
                    <Badge variant="destructive">CNPJ não cadastrado</Badge>
                  ) : (
                    <Badge variant="outline">Sem CNPJ na nota</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.extract.marketName && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">{job.extract.marketName}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.extract.cnpj && <>CNPJ {job.extract.cnpj} · </>}
                      {job.extract.address ?? "Endereço não identificado"}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={!createNew}
                      onChange={() => setCreateNew(false)}
                    />
                    Vincular a estabelecimento existente
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={createNew}
                      onChange={() => setCreateNew(true)}
                    />
                    Criar novo com dados da nota
                  </label>
                </div>

                {!createNew && (
                  <Select value={establishmentId} onValueChange={setEstablishmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {estabs.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} — {e.city}/{e.state}
                          {e.cnpj ? ` · ${e.cnpj}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {createNew && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Nome*</Label>
                      <Input
                        value={newEst.name}
                        onChange={(e) => setNewEst((s) => ({ ...s, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <Input
                        value={newEst.cnpj}
                        onChange={(e) => setNewEst((s) => ({ ...s, cnpj: e.target.value }))}
                        className="font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Endereço</Label>
                      <Input
                        value={newEst.address}
                        onChange={(e) => setNewEst((s) => ({ ...s, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Cidade*</Label>
                      <Input
                        value={newEst.city}
                        onChange={(e) => setNewEst((s) => ({ ...s, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>UF*</Label>
                      <Input
                        maxLength={2}
                        value={newEst.state}
                        onChange={(e) =>
                          setNewEst((s) => ({ ...s, state: e.target.value.toUpperCase() }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Telefone</Label>
                      <Input
                        value={newEst.phone}
                        onChange={(e) => setNewEst((s) => ({ ...s, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dados fiscais */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Dados fiscais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Nº do cupom</Label>
                  <Input value={couponNumber} onChange={(e) => setCouponNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Chave NFC-e (44)</Label>
                  <Input
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value.replace(/\D/g, "").slice(0, 44))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Emissão</Label>
                  <Input
                    type="datetime-local"
                    value={issuedAt}
                    onChange={(e) => setIssuedAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Itens */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Itens extraídos ({selectedCount}/{items.length})
                    </CardTitle>
                    <CardDescription>
                      Total selecionado:{" "}
                      <span className="font-mono">R$ {totalCalculado.toFixed(2)}</span>
                      {duplicateCount > 0 && (
                        <span className="ml-2 text-warning">
                          · {duplicateCount} já registrado(s) — desmarcado(s) automaticamente
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-24">Qtd</TableHead>
                      <TableHead className="w-20">Un</TableHead>
                      <TableHead className="w-24">V.Unit</TableHead>
                      <TableHead className="w-24">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow
                        key={it.key}
                        className={it.duplicateOfScanId ? "bg-warning/30" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={it.selected}
                            onCheckedChange={(v) =>
                              toggleItem(it.key, { selected: Boolean(v) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={it.productName}
                            onChange={(e) =>
                              toggleItem(it.key, { productName: e.target.value })
                            }
                          />
                          <div className="mt-1 flex flex-wrap gap-1">
                            {it.mergedCount > 1 && (
                              <Badge variant="outline" className="gap-1 text-[12.5px]">
                                <Copy className="h-3 w-3" /> unificados: {it.mergedCount}
                              </Badge>
                            )}
                            {it.duplicateOfScanId && (
                              <Badge className="bg-warning/10 text-warning hover:bg-warning/10 text-[12.5px]">
                                já registrado
                              </Badge>
                            )}
                            {it.barcode && (
                              <Badge variant="outline" className="font-mono text-[12.5px]">
                                {it.barcode}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={it.quantity ?? ""}
                            onChange={(e) =>
                              toggleItem(it.key, {
                                quantity: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={it.unit ?? ""}
                            onChange={(e) =>
                              toggleItem(it.key, { unit: e.target.value || null })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.price || ""}
                            onChange={(e) =>
                              toggleItem(it.key, { price: Number(e.target.value) })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={it.totalPrice ?? ""}
                            onChange={(e) =>
                              toggleItem(it.key, {
                                totalPrice: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(it.key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset} disabled={saving}>
                Descartar
              </Button>
              <Button onClick={confirm} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirmar e importar
              </Button>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
