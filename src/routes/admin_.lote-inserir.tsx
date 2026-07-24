import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeBatchPhotos,
  analyzeManualItem,
  commitScanBatch,
  type Candidate,
  type Decision,
} from "@/lib/scan-intelligence.functions";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Save,
  Trash2,
  UploadCloud,
  ImagePlus,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/lote-inserir")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Scan Inteligente — Admin" },
      {
        name: "description",
        content: "Envie fotos, deixe a IA extrair produtos, revisar duplicatas e salvar preços com histórico.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Gate,
});

const REBOUCAS_ID = "fd10eca4-8871-43cd-8842-cad6a13bbc21";
const UNITS = ["", "g", "kg", "ml", "l", "un"] as const;
const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = Candidate & {
  action: "new" | "update" | "ignore";
  editedName: string;
  editedBrand: string | null;
  editedUnit: string | null;
  editedQty: number | null;
  editedBarcode: string | null;
  editedPrice: number;
};

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
              <Link to="/admin">Voltar ao painel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <Page />;
}

// Convert File → data URL, resized to max 1280px to keep upload light.
async function fileToResizedDataURL(file: File, max = 1280): Promise<string> {
  const buf = await file.arrayBuffer();
  const blob = new Blob([buf], { type: file.type });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Falha ao carregar imagem"));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return url;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Page() {
  const analyzeFn = useServerFn(analyzeBatchPhotos);
  const commitFn = useServerFn(commitScanBatch);
  const manualFn = useServerFn(analyzeManualItem);

  const [establishmentId, setEstablishmentId] = useState<string>(REBOUCAS_ID);
  const [files, setFiles] = useState<Array<{ id: string; dataUrl: string; name: string }>>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualPhotoRef = useRef<HTMLInputElement>(null);

  const [manualForm, setManualForm] = useState<{
    name: string;
    brand: string;
    qty: string;
    unit: string;
    barcode: string;
    price: string;
    photo: string | null;
  }>({ name: "", brand: "", qty: "", unit: "", barcode: "", price: "", photo: null });

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

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    const cap = 10 - files.length;
    if (cap <= 0) {
      toast.error("Máximo de 10 imagens por lote.");
      return;
    }
    const next: Array<{ id: string; dataUrl: string; name: string }> = [];
    for (const f of arr.slice(0, cap)) {
      try {
        const dataUrl = await fileToResizedDataURL(f);
        next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, dataUrl, name: f.name });
      } catch {
        toast.error(`Falha ao ler ${f.name}`);
      }
    }
    setFiles((prev) => [...prev, ...next]);
  }, [files.length]);

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const analyze = useMutation({
    mutationFn: async () => {
      if (files.length === 0) throw new Error("Envie ao menos 1 foto.");
      return analyzeFn({
        data: { images: files.map((f) => f.dataUrl), establishmentId },
      });
    },
    onSuccess: (result) => {
      const mapped: Row[] = result.map((c) => ({
        ...c,
        action:
          c.matchType === "barcode" || c.matchType === "signature"
            ? "update"
            : c.matchType === "fuzzy" && c.divergences.length > 0
              ? "update"
              : "new",
        editedName: c.productName,
        editedBrand: c.brand,
        editedUnit: c.sizeUnit ?? c.unit,
        editedQty: c.sizeValue,
        editedBarcode: c.barcode,
        editedPrice: c.price ?? 0,
      }));
      setRows(mapped);
      // Expand every row that has divergences
      setExpanded(new Set(mapped.filter((r) => r.divergences.length > 0).map((r) => r.clientId)));
      toast.success(`${mapped.length} produtos extraídos pela IA`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro na análise"),
  });

  const commit = useMutation({
    mutationFn: async () => {
      const decisions: Decision[] = rows
        .filter((r) => r.action !== "ignore" && r.editedPrice > 0 && r.editedName.trim().length >= 2)
        .map((r) => ({
          clientId: r.clientId,
          action: r.action,
          productName: r.editedName.trim(),
          brand: r.editedBrand,
          unit: r.editedUnit,
          quantity: r.editedQty,
          barcode: r.editedBarcode,
          price: r.editedPrice,
          existingScanId: r.action === "update" ? r.existing?.scanId ?? null : null,
        }));
      if (decisions.length === 0) throw new Error("Nenhum item pronto para salvar.");
      return commitFn({ data: { establishmentId, decisions } });
    },
    onSuccess: (r) => {
      toast.success(
        `${r.inserted} inseridos · ${r.updated} atualizados${r.ignored ? ` · ${r.ignored} ignorados` : ""}`,
      );
      if (r.errors.length > 0) toast.error(`Falhas: ${r.errors.length}`);
      setRows([]);
      setFiles([]);
      setExpanded(new Set());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.clientId === id ? { ...r, ...patch } : r)));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const stats = useMemo(() => {
    const toSave = rows.filter((r) => r.action !== "ignore").length;
    const news = rows.filter((r) => r.action === "new").length;
    const upds = rows.filter((r) => r.action === "update").length;
    const dups = rows.filter((r) => r.matchType === "barcode" || r.matchType === "signature").length;
    return { toSave, news, upds, dups, total: rows.length };
  }, [rows]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Admin
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scan Inteligente</h1>
            <p className="text-sm text-muted-foreground">
              Envie fotos → a IA identifica os produtos → você aprova → o histórico é registrado.
            </p>
          </div>
        </div>

        {/* Step 1: uploader */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Estabelecimento e fotos</CardTitle>
            <CardDescription>Até 10 imagens por lote. Melhor resultado com etiqueta e produto visíveis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm text-muted-foreground">Estabelecimento:</label>
              <Select value={establishmentId} onValueChange={setEstablishmentId}>
                <SelectTrigger className="w-full sm:w-[340px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(establishments ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                void addFiles(e.dataTransfer.files);
              }}
              className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary/40"
            >
              <UploadCloud className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste imagens aqui</p>
              <p className="mb-3 text-xs text-muted-foreground">ou</p>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />
                Escolher fotos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {files.map((f) => (
                  <div key={f.id} className="group relative overflow-hidden rounded-md border">
                    <img src={f.dataUrl} alt={f.name} className="h-24 w-full object-cover" />
                    <button
                      onClick={() => removeFile(f.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => analyze.mutate()}
                disabled={analyze.isPending || files.length === 0}
                size="lg"
              >
                {analyze.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Analisar {files.length > 0 ? `(${files.length})` : ""}
              </Button>
              {files.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                  Limpar fotos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2 + 3: review + save */}
        {rows.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                2. Revisar e aprovar ({rows.length} {rows.length === 1 ? "produto" : "produtos"})
              </CardTitle>
              <CardDescription>
                <span className="font-medium text-emerald-600">{stats.news} novos</span>
                {" · "}
                <span className="font-medium text-amber-700">{stats.upds} atualizações</span>
                {stats.dups > 0 && (
                  <>
                    {" · "}
                    <span className="font-medium text-red-600">{stats.dups} match forte</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.map((r) => {
                const isOpen = expanded.has(r.clientId);
                const hasExisting = !!r.existing;
                return (
                  <div
                    key={r.clientId}
                    className="rounded-lg border bg-card"
                  >
                    <div className="flex gap-3 p-3">
                      {r.imagePreview && (
                        <img
                          src={r.imagePreview}
                          alt=""
                          className="h-16 w-16 flex-none rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{r.editedName || "(sem nome)"}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {r.editedBrand && <span>{r.editedBrand}</span>}
                              {r.sizeValue != null && (
                                <span>
                                  · {r.sizeValue}
                                  {r.sizeUnit}
                                </span>
                              )}
                              {r.category && <span>· {r.category}</span>}
                              {r.barcode && <span>· EAN {r.barcode}</span>}
                              <span className="ml-auto font-medium text-foreground">
                                {fmtBRL(r.editedPrice)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {r.matchType === "barcode" && (
                            <Badge variant="destructive" className="h-5">
                              EAN idêntico
                            </Badge>
                          )}
                          {r.matchType === "signature" && (
                            <Badge className="h-5 bg-red-600 hover:bg-red-600">Match forte</Badge>
                          )}
                          {r.matchType === "fuzzy" && (
                            <Badge variant="outline" className="h-5 border-amber-500 text-amber-700">
                              Similar {Math.round((r.existing?.similarity ?? 0) * 100)}%
                            </Badge>
                          )}
                          {r.matchType === "none" && (
                            <Badge className="h-5 bg-emerald-600 hover:bg-emerald-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Novo
                            </Badge>
                          )}
                          {r.divergences.length > 0 && (
                            <Badge variant="outline" className="h-5 border-amber-500 text-amber-700">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Divergências: {r.divergences.join(", ")}
                            </Badge>
                          )}
                          <Badge variant="outline" className="h-5">
                            IA {r.confidence}
                          </Badge>

                          <div className="ml-auto flex items-center gap-1">
                            {hasExisting && (
                              <ActionPill
                                active={r.action === "update"}
                                onClick={() => updateRow(r.clientId, { action: "update" })}
                              >
                                Atualizar
                              </ActionPill>
                            )}
                            <ActionPill
                              active={r.action === "new"}
                              onClick={() => updateRow(r.clientId, { action: "new" })}
                            >
                              Novo
                            </ActionPill>
                            <ActionPill
                              active={r.action === "ignore"}
                              onClick={() => updateRow(r.clientId, { action: "ignore" })}
                              tone="danger"
                            >
                              Ignorar
                            </ActionPill>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggle(r.clientId)}
                            >
                              {isOpen ? "Fechar" : "Editar"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="space-y-3 border-t bg-muted/20 p-3">
                        {hasExisting && (
                          <div className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
                            <div>
                              <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                Já cadastrado neste estabelecimento
                              </div>
                              <div className="text-sm font-medium">{r.existing!.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.existing!.unit ?? ""} {r.existing!.quantity ?? ""}
                                {r.existing!.barcode && ` · EAN ${r.existing!.barcode}`}
                              </div>
                              <div className="mt-1 text-sm">
                                Preço anterior:{" "}
                                <span className="font-medium">{fmtBRL(r.existing!.price)}</span>
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                                IA leu (novo preço)
                              </div>
                              <div className={fieldClass(r.divergences.includes("name"))}>
                                {r.editedName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className={fieldClass(r.divergences.includes("brand"))}>
                                  {r.editedBrand ?? "—"}
                                </span>{" "}
                                ·{" "}
                                <span className={fieldClass(r.divergences.includes("size"))}>
                                  {r.sizeValue ?? "?"}
                                  {r.sizeUnit ?? ""}
                                </span>
                              </div>
                              <div className={`mt-1 text-sm ${fieldClass(r.divergences.includes("price"))}`}>
                                Preço novo: <span className="font-medium">{fmtBRL(r.editedPrice)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                          <LabeledInput
                            label="Nome"
                            className="sm:col-span-3"
                            value={r.editedName}
                            onChange={(v) => updateRow(r.clientId, { editedName: v })}
                          />
                          <LabeledInput
                            label="Marca"
                            className="sm:col-span-3"
                            value={r.editedBrand ?? ""}
                            onChange={(v) => updateRow(r.clientId, { editedBrand: v || null })}
                          />
                          <LabeledInput
                            label="Qtd"
                            type="number"
                            step="0.01"
                            value={r.editedQty ?? ""}
                            onChange={(v) =>
                              updateRow(r.clientId, {
                                editedQty: v ? parseFloat(v) : null,
                              })
                            }
                          />
                          <div>
                            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                              Un.
                            </div>
                            <Select
                              value={r.editedUnit ?? ""}
                              onValueChange={(v) =>
                                updateRow(r.clientId, { editedUnit: v === "none" ? null : v || null })
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                {UNITS.map((u) => (
                                  <SelectItem key={u || "none"} value={u || "none"}>
                                    {u || "—"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <LabeledInput
                            label="EAN"
                            value={r.editedBarcode ?? ""}
                            onChange={(v) => updateRow(r.clientId, { editedBarcode: v || null })}
                          />
                          <LabeledInput
                            label="Preço R$"
                            type="number"
                            step="0.01"
                            value={r.editedPrice}
                            onChange={(v) =>
                              updateRow(r.clientId, { editedPrice: parseFloat(v) || 0 })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between border-t pt-3">
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{stats.toSave}</strong> prontos para salvar
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRows([]);
                      setExpanded(new Set());
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Descartar
                  </Button>
                  <Button
                    onClick={() => commit.mutate()}
                    disabled={commit.isPending || stats.toSave === 0}
                    size="lg"
                  >
                    {commit.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar {stats.toSave} preço{stats.toSave === 1 ? "" : "s"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function fieldClass(divergent: boolean): string {
  return divergent
    ? "text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded px-1"
    : "";
}

function ActionPill({
  active,
  onClick,
  tone = "default",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const base =
    "text-xs rounded-md px-2 py-1 border transition-colors";
  const activeCls =
    tone === "danger"
      ? "bg-red-600 border-red-600 text-white"
      : "bg-primary border-primary text-primary-foreground";
  const idle = "bg-transparent text-muted-foreground hover:bg-muted";
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? activeCls : idle}`}>
      {children}
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  className,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <Input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-sm"
      />
    </div>
  );
}
