/**
 * Admin — Aparência das categorias (edição em lote).
 *
 * Permite editar rótulo + ícone de várias categorias antes de salvar:
 * as mudanças ficam em um rascunho local (com pré-visualização ao vivo)
 * e só vão ao banco quando o admin confirma "Salvar alterações".
 */
import { PRODUCT_CATEGORIES, categoryLabel } from "@/lib/product-category";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  saveCategoryAppearanceBatch,
  type CategoryIconOverride,
} from "@/lib/category-icons.functions";
import { uploadImageDataUrl } from "@/lib/storage.functions";
import { LUCIDE_PRESET, LUCIDE_PRESET_NAMES, resolveLucide } from "@/lib/category-icons-preset";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Sparkles,
  Save,
  AlertTriangle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: { slug: string; label: string }[] = PRODUCT_CATEGORIES.filter(
  (slug) => slug !== "outros",
).map((slug) => ({ slug, label: categoryLabel(slug) }));

/** Rascunho por categoria: rótulo customizado + ícone customizado. */
type Draft = {
  label: string | null;
  icon: { kind: "lucide" | "url"; value: string } | null;
};

export const Route = createFileRoute("/admin_/icones-categoria")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Rótulos e ícones de categoria — Admin" },
      {
        name: "description",
        content: "Edite em lote os rótulos e ícones exibidos nas categorias do catálogo.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Gate,
});

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
            <Button asChild variant="outline"><Link to="/admin">Voltar</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <Page />;
}

/** Valida um rascunho e devolve a mensagem de erro (ou null). */
function validateDraft(d: Draft): string | null {
  if (d.label !== null) {
    const t = d.label.trim();
    if (t.length < 2) return "Rótulo precisa de ao menos 2 caracteres";
    if (t.length > 40) return "Rótulo excede 40 caracteres";
  }
  if (d.icon?.kind === "url" && !/^(https?:\/\/|\/)/i.test(d.icon.value.trim())) {
    return "URL da imagem deve começar com https:// ou /";
  }
  if (d.icon?.kind === "lucide" && !resolveLucide(d.icon.value)) {
    return "Ícone da biblioteca não encontrado";
  }
  return null;
}

