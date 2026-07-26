import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  upsertCategoryIcon,
  deleteCategoryIcon,
  type CategoryIconOverride,
} from "@/lib/category-icons.functions";
import { uploadImageDataUrl } from "@/lib/storage.functions";
import { LUCIDE_PRESET, LUCIDE_PRESET_NAMES, resolveLucide } from "@/lib/category-icons-preset";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import { CategoryIcon } from "@/components/home/CategoryIcon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Link as LinkIcon, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "hortifruti", label: "Hortifruti" },
  { slug: "carnes", label: "Carnes" },
  { slug: "mercearia", label: "Mercearia" },
  { slug: "laticinios", label: "Laticínios" },
  { slug: "padaria", label: "Padaria" },
  { slug: "bebidas", label: "Bebidas" },
  { slug: "bebidas_em_po", label: "Bebidas em pó" },
  { slug: "biscoitos", label: "Biscoitos" },
  { slug: "doces", label: "Doces" },
  { slug: "congelados", label: "Congelados" },
  { slug: "higiene", label: "Higiene" },
  { slug: "limpeza", label: "Limpeza" },
];

export const Route = createFileRoute("/admin_/icones-categoria")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Ícones de categoria — Admin" },
      { name: "description", content: "Personalize os ícones exibidos nas categorias da home." },
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

function Page() {
  const qc = useQueryClient();
  const overridesQ = useQuery({
    queryKey: ["category-icon-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_icon_overrides")
        .select("slug, kind, value, updated_at");
      if (error) throw error;
      const map = new Map<string, CategoryIconOverride>();
      for (const row of (data ?? []) as CategoryIconOverride[]) map.set(row.slug, row);
      return map;
    },
  });

  const upsert = useServerFn(upsertCategoryIcon);
  const remove = useServerFn(deleteCategoryIcon);
  const upload = useServerFn(uploadImageDataUrl);

  const upsertMut = useMutation({
    mutationFn: (input: { slug: string; kind: "lucide" | "url"; value: string }) =>
      upsert({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category-icon-overrides"] });
      toast.success("Ícone atualizado");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) => remove({ data: { slug } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["category-icon-overrides"] });
      toast.success("Ícone restaurado");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const [editing, setEditing] = useState<{ slug: string; label: string } | null>(null);

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <Link to="/admin"><ArrowLeft className="mr-1 h-4 w-4" /> Painel</Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">Ícones de categoria</h1>
            <p className="text-sm text-muted-foreground">
              Personalize os ícones exibidos nas categorias da home. Escolha um ícone da biblioteca, envie sua própria imagem ou informe uma URL.
            </p>
          </div>
        </div>

        {overridesQ.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {CATEGORIES.map((c) => {
              const ov = overridesQ.data?.get(c.slug);
              return (
                <Card key={c.slug} className="p-3">
                  <div className="flex flex-col items-center gap-3">
                    <div className="group">
                      <CategoryIcon slug={c.slug} />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {ov?.kind === "url" ? "Imagem" : ov?.kind === "lucide" ? `Lucide · ${ov.value}` : "Padrão"}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                        <Sparkles className="mr-1 h-3.5 w-3.5" /> Alterar
                      </Button>
                      {ov ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMut.mutate(c.slug)}
                          disabled={deleteMut.isPending}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Padrão
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {editing ? (
        <EditDialog
          category={editing}
          current={overridesQ.data?.get(editing.slug)}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await upsertMut.mutateAsync({ slug: editing.slug, ...payload });
            setEditing(null);
          }}
          onUpload={async (dataUrl) => {
            const ext = /image\/(png|jpe?g|svg\+xml|webp|gif)/.exec(dataUrl)?.[1] ?? "png";
            const cleanExt = ext === "svg+xml" ? "svg" : ext === "jpeg" ? "jpg" : ext;
            const path = `category-icons/${editing.slug}-${Date.now()}.${cleanExt}`;
            const res = await upload({ data: { bucket: "logos", path, dataUrl } });
            return res.publicUrl;
          }}
          saving={upsertMut.isPending}
        />
      ) : null}
    </AppShell>
  );
}

function EditDialog({
  category,
  current,
  onClose,
  onSave,
  onUpload,
  saving,
}: {
  category: { slug: string; label: string };
  current: CategoryIconOverride | undefined;
  onClose: () => void;
  onSave: (payload: { kind: "lucide" | "url"; value: string }) => Promise<void>;
  onUpload: (dataUrl: string) => Promise<string>;
  saving: boolean;
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
      toast.success("Upload concluído — clique em Salvar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (tab === "lucide") {
      await onSave({ kind: "lucide", value: selectedLucide });
    } else {
      if (!urlValue.trim()) {
        toast.error("Informe uma URL ou faça upload");
        return;
      }
      await onSave({ kind: "url", value: urlValue.trim() });
    }
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
            {urlValue && resolveLucide(urlValue) === null ? (
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
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
