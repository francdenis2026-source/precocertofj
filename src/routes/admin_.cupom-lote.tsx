import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle2, X, AlertCircle, ImagePlus, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useMyRoles } from "@/hooks/useMyRoles";
import { listEstablishments, type Establishment } from "@/lib/establishments.functions";
import { uploadImageDataUrl } from "@/lib/storage.functions";
import { extractReceiptItems, saveReceipt, type ReceiptExtract } from "@/lib/receipt.functions";

export const Route = createFileRoute("/admin_/cupom-lote")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Cupons em lote — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Navigate to="/admin/promocoes" search={{ tab: "cupons-lote" } as never} replace />,
});

type Status = "pendente" | "extraindo" | "pronto" | "salvando" | "salvo" | "erro";

type BatchItem = {
  id: string;
  fileName: string;
  dataUrl: string;
  status: Status;
  error?: string;
  extract?: ReceiptExtract;
  establishmentId?: string;
  savedReceiptId?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Falha ao ler arquivo"));
    fr.readAsDataURL(file);
  });
}

function findEstablishmentByCnpj(estabs: Establishment[], cnpj: string | null | undefined): string | undefined {
  if (!cnpj) return undefined;
  const clean = cnpj.replace(/\D/g, "");
  return estabs.find((e) => e.cnpj?.replace(/\D/g, "") === clean)?.id;
}

