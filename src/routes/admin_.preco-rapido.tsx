import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Barcode, Camera, Check, Loader2, Save, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
import {
  quickRegisterPrice,
  quickSuggestProducts,
  type QuickSuggestion,
} from "@/lib/quick-price.functions";
import { analyzeProductImage, type VisionExtract } from "@/lib/vision.functions";
import {
  listPublicEstablishments,
  type EstablishmentsOverview,
} from "@/lib/establishments-public.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/preco-rapido")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Registro rápido de preços — Admin PreçoCerto" },
      {
        name: "description",
        content: "Registre preços em poucos cliques com sugestão de produto, código de barras e foto.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Navigate to="/admin/precos" search={{ tab: "rapido" } as never} replace />,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

type Saved = { name: string; price: number; store: string; at: number };

export function QuickPricePage() {
  const suggest = useServerFn(quickSuggestProducts);
  const register = useServerFn(quickRegisterPrice);
  const analyze = useServerFn(analyzeProductImage);
  const fetchStores = useServerFn(listPublicEstablishments);

  const [storeId, setStoreId] = useState<string>("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [barcode, setBarcode] = useState("");
  const [debounced, setDebounced] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const storesQ = useQuery({
    queryKey: ["quick-price-stores"],
    queryFn: () => fetchStores() as Promise<EstablishmentsOverview>,
    staleTime: 10 * 60_000,
  });
  const stores = useMemo(() => storesQ.data?.items ?? [], [storesQ.data]);

  useEffect(() => {
    if (!storeId && stores.length) setStoreId(stores[0].id);
  }, [stores, storeId]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(name.trim()), 250);
    return () => clearTimeout(t);
  }, [name]);

  const suggestionsQ = useQuery({
    queryKey: ["quick-price-suggest", debounced, barcode],
    enabled: debounced.length >= 2 || barcode.length >= 8,
    queryFn: () =>
      suggest({ data: { q: debounced, barcode } }) as Promise<QuickSuggestion[]>,
    staleTime: 60_000,
  });
  const suggestions = suggestionsQ.data ?? [];

  const applySuggestion = (s: QuickSuggestion) => {
    setName(s.name);
    if (s.barcode) setBarcode(s.barcode);
    if (s.lastPrice != null && !price) setPrice(String(s.lastPrice));
    priceRef.current?.focus();
  };

  const onPhoto = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máximo 8MB).");
      return;
    }
    setAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const extract = (await analyze({
          data: { image: String(reader.result) },
        })) as VisionExtract;
        const p = extract.products?.[0];
        if (!p) {
          toast.error("Não consegui identificar o produto na foto.");
          return;
        }
        if (p.productName) setName(p.productName);
        if (p.barcode) setBarcode(p.barcode.replace(/\D/g, ""));
        if (p.unit) setUnit(p.unit);
        if (p.price != null) setPrice(String(p.price));
        toast.success("Produto identificado pela foto. Revise e salve.");
        priceRef.current?.focus();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao analisar a foto.");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.onerror = () => {
      setAnalyzing(false);
      toast.error("Não foi possível ler a imagem.");
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await register({
        data: {
          establishmentId: storeId,
          productName: name,
          price: Number(price.replace(",", ".")),
          quantity: quantity ? Number(quantity.replace(",", ".")) : null,
          unit: unit || null,
          barcode: barcode || null,
        },
      });
      setSaved((prev) =>
        [{ name: res.productName, price: res.price, store: res.storeName, at: Date.now() }, ...prev].slice(0, 12),
      );
      toast.success(`${res.productName} • ${brl(res.price)} registrado.`);
      setName("");
      setPrice("");
      setQuantity("");
      setUnit("");
      setBarcode("");
      setDebounced("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao registrar o preço.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-3 md:px-6">
      <div className="mb-2 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/admin">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Console
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className={cn(tc.h2, "truncate")}>Registro rápido de preços</h1>
          <p className={cn(tc.meta)}>
            Sugestão de produto, código de barras e identificação por foto em poucos cliques.
          </p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_260px]">
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-border/70 bg-card p-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={cn(tc.meta, "font-semibold")}>Estabelecimento</span>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13.5px]"
                required
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.neighborhood ? ` — ${s.neighborhood}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className={cn(tc.meta, "inline-flex items-center gap-1 font-semibold")}>
                <Barcode className="h-3.5 w-3.5" /> Código de barras (opcional)
              </span>
              <Input
                inputMode="numeric"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.replace(/\D/g, "").slice(0, 20))}
                placeholder="789…"
                className="h-9"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className={cn(tc.meta, "font-semibold")}>Produto</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite para buscar no catálogo…"
                className="h-9 pl-8"
                required
                autoComplete="off"
              />
            </div>
          </label>

          {suggestions.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1">
              {suggestions.map((s) => (
                <li key={`${s.source}-${s.name}`}>
                  <button
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn(tc.itemTitle, "block truncate")}>{s.name}</span>
                      <span className={cn(tc.meta, "block truncate")}>
                        {[s.brand, s.category, s.barcode].filter(Boolean).join(" • ") ||
                          (s.source === "catalogo" ? "Catálogo" : "Histórico")}
                      </span>
                    </span>
                    {s.lastPrice != null && (
                      <span className={cn(tc.meta, "shrink-0 font-semibold")}>{brl(s.lastPrice)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1">
              <span className={cn(tc.meta, "font-semibold")}>Preço (R$)</span>
              <Input
                ref={priceRef}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                className="h-9"
                required
              />
            </label>
            <label className="space-y-1">
              <span className={cn(tc.meta, "font-semibold")}>Quantidade</span>
              <Input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="h-9"
              />
            </label>
            <label className="space-y-1">
              <span className={cn(tc.meta, "font-semibold")}>Unidade</span>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="un, kg, L…"
                className="h-9"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button type="submit" className="h-9 px-4" disabled={saving || !storeId}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Registrar preço
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              disabled={analyzing}
              onClick={() => fileRef.current?.click()}
            >
              {analyzing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-1 h-4 w-4" />
              )}
              Identificar por foto
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPhoto(f);
                e.target.value = "";
              }}
            />
            <span className={cn(tc.meta, "inline-flex items-center gap-1")}>
              <Sparkles className="h-3.5 w-3.5" /> A IA sugere nome, marca, peso e código.
            </span>
          </div>
        </form>

        <aside className="rounded-xl border border-border/70 bg-card p-2.5">
          <p className={cn(tc.itemTitle, "mb-1.5")}>Registrados agora</p>
          {saved.length === 0 ? (
            <p className={cn(tc.meta)}>Nenhum preço registrado nesta sessão.</p>
          ) : (
            <ul className="max-h-[52svh] space-y-1 overflow-y-auto pr-1">
              {saved.map((s) => (
                <li key={s.at} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1">
                    <span className={cn(tc.itemTitle, "block truncate")}>{s.name}</span>
                    <span className={cn(tc.meta, "block truncate")}>{s.store}</span>
                  </span>
                  <span className={cn(tc.meta, "shrink-0 font-semibold")}>{brl(s.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
