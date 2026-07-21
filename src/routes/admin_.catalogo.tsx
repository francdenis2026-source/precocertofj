import { createFileRoute, Link } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScanQuickAction } from "@/components/scans/ScanQuickAction";
import { PlatformStatsBadge } from "@/components/admin/PlatformStatsBadge";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  Loader2,
  Package,
  Search,
  Upload,
  Save,
  AlertTriangle,
  History,
  Sparkles,
  GitMerge,
  Eye,
  CheckCircle2,
  XCircle,
  Globe,
  RefreshCw,
  ImageIcon,
  Link as LinkIcon,
} from "lucide-react";

import {
  listCatalog,
  updateCatalogEntry,
  uploadCatalogImage,
  type CatalogEntry,
} from "@/lib/catalog.functions";
import {
  listBarcodeAlerts,
  listLegacyDuplicates,
  consolidateBarcode,
  mergeLegacyEntries,
  type BarcodeConflict,
  type LegacyDuplicate,
} from "@/lib/catalog-merge.functions";
import {
  listMissingImages,
  generateCatalogImage,
  generateAllMissingImages,
  markImageSearch,
  markAllMissingAsUnmatched,
  listRecentImageChanges,
  searchWebImageForCatalog,
  suggestWebImagesForCatalog,
  applyCatalogImageUrl,
  listCatalogImageHistory,
  enqueueBulkWebImageUpdate,
  scrapeAllMissingImages,
  getImageMatchThreshold,
  setImageMatchThreshold,

  type MissingImageEntry,
  type RecentImageChange,
} from "@/lib/catalog-image.functions";
import { listCatalogAudit, type AuditLogEntry } from "@/lib/catalog-audit.functions";
import { forceRefreshCatalogImage } from "@/lib/image-import.functions";
import { PhotoUploadDialog } from "@/components/admin/PhotoUploadDialog";
import { WebImagePickerDialog } from "@/components/admin/WebImagePickerDialog";
import { BulkPhotoUpdateDialog } from "@/components/admin/BulkPhotoUpdateDialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";




import { AdminOnly } from "@/components/auth/AdminOnly";

export const Route = createFileRoute("/admin_/catalogo")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Catálogo de produtos — Admin — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <CatalogoAdminPage />
    </AdminOnly>
  ),
});


async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function CatalogoAdminPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl">Catálogo de produtos</h1>
              <p className="text-sm text-muted-foreground">
                Edite produtos, revise inconsistências, mescle duplicatas e acompanhe alterações.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin">Voltar ao Admin</Link>
          </Button>
        </header>

        <PlatformStatsBadge />

        <ScanQuickAction />



        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="items">
              <Package className="mr-1 h-4 w-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="mr-1 h-4 w-4" /> Alertas
            </TabsTrigger>
            <TabsTrigger value="merge">
              <GitMerge className="mr-1 h-4 w-4" /> Mesclar
            </TabsTrigger>
            <TabsTrigger value="images">
              <Sparkles className="mr-1 h-4 w-4" /> Imagens IA
            </TabsTrigger>
            <TabsTrigger value="gallery">
              <ImageIcon className="mr-1 h-4 w-4" /> Galeria
            </TabsTrigger>
            <TabsTrigger value="review">
              <Eye className="mr-1 h-4 w-4" /> Revisão
            </TabsTrigger>
            <TabsTrigger value="audit">
              <History className="mr-1 h-4 w-4" /> Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <ItemsPanel />
          </TabsContent>
          <TabsContent value="alerts">
            <AlertsPanel />
          </TabsContent>
          <TabsContent value="merge">
            <MergePanel />
          </TabsContent>
          <TabsContent value="images">
            <ImagesPanel />
          </TabsContent>
          <TabsContent value="gallery">
            <GalleryPanel />
          </TabsContent>
          <TabsContent value="review">
            <ReviewPanel />
          </TabsContent>
          <TabsContent value="audit">
            <AuditPanel />
          </TabsContent>
        </Tabs>
      </section>
    </AppShell>
  );
}

