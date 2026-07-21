import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeBulkItems, bulkInsertScans, type AnalyzedItem } from "@/lib/bulk-insert.functions";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Play, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/lote-inserir")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Inserção em lote — Admin" },
      { name: "description", content: "Revisar e confirmar inserção em lote de produtos." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Gate,
});

type Row = AnalyzedItem & { keep: boolean; localId: string };

const UNITS = ["", "g", "kg", "ml", "l", "un"] as const;
const REBOUCAS_ID = "fd10eca4-8871-43cd-8842-cad6a13bbc21";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Parse free-form text: one item per line "name — R$ price" or "name price". */
function parseText(text: string): Array<{ product_name: string; price: number; quantity: number | null; unit: string | null }> {
  const items: Array<{ product_name: string; price: number; quantity: number | null; unit: string | null }> = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Extract price: last number on the line (with optional R$ / decimal comma)
    const priceMatch = line.match(/R?\$?\s*(\d+(?:[.,]\d{1,2})?)\s*$/);
    if (!priceMatch) continue;
    const priceRaw = priceMatch[1].replace(/\./g, "").replace(",", ".");
    const price = parseFloat(priceRaw);
    if (!isFinite(price) || price <= 0) continue;
    // Name: everything before the price, drop trailing dashes/em-dashes
    let name = line.slice(0, priceMatch.index).trim().replace(/[—–\-:]+\s*$/, "").trim();
    if (name.length < 2) continue;

    // Extract quantity+unit from name
    let quantity: number | null = null;
    let unit: string | null = null;
    const sizeMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|un|litros?|kilos?)\b/i);
    if (sizeMatch) {
      quantity = parseFloat(sizeMatch[1].replace(",", "."));
      const u = sizeMatch[2].toLowerCase();
      unit = u.startsWith("kilo") ? "kg" : u.startsWith("litro") ? "l" : u;
    }
    items.push({ product_name: name, price, quantity, unit });
  }
  return items;
}

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
            <Button asChild variant="outline"><Link to="/admin">Voltar ao painel</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <Page />;
}

function Page() {
  const analyzeFn = useServerFn(analyzeBulkItems);
  const insertFn = useServerFn(bulkInsertScans);

  const [establishmentId, setEstablishmentId] = useState<string>(REBOUCAS_ID);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

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

  const analyze = useMutation({
    mutationFn: async () => {
      const parsed = parseText(text);
      if (parsed.length === 0) throw new Error("Nenhum item reconhecido. Verifique o formato.");
      return analyzeFn({ data: { items: parsed, establishmentId } });
    },
    onSuccess: (result) => {
      const mapped: Row[] = result.map((r, i) => ({
        ...r,
        keep: r.status !== "duplicate",
        localId: `${Date.now()}-${i}`,
      }));
      setRows(mapped);
      toast.success(`${mapped.length} itens analisados`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao analisar"),
  });

  const insert = useMutation({
    mutationFn: async () => {
      const items = rows
        .filter((r) => r.keep)
        .map((r) => ({
          product_name: r.product_name,
          price: r.price,
          quantity: r.quantity,
          unit: r.unit,
          brand: r.brand,
        }));
      if (items.length === 0) throw new Error("Nenhum item selecionado.");
      return insertFn({ data: { items, establishmentId } });
    },
    onSuccess: (r) => {
      toast.success(`${r.inserted} itens inseridos • cache atualizado (${r.cacheRebuilt ?? 0} chaves)`);
      if (r.errors.length > 0) toast.error(`Falhas: ${r.errors.length}`);
      setRows([]);
      setText("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao inserir"),
  });

  const addManual = () => {
    setRows((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-m`,
        product_name: "",
        price: 0,
        quantity: null,
        unit: null,
        brand: null,
        similar: [],
        status: "new",
        keep: true,
      },
    ]);
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.localId === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.localId !== id));
  };

  const stats = useMemo(() => {
    const selected = rows.filter((r) => r.keep).length;
    const dup = rows.filter((r) => r.status === "duplicate").length;
    const sim = rows.filter((r) => r.status === "similar").length;
    return { selected, dup, sim, total: rows.length };
  }, [rows]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Admin</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Inserção em lote</h1>
            <p className="text-sm text-muted-foreground">
              Cole a lista, revise, e confirme antes de gravar em <code>scans</code>.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Estabelecimento e itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <label className="text-sm text-muted-foreground">Estabelecimento:</label>
              <Select value={establishmentId} onValueChange={setEstablishmentId}>
                <SelectTrigger className="w-full sm:w-[320px]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(establishments ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"Um item por linha:\nSabão pó Omo 800g — 18,00\nÁgua sanitária Ypê 5L — R$ 24,00\nDetergente Ypê 500ml 3,00"}
              className="font-mono text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => analyze.mutate()} disabled={analyze.isPending || !text.trim()}>
                {analyze.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Analisar
              </Button>
              <Button variant="outline" onClick={addManual}><Plus className="h-4 w-4 mr-2" />Item manual</Button>
            </div>
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Revisar ({rows.length} itens)</CardTitle>
              <CardDescription>
                <span className="text-emerald-600 font-medium">{stats.total - stats.sim - stats.dup} novos</span>
                {" · "}
                <span className="text-amber-600 font-medium">{stats.sim} similares</span>
                {" · "}
                <span className="text-red-600 font-medium">{stats.dup} duplicatas</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Nome</th>
                      <th className="p-2 w-24">Preço</th>
                      <th className="p-2 w-20">Qtd.</th>
                      <th className="p-2 w-20">Un.</th>
                      <th className="p-2 w-40">Status</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.localId} className="border-b align-top">
                        <td className="p-2">
                          <Checkbox checked={r.keep} onCheckedChange={(v) => updateRow(r.localId, { keep: !!v })} />
                        </td>
                        <td className="p-2">
                          <Input
                            value={r.product_name}
                            onChange={(e) => updateRow(r.localId, { product_name: e.target.value })}
                            className="h-8 text-sm"
                          />
                          {r.similar.length > 0 && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              ↳ existente: {r.similar[0].product_name}
                              {r.similar[0].price_captured != null && ` (${fmtBRL(Number(r.similar[0].price_captured))})`}
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={r.price}
                            onChange={(e) => updateRow(r.localId, { price: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={r.quantity ?? ""}
                            onChange={(e) => updateRow(r.localId, { quantity: e.target.value ? parseFloat(e.target.value) : null })}
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <Select
                            value={r.unit ?? ""}
                            onValueChange={(v) => updateRow(r.localId, { unit: v || null })}
                          >
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => (
                                <SelectItem key={u || "none"} value={u || "none"}>{u || "—"}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          {r.status === "new" && <Badge className="bg-emerald-600 hover:bg-emerald-600">🟢 Novo</Badge>}
                          {r.status === "similar" && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">
                              🟡 Similar {Math.round((r.similar[0]?.similarity ?? 0) * 100)}%
                            </Badge>
                          )}
                          {r.status === "duplicate" && (
                            <Badge variant="destructive">🔴 Duplicata {Math.round((r.similar[0]?.similarity ?? 0) * 100)}%</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          <Button size="icon" variant="ghost" onClick={() => removeRow(r.localId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm">
                  <strong>{stats.selected}</strong> selecionados de {stats.total}
                </div>
                <Button
                  onClick={() => insert.mutate()}
                  disabled={insert.isPending || stats.selected === 0}
                  size="lg"
                >
                  {insert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Confirmar inserção ({stats.selected})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