export function CupomLotePage() {
  const { user, loading, isAdmin } = useMyRoles();
  const navigate = useNavigate();
  const listEstab = useServerFn(listEstablishments);
  const extract = useServerFn(extractReceiptItems);
  const upload = useServerFn(uploadImageDataUrl);
  const save = useServerFn(saveReceipt);

  const [estabs, setEstabs] = useState<Establishment[]>([]);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [defaultEstabId, setDefaultEstabId] = useState<string>("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    void listEstab().then(setEstabs).catch(() => setEstabs([]));
  }, [isAdmin, listEstab]);

  const stats = useMemo(() => {
    const c = { pendente: 0, extraindo: 0, pronto: 0, salvando: 0, salvo: 0, erro: 0 };
    for (const it of items) c[it.status] += 1;
    return c;
  }, [items]);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const toAdd: BatchItem[] = [];
    for (const f of list) {
      if (f.size > 8 * 1024 * 1024) {
        toast.error(`${f.name}: imagem maior que 8 MB`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        toAdd.push({
          id: crypto.randomUUID(),
          fileName: f.name,
          dataUrl,
          status: "pendente",
        });
      } catch (err) {
        toast.error(`${f.name}: ${err instanceof Error ? err.message : "erro"}`);
      }
    }
    if (toAdd.length > 0) setItems((cur) => [...cur, ...toAdd]);
  };

  const updateItem = (id: string, patch: Partial<BatchItem>) => {
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((cur) => cur.filter((it) => it.id !== id));
  };

  const extractAll = async () => {
    const pending = items.filter((it) => it.status === "pendente" || it.status === "erro");
    if (pending.length === 0) return;
    setRunning(true);
    // Processa em série para evitar rate-limit da IA
    for (const it of pending) {
      updateItem(it.id, { status: "extraindo", error: undefined });
      try {
        const res = await extract({ data: { image: it.dataUrl } });
        const estId = findEstablishmentByCnpj(estabs, res.cnpj) ?? defaultEstabId ?? undefined;
        updateItem(it.id, { status: "pronto", extract: res, establishmentId: estId });
      } catch (err) {
        updateItem(it.id, {
          status: "erro",
          error: err instanceof Error ? err.message : "Falha na extração",
        });
      }
    }
    setRunning(false);
    toast.success("Extração concluída");
  };

  const saveAll = async () => {
    const ready = items.filter((it) => it.status === "pronto");
    if (ready.length === 0) {
      toast.error("Nenhum cupom pronto para salvar");
      return;
    }
    const missing = ready.filter((it) => !it.establishmentId);
    if (missing.length > 0) {
      toast.error("Selecione o estabelecimento em todos os cupons prontos");
      return;
    }
    setRunning(true);
    for (const it of ready) {
      if (!it.extract || !it.establishmentId) continue;
      updateItem(it.id, { status: "salvando", error: undefined });
      try {
        const path = `cupons/${crypto.randomUUID()}.jpg`;
        const { publicUrl } = await upload({
          data: { bucket: "logos", path, dataUrl: it.dataUrl },
        });
        const estab = estabs.find((e) => e.id === it.establishmentId);
        const res = await save({
          data: {
            establishmentId: it.establishmentId,
            couponNumber: it.extract.couponNumber,
            accessKey: it.extract.accessKey,
            issuedAt: it.extract.issuedAt,
            total: it.extract.total,
            amountPaid: it.extract.amountPaid,
            imageUrl: publicUrl,
            marketName: estab?.name ?? it.extract.marketName,
            items: it.extract.items,
          },
        });
        updateItem(it.id, { status: "salvo", savedReceiptId: res.receiptId });
      } catch (err) {
        updateItem(it.id, {
          status: "erro",
          error: err instanceof Error ? err.message : "Falha ao salvar",
        });
      }
    }
    setRunning(false);
    toast.success(`${ready.length} cupom(ns) processados`);
  };

  const applyDefaultToAll = () => {
    if (!defaultEstabId) return;
    setItems((cur) =>
      cur.map((it) =>
        it.status === "pronto" && !it.establishmentId ? { ...it, establishmentId: defaultEstabId } : it,
      ),
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user || !isAdmin) return null;

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao painel</Link>
          </Button>
          <h1 className="font-serif text-3xl">Cupons fiscais em lote</h1>
          <p className="text-sm text-muted-foreground">
            Envie várias fotos, extraia todas com a IA e confirme para salvar todos os itens de uma vez.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">1. Selecionar imagens</CardTitle>
            <CardDescription>PNG/JPG/WEBP até 8 MB cada. Pode adicionar mais em várias etapas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                onClick={extractAll}
                disabled={running || items.every((it) => it.status !== "pendente" && it.status !== "erro")}
                variant="outline"
              >
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                Extrair todos
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <Label className="text-xs">Estabelecimento padrão (opcional)</Label>
                <Select value={defaultEstabId} onValueChange={setDefaultEstabId}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {estabs.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} — {e.city}/{e.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={applyDefaultToAll} disabled={!defaultEstabId}>
                Aplicar aos cupons prontos
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Pendente: {stats.pendente}</Badge>
              <Badge variant="outline">Pronto: {stats.pronto}</Badge>
              <Badge variant="outline" className="border-savings text-savings">Salvo: {stats.salvo}</Badge>
              {stats.erro > 0 && <Badge variant="destructive">Erros: {stats.erro}</Badge>}
            </div>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((it) => {
              const estab = estabs.find((e) => e.id === it.establishmentId);
              const itemsSum =
                it.extract?.items.reduce(
                  (acc, x) => acc + (x.totalPrice ?? x.price * (x.quantity ?? 1)),
                  0,
                ) ?? 0;
              const diverge =
                it.extract?.total != null && Math.abs(itemsSum - it.extract.total) > 0.02;
              return (
                <Card key={it.id} className={it.status === "erro" ? "border-destructive/60" : ""}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="flex items-start gap-3">
                      <img src={it.dataUrl} alt={it.fileName} className="h-20 w-20 rounded-md border object-cover" />
                      <div>
                        <CardTitle className="text-sm">{it.fileName}</CardTitle>
                        <CardDescription className="text-xs">
                          {it.status === "pendente" && "Aguardando extração"}
                          {it.status === "extraindo" && "Extraindo com IA…"}
                          {it.status === "pronto" && it.extract && (
                            <>
                              {it.extract.items.length} itens · total{" "}
                              {it.extract.total != null ? `R$ ${it.extract.total.toFixed(2)}` : "—"}
                              {diverge && (
                                <Badge variant="destructive" className="ml-2">soma diverge</Badge>
                              )}
                            </>
                          )}
                          {it.status === "salvando" && "Gravando no banco…"}
                          {it.status === "salvo" && "Cupom salvo com sucesso"}
                          {it.status === "erro" && (
                            <span className="text-destructive">{it.error ?? "Erro"}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {it.status === "salvo" && <CheckCircle2 className="h-5 w-5 text-savings" />}
                      {it.status === "erro" && <AlertCircle className="h-5 w-5 text-destructive" />}
                      {(it.status === "extraindo" || it.status === "salvando") && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} disabled={running}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  {it.status === "pronto" && it.extract && (
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Estabelecimento*</Label>
                        <Select
                          value={it.establishmentId ?? ""}
                          onValueChange={(v) => updateItem(it.id, { establishmentId: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                          <SelectContent>
                            {estabs.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.name} — {e.city}/{e.state}
                                {e.cnpj ? ` · ${e.cnpj}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {it.extract.cnpj && !estab && (
                          <p className="mt-1 text-xs text-warning">
                            CNPJ do cupom: <span className="font-mono">{it.extract.cnpj}</span> — não encontrado no cadastro.
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2 rounded-md border bg-muted/30 p-3 text-xs">
                        <p className="mb-2 font-medium">
                          Cupom {it.extract.couponNumber ?? "—"} · {it.extract.issuedAt ? new Date(it.extract.issuedAt).toLocaleString("pt-BR") : "sem data"}
                        </p>
                        <ul className="space-y-1">
                          {it.extract.items.map((prod, idx) => (
                            <li key={idx} className="flex justify-between gap-2 border-b border-dashed py-1 last:border-0">
                              <span className="truncate">{prod.productName}</span>
                              <span className="shrink-0 font-mono">
                                {prod.quantity ?? 1}{prod.unit ? ` ${prod.unit}` : ""} · R$ {prod.price.toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setItems([])} disabled={running}>
                Limpar tudo
              </Button>
              <Button
                onClick={saveAll}
                disabled={running || items.every((it) => it.status !== "pronto")}
              >
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                Salvar todos os prontos
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Adicione as fotos dos cupons acima para começar.
            </CardContent>
          </Card>
        )}
      </section>
    </AppShell>
  );
}