function ItemsPanel() {
  const { prompt } = useConfirm();
  const fetchList = useServerFn(listCatalog);
  const doUpdate = useServerFn(updateCatalogEntry);
  const doWebSearch = useServerFn(searchWebImageForCatalog);
  const doForceRefresh = useServerFn(forceRefreshCatalogImage);
  const doSuggest = useServerFn(suggestWebImagesForCatalog);
  const doApplyUrl = useServerFn(applyCatalogImageUrl);
  const doGenAI = useServerFn(generateCatalogImage);
  const doHistory = useServerFn(listCatalogImageHistory);

  const [rows, setRows] = useState<CatalogEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [photoFilter, setPhotoFilter] = useState<"all" | "with" | "without">("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [uploadDialogFor, setUploadDialogFor] = useState<CatalogEntry | null>(null);
  const [pickerFor, setPickerFor] = useState<CatalogEntry | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, Partial<CatalogEntry>>>({});


  useEffect(() => {
    fetchList()
      .then(setRows)
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Falha ao carregar catálogo"),
      );
  }, [fetchList]);

  const counts = useMemo(() => {
    if (!rows) return { all: 0, with: 0, without: 0 };
    let withPhoto = 0;
    for (const r of rows) if (r.imageUrl) withPhoto++;
    return { all: rows.length, with: withPhoto, without: rows.length - withPhoto };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (photoFilter === "with" && !r.imageUrl) return false;
      if (photoFilter === "without" && r.imageUrl) return false;
      if (!s) return true;
      return (
        r.displayName.toLowerCase().includes(s) ||
        r.normalizedName.toLowerCase().includes(s) ||
        (r.barcode ?? "").toLowerCase().includes(s) ||
        (r.brand ?? "").toLowerCase().includes(s)
      );
    });
  }, [rows, q, photoFilter]);

  const patchLocal = (id: string, patch: Partial<CatalogEntry>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const applyRow = (updated: CatalogEntry) => {
    setRows((prev) => (prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev));
    setDrafts((d) => {
      const next = { ...d };
      delete next[updated.id];
      return next;
    });
  };

  const saveRow = async (row: CatalogEntry) => {
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    try {
      const updated = await doUpdate({
        data: {
          id: row.id,
          displayName: draft.displayName,
          brand: draft.brand,
          defaultUnit: draft.defaultUnit,
          barcode: draft.barcode,
        },
      });
      applyRow(updated);
      toast.success("Produto atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingId(null);
    }
  };

  const patchImageLocal = (rowId: string, imageUrl: string) => {
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.id === rowId
              ? { ...r, imageUrl, updatedAt: new Date().toISOString() }
              : r,
          )
        : prev,
    );
  };

  // Carrega o access token do admin logado para o upload via server route
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });
  }, []);


  const searchWeb = async (row: CatalogEntry) => {
    setSearchingId(row.id);
    try {
      const res = await doWebSearch({ data: { id: row.id } });
      if (res.found && res.imageUrl) {
        setRows((prev) =>
          prev
            ? prev.map((r) =>
                r.id === row.id ? { ...r, imageUrl: res.imageUrl, updatedAt: new Date().toISOString() } : r,
              )
            : prev,
        );
        toast.success("Nova imagem encontrada e aplicada");
      } else {
        toast.info("Nenhuma imagem confiável encontrada");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na busca web");
    } finally {
      setSearchingId(null);
    }
  };

  const refreshImage = async (row: CatalogEntry) => {
    setRefreshingId(row.id);
    try {
      const res = await doForceRefresh({ data: { id: row.id } });
      if (res.imageUrl) {
        setRows((prev) =>
          prev
            ? prev.map((r) =>
                r.id === row.id
                  ? { ...r, imageUrl: res.imageUrl, updatedAt: new Date().toISOString() }
                  : r,
              )
            : prev,
        );
        toast.success(
          res.source === "web"
            ? "Imagem atualizada (web)"
            : "Imagem atualizada (IA)",
        );
      } else {
        toast.info("Não foi possível atualizar a imagem");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar imagem");
    } finally {
      setRefreshingId(null);
    }
  };




  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtered
              ? `${filtered.length} de ${counts.all} produto${counts.all === 1 ? "" : "s"}`
              : "Carregando…"}
          </CardTitle>
          <CardDescription>Buscar por nome, marca ou código de barras.</CardDescription>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produto…"
              className="pl-9"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {(
              [
                { key: "all", label: `Todos (${counts.all})` },
                { key: "without", label: `Sem foto (${counts.without})` },
                { key: "with", label: `Com foto (${counts.with})` },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPhotoFilter(opt.key)}
                className={
                  "rounded-full border px-3 py-1 text-xs transition-colors " +
                  (photoFilter === opt.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground/30")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {rows === null && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filtered?.map((row) => {
          const d = drafts[row.id] ?? {};
          const merged = { ...row, ...d };
          const dirty = Object.keys(d).length > 0;
          return (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-28 w-28 flex-none overflow-hidden rounded-md border bg-muted">
                    {merged.imageUrl ? (
                      <img
                        src={merged.imageUrl}
                        alt={merged.displayName}
                        width={112}
                        height={112}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        sem foto
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-28 text-xs"
                    onClick={() => setUploadDialogFor(row)}
                    title="Abrir uploader com prévia, validação e retry"
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Trocar foto
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-28 text-xs"
                    onClick={() => setPickerFor(row)}
                    disabled={searchingId === row.id}
                    title="Abrir galeria de imagens sugeridas pela IA na web"
                  >
                    {searchingId === row.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Globe className="mr-1 h-3 w-3" />
                    )}
                    Buscar web
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-28 text-xs"
                    onClick={() => void refreshImage(row)}
                    disabled={refreshingId === row.id}
                    title="Força re-busca da imagem (web + IA como fallback), mesmo se já houver foto"
                  >
                    {refreshingId === row.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    Atualizar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-28 text-xs"
                    onClick={async () => {
                      const url = await prompt({
                        title: `Colar URL da imagem`,
                        description: `Informe a URL para "${row.displayName}".`,
                        placeholder: "https://…",
                        defaultValue: row.imageUrl ?? "",
                        inputType: "url",
                        confirmLabel: "Aplicar",
                        validate: (v) =>
                          /^https?:\/\/.+/i.test(v.trim())
                            ? null
                            : "URL precisa começar com http:// ou https://",
                      });
                      if (!url) return;
                      const trimmed = url.trim();
                      try {
                        const res = await doApplyUrl({ data: { id: row.id, imageUrl: trimmed } });
                        patchImageLocal(row.id, res.imageUrl);
                        toast.success("Foto aplicada da URL");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Falha ao aplicar URL");
                      }
                    }}
                    title="Colar uma URL de imagem para usar como capa"
                  >
                    <LinkIcon className="mr-1 h-3 w-3" />
                    Colar URL
                  </Button>
                </div>


                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Nome de exibição</Label>
                    <Input
                      value={merged.displayName}
                      onChange={(e) => patchLocal(row.id, { displayName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Marca</Label>
                    <Input
                      value={merged.brand ?? ""}
                      onChange={(e) => patchLocal(row.id, { brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unidade padrão</Label>
                    <Input
                      value={merged.defaultUnit ?? ""}
                      onChange={(e) => patchLocal(row.id, { defaultUnit: e.target.value })}
                      placeholder="UN, KG, L…"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Código de barras</Label>
                    <Input
                      value={merged.barcode ?? ""}
                      onChange={(e) => patchLocal(row.id, { barcode: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="font-mono">
                        {row.normalizedName.slice(0, 40)}
                        {row.normalizedName.length > 40 ? "…" : ""}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveRow(row)}
                      disabled={!dirty || savingId === row.id}
                    >
                      {savingId === row.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-3 w-3" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PhotoUploadDialog
        open={uploadDialogFor !== null}
        onOpenChange={(v) => {
          if (!v) setUploadDialogFor(null);
        }}
        productId={uploadDialogFor?.id ?? ""}
        productName={uploadDialogFor?.displayName ?? ""}
        currentImageUrl={uploadDialogFor?.imageUrl ?? null}
        accessToken={accessToken}
        onUploaded={(imageUrl) => {
          if (!uploadDialogFor) return;
          patchImageLocal(uploadDialogFor.id, imageUrl);
          toast.success("Foto do produto atualizada");
        }}
        onWebSearchFallback={
          uploadDialogFor
            ? async () => {
                setUploadDialogFor(null);
                setPickerFor(uploadDialogFor);
              }
            : undefined
        }
        onFetchHistory={
          uploadDialogFor
            ? async () =>
                doHistory({ data: { catalogId: uploadDialogFor.id, limit: 30 } })
            : undefined
        }
      />

      <WebImagePickerDialog
        open={pickerFor !== null}
        onOpenChange={(v) => {
          if (!v) setPickerFor(null);
        }}
        productName={pickerFor?.displayName ?? ""}
        currentImageUrl={pickerFor?.imageUrl ?? null}
        onFetchCandidates={async () => {
          if (!pickerFor) return [];
          return doSuggest({ data: { id: pickerFor.id, count: 6 } });
        }}
        onSelect={async (url) => {
          if (!pickerFor) return;
          const res = await doApplyUrl({ data: { id: pickerFor.id, imageUrl: url } });
          patchImageLocal(pickerFor.id, res.imageUrl);
          toast.success("Foto aplicada da web");
        }}
        onFallbackAI={
          pickerFor
            ? async () => {
                const res = await doGenAI({ data: { id: pickerFor.id } });
                if (res.imageUrl) {
                  patchImageLocal(pickerFor.id, res.imageUrl);
                  toast.success("Imagem gerada por IA");
                }
              }
            : undefined
        }
      />
    </>
  );
}


function AlertsPanel() {
  const fetchAlerts = useServerFn(listBarcodeAlerts);
  const doConsolidate = useServerFn(consolidateBarcode);
  const [rows, setRows] = useState<BarcodeConflict[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    fetchAlerts()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar alertas"));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consolidate = async (barcode: string, masterId: string) => {
    setBusy(barcode);
    try {
      const res = await doConsolidate({ data: { barcode, masterId } });
      toast.success(`${res.mergedCount} duplicata(s) consolidada(s)`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na consolidação");
    } finally {
      setBusy(null);
    }
  };

  if (rows === null)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma inconsistência de código de barras encontrada. 🎉
        </CardContent>
      </Card>
    );

  return (
    <div className="grid gap-4">
      {rows.map((alert) => (
        <Card key={alert.barcode} className="border-warning/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Barcode <span className="font-mono">{alert.barcode}</span>
            </CardTitle>
            <CardDescription>
              {alert.entries.length} produtos com o mesmo código de barras e nomes divergentes.
              Escolha o mestre para consolidar em um único registro.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {alert.entries.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  {e.imageUrl && (
                    <img
                      src={e.imageUrl}
                      alt={e.displayName}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <div className="text-sm font-medium">{e.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {e.brand ?? "—"} · {e.normalizedName}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === alert.barcode}
                  onClick={() => consolidate(alert.barcode, e.id)}
                >
                  {busy === alert.barcode ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <GitMerge className="mr-1 h-3 w-3" />
                  )}
                  Usar como mestre
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MergePanel() {
  const fetchGroups = useServerFn(listLegacyDuplicates);
  const doMerge = useServerFn(mergeLegacyEntries);
  const [rows, setRows] = useState<LegacyDuplicate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, { masterId?: string; dupIds: string[] }>>(
    {},
  );

  const load = () =>
    fetchGroups()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar grupos"));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMaster = (key: string, id: string) =>
    setSelection((s) => ({
      ...s,
      [key]: {
        masterId: id,
        dupIds: (s[key]?.dupIds ?? []).filter((d) => d !== id),
      },
    }));

  const toggleDup = (key: string, id: string) =>
    setSelection((s) => {
      const cur = s[key] ?? { dupIds: [] };
      if (cur.masterId === id) return s;
      const has = cur.dupIds.includes(id);
      return {
        ...s,
        [key]: {
          masterId: cur.masterId,
          dupIds: has ? cur.dupIds.filter((d) => d !== id) : [...cur.dupIds, id],
        },
      };
    });

  const merge = async (key: string) => {
    const sel = selection[key];
    if (!sel?.masterId || sel.dupIds.length === 0) {
      toast.error("Selecione o mestre e ao menos uma duplicata");
      return;
    }
    setBusy(key);
    try {
      const res = await doMerge({
        data: { masterId: sel.masterId, duplicateIds: sel.dupIds },
      });
      toast.success(
        `${res.mergedCount} duplicata(s) mescladas · ${res.scansReassigned} leituras reatribuídas`,
      );
      setSelection((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na mesclagem");
    } finally {
      setBusy(null);
    }
  };

  if (rows === null)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma duplicata legada (sem código de barras) detectada.
        </CardContent>
      </Card>
    );

  return (
    <div className="grid gap-4">
      {rows.map((group) => {
        const sel = selection[group.key] ?? { dupIds: [] };
        return (
          <Card key={group.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Grupo <span className="font-mono">{group.key}</span>
              </CardTitle>
              <CardDescription>
                Escolha um mestre e marque as duplicatas. Leituras (scans) sem código de barras
                serão reatribuídas ao mestre.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {group.entries.map((e) => {
                const isMaster = sel.masterId === e.id;
                const isDup = sel.dupIds.includes(e.id);
                return (
                  <div
                    key={e.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${
                      isMaster ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {e.imageUrl && (
                        <img
                          src={e.imageUrl}
                          alt={e.displayName}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium">{e.displayName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.brand ?? "—"} · {e.normalizedName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isMaster ? "default" : "outline"}
                        onClick={() => setMaster(group.key, e.id)}
                      >
                        Mestre
                      </Button>
                      <Button
                        size="sm"
                        variant={isDup ? "destructive" : "outline"}
                        disabled={isMaster}
                        onClick={() => toggleDup(group.key, e.id)}
                      >
                        {isDup ? "Duplicata ✓" : "Marcar duplicata"}
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => merge(group.key)}
                  disabled={busy === group.key || !sel.masterId || sel.dupIds.length === 0}
                >
                  {busy === group.key ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <GitMerge className="mr-1 h-3 w-3" />
                  )}
                  Mesclar em {sel.dupIds.length} duplicata(s)
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ImagesPanel() {
  const fetchMissing = useServerFn(listMissingImages);
  const doGen = useServerFn(generateCatalogImage);
  const doGenAll = useServerFn(generateAllMissingImages);
  const doMark = useServerFn(markImageSearch);
  const doMarkAll = useServerFn(markAllMissingAsUnmatched);
  const doBulkWeb = useServerFn(enqueueBulkWebImageUpdate);
  const doScrapeAll = useServerFn(scrapeAllMissingImages);
  const doGetThreshold = useServerFn(getImageMatchThreshold);
  const doSetThreshold = useServerFn(setImageMatchThreshold);
  const navigate = useNavigate();
  const [rows, setRows] = useState<MissingImageEntry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [busyScrape, setBusyScrape] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [threshold, setThresholdState] = useState<number>(0.55);
  const [savingThreshold, setSavingThreshold] = useState(false);


  const load = () =>
    fetchMissing()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar"));

  useEffect(() => {
    void load();
    void doGetThreshold()
      .then((r) => setThresholdState(r.threshold))
      .catch(() => {
        /* mantém default 0.55 */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveThreshold = async (value: number) => {
    setSavingThreshold(true);
    try {
      const r = await doSetThreshold({ data: { threshold: value } });
      setThresholdState(r.threshold);
      toast.success(`Limiar salvo: ${(r.threshold * 100).toFixed(0)}%`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar limiar");
    } finally {
      setSavingThreshold(false);
    }
  };


  const eligibleCount = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => r.imageSearchAttemptedAt !== null && r.imageSearchFound === false,
      ).length,
    [rows],
  );
  const pendingSearch = useMemo(
    () => (rows ?? []).filter((r) => r.imageSearchAttemptedAt === null).length,
    [rows],
  );

  const genOne = async (id: string) => {
    setBusy(id);
    try {
      await doGen({ data: { id } });
      toast.success("Imagem gerada");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar");
    } finally {
      setBusy(null);
    }
  };

  const genAll = async () => {
    setBusyAll(true);
    try {
      const res = await doGenAll();
      toast.success(
        `${res.generated} imagens geradas · ${res.failed} falharam · ${res.skipped} aguardando decisão`,
      );
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na geração em lote");
    } finally {
      setBusyAll(false);
    }
  };

  const markOne = async (id: string, found: boolean) => {
    setBusy(id);
    try {
      await doMark({ data: { id, found } });
      toast.success(found ? "Marcado como encontrado" : "Marcado como não encontrado");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar");
    } finally {
      setBusy(null);
    }
  };

  const markAll = async () => {
    setBusyAll(true);
    try {
      const res = await doMarkAll();
      toast.success(`${res.marked} produto(s) marcado(s) para IA`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar em lote");
    } finally {
      setBusyAll(false);
    }
  };

  const scrapeAll = async () => {
    setBusyScrape(true);
    const totals = { processed: 0, filled: 0, notFound: 0, belowThreshold: 0, failed: 0 };
    try {
      toast.info(
        `Buscando capas na web (limiar ${(threshold * 100).toFixed(0)}%)… só anexa se passar do score.`,
      );
      for (let i = 0; i < 40; i++) {
        const res = await doScrapeAll({ data: { limit: 8, threshold } });
        totals.processed += res.processed;
        totals.filled += res.filled;
        totals.notFound += res.notFound;
        totals.belowThreshold += res.belowThreshold;
        totals.failed += res.failed;
        toast.message(
          `Lote ${i + 1}: +${res.filled} anexada(s) · ${res.belowThreshold} abaixo do limiar · ${totals.filled} total`,
        );
        void load();
        if (res.processed === 0) break;
      }
      toast.success(
        `Finalizado — ${totals.filled} anexada(s) · ${totals.belowThreshold} abaixo do limiar · ${totals.notFound} sem candidata · ${totals.failed} erro(s)`,
      );
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no scrape em lote");
    } finally {
      setBusyScrape(false);
    }
  };


  if (rows === null)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {rows.length} produto{rows.length === 1 ? "" : "s"} sem imagem
            </CardTitle>
            <CardDescription>
              A IA só gera imagens para produtos marcados como &quot;não encontrada na web&quot; (
              <strong>{eligibleCount}</strong> elegível{eligibleCount === 1 ? "" : "s"}).{" "}
              <strong>{pendingSearch}</strong> aguarda{pendingSearch === 1 ? "" : "m"} decisão.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link to="/admin/image-jobs">Fila em lote</Link>
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => setBulkOpen(true)}
              className="bg-primary"
            >
              <Globe className="mr-1 h-3 w-3" />
              Atualizar fotos em lote na web
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={scrapeAll}
              disabled={busyScrape || rows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              title={`Só anexa se score ≥ ${(threshold * 100).toFixed(0)}%`}
            >
              {busyScrape ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Globe className="mr-1 h-3 w-3" />
              )}
              Buscar capas na web ({(threshold * 100).toFixed(0)}%)
            </Button>




            <Button
              size="sm"
              variant="outline"
              onClick={markAll}
              disabled={busyAll || pendingSearch === 0}
            >
              {busyAll ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              Marcar todos pendentes como não encontrados
            </Button>
            <Button size="sm" onClick={genAll} disabled={busyAll || eligibleCount === 0}>
              {busyAll ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              Gerar {eligibleCount} elegível{eligibleCount === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="mb-2 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <div className="font-medium">Limite de confiança para anexar automaticamente</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={threshold}
            onChange={(e) => setThresholdState(Number(e.target.value))}
            className="h-1 flex-1 min-w-[160px] cursor-pointer accent-emerald-600"
            aria-label="Limite mínimo de score"
          />
          <div className="tabular-nums font-mono w-10 text-right">
            {(threshold * 100).toFixed(0)}%
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void saveThreshold(threshold)}
            disabled={savingThreshold}
          >
            {savingThreshold ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            Salvar limite
          </Button>
          <div className="w-full text-[11px] text-muted-foreground">
            Score combina nome (Jaccard), marca, código de barras e domínio do varejo.
            Match de código de barras força score ≥ 90%. Recomendado: 55–70%.
          </div>
        </div>

        {rows.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Todos os produtos têm imagem. 🎉
          </div>
        )}
        {rows.map((r) => {
          const eligible =
            r.imageSearchAttemptedAt !== null && r.imageSearchFound === false;
          const pending = r.imageSearchAttemptedAt === null;
          return (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.displayName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.brand ?? "—"} ·{" "}
                  {pending ? (
                    <Badge variant="outline" className="ml-1">
                      aguardando busca
                    </Badge>
                  ) : eligible ? (
                    <Badge variant="secondary" className="ml-1">
                      pronto p/ IA
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-1">
                      busca ok
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {pending && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id || busyAll}
                    onClick={() => markOne(r.id, false)}
                  >
                    <XCircle className="mr-1 h-3 w-3" /> Não encontrada
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id || busyAll || !eligible}
                  onClick={() => genOne(r.id)}
                  title={
                    eligible
                      ? "Gerar imagem via IA"
                      : "Marque como não encontrada antes de gerar"
                  }
                >
                  {busy === r.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3 w-3" />
                  )}
                  Gerar IA
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
    <BulkPhotoUpdateDialog
      open={bulkOpen}
      onOpenChange={setBulkOpen}
      onConfirm={async (cfg) => {
        const res = await doBulkWeb({ data: cfg });
        toast.success(`${res.enqueued} produto(s) enfileirado(s)`);
        void navigate({ to: "/admin/image-jobs" });
        return res;
      }}
    />
    </>
  );
}


function ReviewPanel() {
  const fetchList = useServerFn(listRecentImageChanges);
  const doUpload = useServerFn(uploadCatalogImage);
  const doMark = useServerFn(markImageSearch);
  const [rows, setRows] = useState<RecentImageChange[] | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = () =>
    fetchList({ data: { limit: 30 } })
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar revisão"));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadReplacement = async (catalogId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5MB");
      return;
    }
    setUploadingId(catalogId);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await doUpload({ data: { id: catalogId, dataUrl } });
      toast.success("Foto substituída");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar imagem");
    } finally {
      setUploadingId(null);
    }
  };

  const approve = async (catalogId: string) => {
    try {
      await doMark({ data: { id: catalogId, found: true } });
      toast.success("Imagem aprovada");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aprovar");
    }
  };

  if (rows === null)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma alteração recente de imagem para revisar.
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {rows.length} alteração{rows.length === 1 ? "" : "ões"} recente
          {rows.length === 1 ? "" : "s"} de imagem
        </CardTitle>
        <CardDescription>
          Compare a foto anterior com a nova. Aprove, ou envie um upload manual para substituir.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map((r) => (
          <div key={r.auditId} className="rounded-md border p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.displayName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.brand ?? "—"} ·{" "}
                  <Badge variant="outline" className="uppercase">
                    {r.action === "image_generated" ? "IA" : "upload"}
                  </Badge>{" "}
                  {r.imageSource && (
                    <Badge variant="secondary" className="ml-1 uppercase">
                      {r.imageSource}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div>{new Date(r.createdAt).toLocaleString("pt-BR")}</div>
                <div>{r.actorEmail ?? "sistema"}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                  Anterior
                </div>
                <div className="flex h-32 items-center justify-center overflow-hidden rounded border bg-muted">
                  {r.oldImageUrl ? (
                    <img
                      src={r.oldImageUrl}
                      alt="anterior"
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">sem foto</span>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">Atual</div>
                <div className="flex h-32 items-center justify-center overflow-hidden rounded border bg-muted">
                  {r.newImageUrl ? (
                    <img
                      src={r.newImageUrl}
                      alt="atual"
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">sem foto</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => approve(r.catalogId)}
                disabled={uploadingId === r.catalogId}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" /> Aprovar
              </Button>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadReplacement(r.catalogId, f);
                    e.target.value = "";
                  }}
                />
                <span
                  role="button"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  {uploadingId === r.catalogId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Substituir por upload
                </span>
              </label>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AuditPanel() {
  const fetchAudit = useServerFn(listCatalogAudit);
  const [rows, setRows] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    fetchAudit({ data: { limit: 200 } })
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar auditoria"));
  }, [fetchAudit]);

  if (rows === null)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum evento de auditoria registrado ainda.
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Log de auditoria</CardTitle>
        <CardDescription>Últimas alterações no catálogo (200 registros).</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="uppercase">
                  {r.action}
                </Badge>
                {r.field && <span className="font-mono text-xs">{r.field}</span>}
                {r.catalogDisplayName && (
                  <span className="text-xs text-muted-foreground">· {r.catalogDisplayName}</span>
                )}
              </div>
              {(r.oldValue !== null || r.newValue !== null) && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <span className="line-through">{r.oldValue ?? "—"}</span>
                  {" → "}
                  <span className="text-foreground">{r.newValue ?? "—"}</span>
                </div>
              )}
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <div>{new Date(r.createdAt).toLocaleString("pt-BR")}</div>
              <div>{r.actorEmail ?? r.actorUserId ?? "sistema"}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GalleryPanel() {
  const fetchList = useServerFn(listCatalog);
  const [rows, setRows] = useState<CatalogEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("with");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchList()
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar catálogo"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchList]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "with" && !r.imageUrl) return false;
      if (filter === "without" && r.imageUrl) return false;
      if (!term) return true;
      return (
        r.displayName.toLowerCase().includes(term) ||
        (r.brand ?? "").toLowerCase().includes(term) ||
        (r.barcode ?? "").includes(term)
      );
    });
  }, [rows, q, filter]);

  const counts = useMemo(() => {
    if (!rows) return { total: 0, withPhoto: 0, without: 0 };
    let withPhoto = 0;
    for (const r of rows) if (r.imageUrl) withPhoto++;
    return { total: rows.length, withPhoto, without: rows.length - withPhoto };
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" /> Galeria de capas
        </CardTitle>
        <CardDescription>
          Revise visualmente todas as capas dos produtos. {counts.total} produtos ·{" "}
          {counts.withPhoto} com foto · {counts.without} sem foto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, marca ou código de barras…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Todos ({counts.total})
            </Button>
            <Button
              size="sm"
              variant={filter === "with" ? "default" : "outline"}
              onClick={() => setFilter("with")}
            >
              Com foto ({counts.withPhoto})
            </Button>
            <Button
              size="sm"
              variant={filter === "without" ? "default" : "outline"}
              onClick={() => setFilter("without")}
            >
              Sem foto ({counts.without})
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {filtered && filtered.length === 0 && !loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-primary/50"
                title={r.displayName}
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt={r.displayName}
                      loading="lazy"
                      className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      sem foto
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-2">
                  <div className="line-clamp-2 text-[12px] font-medium leading-tight text-foreground">
                    {r.displayName}
                  </div>
                  {r.brand && (
                    <div className="truncate text-[11px] text-muted-foreground">{r.brand}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
