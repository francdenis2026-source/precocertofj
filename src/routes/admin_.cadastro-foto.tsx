import { PRODUCT_CATEGORIES } from "@/lib/product-category";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminBeforeLoad } from "@/lib/route-guards";
import { analyzeProductImage, type VisionProduct } from "@/lib/vision.functions";
import { savePhotoToCatalog } from "@/lib/photo-catalog.functions";
import { fillMissingFromName } from "@/lib/auto-classify";

import { ArrowLeft, Camera, Loader2, Sparkles, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/brand/AppShell";

export const Route = createFileRoute("/admin_/cadastro-foto")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Cadastro por foto (IA) — Admin PreçoCerto" },
      { name: "description", content: "Cadastro assistido por IA a partir de fotos dos produtos." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AppShell scope="admin">
      <CadastroFotoPage />
    </AppShell>
  ),
});

const CATEGORIES = [...PRODUCT_CATEGORIES];

type Draft = VisionProduct & { _uid: string; _saved?: boolean; _saving?: boolean };

function CadastroFotoPage() {
  const analyze = useServerFn(analyzeProductImage);
  const save = useServerFn(savePhotoToCatalog);

  const [preview, setPreview] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  const onFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máximo 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl);
      setAnalyzing(true);
      try {
        const res = await analyze({ data: { image: dataUrl } });
        if (!res.products.length) {
          toast.error("A IA não conseguiu identificar produtos nesta foto.");
          return;
        }

        // Preservação inteligente: não sobrescreve campos já editados manualmente.
        // - Se o produto detectado (mesmo nome, case-insensitive) já existe como rascunho,
        //   apenas preenche campos ainda vazios com a sugestão da IA.
        // - Produtos novos são acrescentados ao final da lista (não substituem).
        setDrafts((prev) => {
          const byName = new Map(
            prev.map((d) => [(d.productName ?? "").trim().toLowerCase(), d] as const),
          );
          const merged: Draft[] = [...prev];
          let added = 0;
          let filled = 0;

          res.products.forEach((p, i) => {
            const key = (p.productName ?? "").trim().toLowerCase();
            const existing = key ? byName.get(key) : undefined;

            if (existing && !existing._saved) {
              // preencher só o que está vazio, sem tocar em campos editados pelo usuário
              const patch: Partial<Draft> = {};
              (["brand", "unit", "price", "barcode", "category"] as const).forEach((k) => {
                if ((existing[k] ?? "") === "" || existing[k] == null) {
                  if (p[k] != null && p[k] !== "") {
                    (patch as Record<string, unknown>)[k] = p[k];
                    filled++;
                  }
                }
              });
              if (Object.keys(patch).length) {
                const idx = merged.findIndex((d) => d._uid === existing._uid);
                merged[idx] = { ...existing, ...patch };
              }
            } else {
              // Classificação automática local completa o que a IA deixou vazio
              // (categoria, marca e unidade), reduzindo digitação manual.
              merged.push(fillMissingFromName({ ...p, _uid: `${Date.now()}-${i}` }));
              added++;
            }
          });


          const parts: string[] = [];
          if (added) parts.push(`${added} novo(s)`);
          if (filled) parts.push(`${filled} campo(s) preenchido(s)`);
          toast.success(
            parts.length
              ? `IA: ${parts.join(" · ")} (confiança ${res.confidence})`
              : `Nada novo a adicionar (confiança ${res.confidence})`,
          );
          return merged;
        });
      } catch (e) {
        toast.error(`Falha na análise: ${(e as Error).message}`);
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateDraft = (uid: string, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d) => (d._uid === uid ? { ...d, ...patch } : d)));
  };

  const removeDraft = (uid: string) => {
    setDrafts((prev) => prev.filter((d) => d._uid !== uid));
  };

  const addManual = () => {
    setDrafts((prev) => [
      ...prev,
      {
        _uid: `manual-${Date.now()}`,
        productName: "",
        brand: null,
        unit: null,
        price: null,
        barcode: null,
        category: null,
      },
    ]);
  };

  const saveDraft = async (d: Draft) => {
    if (!d.productName || d.productName.trim().length < 2) {
      toast.error("Informe o nome do produto");
      return;
    }
    updateDraft(d._uid, { _saving: true });
    try {
      const res = await save({
        data: {
          displayName: d.productName,
          brand: d.brand,
          category: d.category,
          barcode: d.barcode,
          defaultUnit: d.unit,
          imageUrl: imageUrl || null,
        },
      });
      toast.success(res.created ? `Adicionado: ${res.displayName}` : `Atualizado: ${res.displayName}`);
      updateDraft(d._uid, { _saved: true, _saving: false });
    } catch (e) {
      updateDraft(d._uid, { _saving: false });
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const saveAll = async () => {
    for (const d of drafts) {
      if (!d._saved) await saveDraft(d);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            to="/admin"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Cadastro por foto (IA)</h1>
            <p className="text-[12.5px] text-muted-foreground">
              Envie uma foto do produto — a IA sugere nome, marca, categoria e código de barras.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-primary/5">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            {preview ? (
              <img src={preview} alt="preview" className="max-h-64 rounded-lg object-contain" />
            ) : (
              <>
                <Camera className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Tirar foto ou escolher imagem</p>
                <p className="text-[12.5px] text-muted-foreground">JPG/PNG até 8MB · produto único ou prateleira</p>
              </>
            )}
          </label>

          {analyzing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando com IA...
            </div>
          )}

          {preview && !analyzing && (
            <div className="mt-4 space-y-2">
              <label className="block text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                URL da imagem para o catálogo (opcional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... (deixe vazio para usar sem imagem)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
        </section>

        {drafts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                <Sparkles className="mr-1 inline h-4 w-4 text-primary" />
                Sugestões da IA ({drafts.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={addManual}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <Plus className="h-3 w-3" /> Adicionar manual
                </button>
                <button
                  onClick={saveAll}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Save className="h-3 w-3" /> Salvar todos
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {drafts.map((d) => (
                <div
                  key={d._uid}
                  className={`rounded-2xl border p-4 ${
                    d._saved ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"
                  }`}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Field
                      label="Nome"
                      value={d.productName ?? ""}
                      onChange={(v) =>
                        setDrafts((prev) =>
                          prev.map((item) =>
                            item._uid === d._uid
                              ? fillMissingFromName({ ...item, productName: v })
                              : item,
                          ),
                        )
                      }

                      full
                    />
                    <Field label="Marca" value={d.brand ?? ""} onChange={(v) => updateDraft(d._uid, { brand: v })} />
                    <SelectField
                      label="Categoria"
                      value={d.category ?? ""}
                      onChange={(v) => updateDraft(d._uid, { category: v || null })}
                      options={CATEGORIES}
                    />
                    <Field label="Unidade" value={d.unit ?? ""} onChange={(v) => updateDraft(d._uid, { unit: v })} />
                    <Field
                      label="Código de barras"
                      value={d.barcode ?? ""}
                      onChange={(v) => updateDraft(d._uid, { barcode: v })}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <button
                      onClick={() => removeDraft(d._uid)}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                    <button
                      onClick={() => saveDraft(d)}
                      disabled={d._saving || d._saved}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {d._saving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : d._saved ? (
                        "Salvo"
                      ) : (
                        <>
                          <Save className="h-3 w-3" /> Salvar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <label className={`block text-xs ${full ? "col-span-2" : ""}`}>
      <span className="mb-1 block font-semibold text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