function Page() {
  const qc = useQueryClient();
  const overridesQ = useQuery({
    queryKey: ["category-icon-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_icon_overrides")
        .select("slug, kind, value, label, updated_at");
      if (error) throw error;
      const map = new Map<string, CategoryIconOverride>();
      for (const row of (data ?? []) as unknown as CategoryIconOverride[]) map.set(row.slug, row);
      return map;
    },
  });

  const saveBatch = useServerFn(saveCategoryAppearanceBatch);
  const upload = useServerFn(uploadImageDataUrl);

  /** Estado salvo no banco, convertido em rascunho base. */
  const baseline = useMemo(() => {
    const map = new Map<string, Draft>();
    for (const c of CATEGORIES) {
      const ov = overridesQ.data?.get(c.slug);
      map.set(c.slug, {
        label: ov?.label?.trim() ? ov.label.trim() : null,
        icon: ov?.kind && ov.value ? { kind: ov.kind, value: ov.value } : null,
      });
    }
    return map;
  }, [overridesQ.data]);

  const [drafts, setDrafts] = useState<Map<string, Draft>>(new Map());
  const [editing, setEditing] = useState<{ slug: string; label: string } | null>(null);

  const current = (slug: string): Draft =>
    drafts.get(slug) ?? baseline.get(slug) ?? { label: null, icon: null };

  const setDraft = (slug: string, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(slug, { ...current(slug), ...patch });
      return next;
    });
  };

  const resetDraft = (slug: string) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.delete(slug);
      return next;
    });
  };

  /** Somente categorias realmente alteradas em relação ao banco. */
  const changed = useMemo(() => {
    const out: { slug: string; draft: Draft; error: string | null }[] = [];
    for (const [slug, draft] of drafts) {
      const base = baseline.get(slug) ?? { label: null, icon: null };
      const same =
        base.label === draft.label &&
        base.icon?.kind === draft.icon?.kind &&
        base.icon?.value === draft.icon?.value;
      if (!same) out.push({ slug, draft, error: validateDraft(draft) });
    }
    return out;
  }, [drafts, baseline]);

  const errors = changed.filter((c) => c.error);

  const saveMut = useMutation({
    mutationFn: () =>
      saveBatch({
        data: {
          items: changed.map(({ slug, draft }) => ({
            slug,
            label: draft.label?.trim() ? draft.label.trim() : null,
            icon: draft.icon
              ? { kind: draft.icon.kind, value: draft.icon.value.trim() }
              : null,
          })),
        },
      }),
    onSuccess: (res) => {
      setDrafts(new Map());
      qc.invalidateQueries({ queryKey: ["category-icon-overrides"] });
      toast.success(
        `Aparência atualizada — ${res.saved} personalizada(s), ${res.removed} restaurada(s)`,
      );
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 md:py-10">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin"><ArrowLeft className="mr-1 h-4 w-4" /> Painel</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Rótulos e ícones de categoria</h1>
          <p className="text-sm text-muted-foreground">
            Edite vários itens de uma vez: altere o nome exibido e o ícone, confira a
            pré-visualização e salve tudo em um único envio.
          </p>
        </div>

        {overridesQ.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => {
              const draft = current(c.slug);
              const base = baseline.get(c.slug) ?? { label: null, icon: null };
              const isDirty = changed.some((x) => x.slug === c.slug);
              const err = isDirty ? validateDraft(draft) : null;
              const shownLabel = draft.label?.trim() || c.label;
              return (
                <Card
                  key={c.slug}
                  className={cn(
                    "p-3 transition",
                    isDirty && !err && "border-primary/60 ring-1 ring-primary/20",
                    err && "border-destructive/60 ring-1 ring-destructive/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <DraftIcon draft={draft} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
                          {c.slug}
                        </span>
                        {isDirty ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            alterado
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`lbl-${c.slug}`} className="text-[11px] text-muted-foreground">
                          Rótulo exibido
                        </Label>
                        <Input
                          id={`lbl-${c.slug}`}
                          value={draft.label ?? ""}
                          placeholder={c.label}
                          maxLength={40}
                          onChange={(e) =>
                            setDraft(c.slug, { label: e.target.value === "" ? null : e.target.value })
                          }
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditing({ slug: c.slug, label: shownLabel })}
                        >
                          <Sparkles className="mr-1 h-3.5 w-3.5" /> Ícone
                        </Button>
                        {draft.icon || draft.label ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDraft(c.slug, { label: null, icon: null })}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Padrão
                          </Button>
                        ) : null}
                        {isDirty ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => resetDraft(c.slug)}
                          >
                            Desfazer
                          </Button>
                        ) : null}
                      </div>

                      {err ? (
                        <p className="flex items-center gap-1 text-[11px] text-destructive">
                          <AlertTriangle className="h-3 w-3" /> {err}
                        </p>
                      ) : (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {draft.icon
                            ? draft.icon.kind === "url"
                              ? "Ícone: imagem"
                              : `Ícone: ${draft.icon.value}`
                            : "Ícone padrão"}
                          {base.label && !draft.label ? " · rótulo será restaurado" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Barra fixa de confirmação */}
      {changed.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{changed.length}</strong> categoria(s) com
              alterações pendentes
              {errors.length ? (
                <span className="text-destructive"> · {errors.length} com erro</span>
              ) : null}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDrafts(new Map())} disabled={saveMut.isPending}>
                Descartar
              </Button>
              <Button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || errors.length > 0}
              >
                {saveMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <EditDialog
          category={editing}
          current={current(editing.slug).icon}
          onClose={() => setEditing(null)}
          onSave={(payload) => {
            setDraft(editing.slug, { icon: payload });
            setEditing(null);
          }}
          onUpload={async (dataUrl) => {
            const ext = /image\/(png|jpe?g|svg\+xml|webp|gif)/.exec(dataUrl)?.[1] ?? "png";
            const cleanExt = ext === "svg+xml" ? "svg" : ext === "jpeg" ? "jpg" : ext;
            const path = `category-icons/${editing.slug}-${Date.now()}.${cleanExt}`;
            const res = await upload({ data: { bucket: "logos", path, dataUrl } });
            return res.publicUrl;
          }}
        />
      ) : null}
    </AppShell>
  );
}

/** Pré-visualização do ícone conforme o rascunho atual. */
function DraftIcon({ draft }: { draft: Draft }) {
  const Icon = draft.icon?.kind === "lucide" ? resolveLucide(draft.icon.value) : null;
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-secondary text-foreground">
      {draft.icon?.kind === "url" ? (
        <img src={draft.icon.value} alt="" className="h-7 w-7 object-contain" />
      ) : Icon ? (
        <Icon className="h-6 w-6" aria-hidden />
      ) : (
        <Package className="h-6 w-6 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}

function EditDialog({
  category,
  current,
  onClose,
  onSave,
  onUpload,
}: {
  category: { slug: string; label: string };
  current: { kind: "lucide" | "url"; value: string } | null;
  onClose: () => void;
  onSave: (payload: { kind: "lucide" | "url"; value: string }) => void;
  onUpload: (dataUrl: string) => Promise<string>;
}) {
  const [tab, setTab] = useState<"lucide" | "upload" | "url">(
    current?.kind === "url" ? "url" : "lucide",
  );
  const [selectedLucide, setSelectedLucide] = useState<string>(
    current?.kind === "lucide" ? current.value : "shopping-basket",
  );
  const [urlValue, setUrlValue] = useState<string>(current?.kind === "url" ? current.value : "");
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filtered = LUCIDE_PRESET_NAMES.filter((n) =>
    n.toLowerCase().includes(filter.toLowerCase()),
  );

  async function handleFile(file: File) {
    if (file.size > 512 * 1024) {
      toast.error("Imagem grande demais (máx 512KB)");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const url = await onUpload(dataUrl);
      setUrlValue(url);
      setTab("url");
      toast.success("Upload concluído — aplique e salve no fim");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function handleApply() {
    if (tab === "lucide") {
      onSave({ kind: "lucide", value: selectedLucide });
      return;
    }
    const v = urlValue.trim();
    if (!v) {
      toast.error("Informe uma URL ou faça upload");
      return;
    }
    if (!/^(https?:\/\/|\/)/i.test(v)) {
      toast.error("URL deve começar com https:// ou /");
      return;
    }
    onSave({ kind: "url", value: v });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ícone de {category.label}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b">
          {(
            [
              { id: "lucide", label: "Biblioteca", icon: Sparkles },
              { id: "upload", label: "Upload", icon: Upload },
              { id: "url", label: "URL", icon: LinkIcon },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px",
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "lucide" ? (
          <div className="space-y-3">
            <Input placeholder="Filtrar ícones…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="grid max-h-[320px] grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
              {filtered.map((name) => {
                const Icon = LUCIDE_PRESET[name];
                const active = selectedLucide === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedLucide(name)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg border transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                    title={name}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Nenhum ícone encontrado
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "upload" ? (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="outline" className="w-full">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Selecionar arquivo (PNG, SVG, JPG · até 512KB)
            </Button>
            {urlValue ? (
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-2">Prévia</div>
                <img src={urlValue} alt="" className="mx-auto h-20 w-20 object-contain" />
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "url" ? (
          <div className="space-y-3">
            <Label>URL da imagem</Label>
            <Input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://…"
            />
            {urlValue ? (
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-2">Prévia</div>
                <img
                  src={urlValue}
                  alt=""
                  className="mx-auto h-20 w-20 object-contain"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleApply} disabled={uploading}>Aplicar ao rascunho</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
