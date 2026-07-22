import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listCatalogSuggestions,
  generateSuggestionsFromScans,
  updateSuggestion,
  approveAndApplySuggestion,
  rejectSuggestion,
  reclassifySuggestionWithAi,
  reclassifyLowConfidenceBatch,
  approveHighConfidenceBatch,
  CATEGORY_PRESETS,
  type CatalogSuggestion,
} from "@/lib/catalog-suggestions.functions";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, X, Save, Wand2, Zap } from "lucide-react";


export const Route = createFileRoute("/admin_/categorizacao")({
  head: () => ({
    meta: [
      { title: "Revisão de categorização — Admin" },
      { name: "description", content: "Revise marca, tipo e embalagem sugeridos antes de aplicar no catálogo de produtos." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CategorizacaoPage,
});

function confidenceBadge(c: number | null) {
  if (c == null) return <Badge variant="outline">—</Badge>;
  if (c >= 0.8)
    return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Alta ({(c*100).toFixed(0)}%)</Badge>;
  if (c >= 0.5)
    return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">Média ({(c*100).toFixed(0)}%)</Badge>;
  return <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">Baixa ({(c*100).toFixed(0)}%)</Badge>;
}

function CategorizacaoPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCatalogSuggestions);
  const genFn = useServerFn(generateSuggestionsFromScans);
  const [tab, setTab] = useState<string>("pending");

  const q = useQuery({
    queryKey: ["catalog-suggestions", tab],
    queryFn: () => listFn({ data: { status: tab } }),
  });

  const genM = useMutation({
    mutationFn: () => genFn({ data: { limit: 200 } }),
    onSuccess: (r) => {
      toast.success(`${r.created} sugestões geradas · ${r.skipped} pulados`);
      qc.invalidateQueries({ queryKey: ["catalog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = q.data ?? [];
  const counts = {
    pending: rows.filter(r => r.status === "pending").length,
    lowConf: rows.filter(r => (r.confidence ?? 1) < 0.5).length,
  };

  return (
    <AppShell>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Categorização" },
        ]}
        title="Revisão de categorização"
        description="Confirme ou corrija marca, tipo e embalagem antes de aplicar no catálogo."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost-navy" size="sm" onClick={() => genM.mutate()} disabled={genM.isPending}>
              {genM.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              Gerar sugestões
            </Button>
            <BatchReclassifyButton />
            <BatchApproveButton />
          </div>
        }
      />
      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Pendentes na lista" value={counts.pending} />
          <KpiCard label="Baixa confiança (<50%)" value={counts.lowConf} tone="destructive" />
        </div>


        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">Sugestões</CardTitle>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="pending">Pendentes</TabsTrigger>
                  <TabsTrigger value="applied">Aplicadas</TabsTrigger>
                  <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {q.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Nenhuma sugestão nesse filtro. Use "Gerar sugestões" para criar sugestões a partir dos scans mais recentes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto original</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Embalagem</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => (
                      <SuggestionRow key={s.id} suggestion={s} editable={s.status === "pending"} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone?: "destructive" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "destructive" ? "text-destructive" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function BatchReclassifyButton() {
  const qc = useQueryClient();
  const fn = useServerFn(reclassifyLowConfidenceBatch);
  const m = useMutation({
    mutationFn: () => fn({ data: { threshold: 0.7, limit: 30 } }),
    onSuccess: (r) => {
      toast.success(`IA reclassificou ${r.updated}/${r.scanned} pendentes`);
      qc.invalidateQueries({ queryKey: ["catalog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button size="sm" variant="ghost-navy" onClick={() => m.mutate()} disabled={m.isPending}>
      {m.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
      Reclassificar baixa confiança (IA)
    </Button>
  );
}

function BatchApproveButton() {
  const qc = useQueryClient();
  const fn = useServerFn(approveHighConfidenceBatch);
  const m = useMutation({
    mutationFn: () => fn({ data: { threshold: 0.85, limit: 100 } }),
    onSuccess: (r) => {
      toast.success(`Aplicadas ${r.applied}/${r.scanned} de alta confiança`);
      qc.invalidateQueries({ queryKey: ["catalog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button size="sm" variant="executive" onClick={() => m.mutate()} disabled={m.isPending}>
      {m.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Zap className="h-4 w-4 mr-1.5" />}
      Aprovar alta confiança
    </Button>
  );
}

function SuggestionRow({ suggestion, editable }: { suggestion: CatalogSuggestion; editable: boolean }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateSuggestion);
  const approveFn = useServerFn(approveAndApplySuggestion);
  const rejectFn = useServerFn(rejectSuggestion);
  const aiFn = useServerFn(reclassifySuggestionWithAi);

  const [brand, setBrand] = useState(suggestion.suggested_brand ?? "");
  const [type, setType] = useState(suggestion.suggested_type ?? "");
  const [pkg, setPkg] = useState(suggestion.suggested_package ?? "");
  const [dirty, setDirty] = useState(false);

  const saveM = useMutation({
    mutationFn: () => updateFn({ data: { id: suggestion.id, brand, type, pkg } }),
    onSuccess: () => {
      toast.success("Sugestão atualizada.");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["catalog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveM = useMutation({
    mutationFn: async () => {
      if (dirty) await updateFn({ data: { id: suggestion.id, brand, type, pkg } });
      return approveFn({ data: { id: suggestion.id } });
    },
    onSuccess: () => {
      toast.success("Aplicado no catálogo.");
      qc.invalidateQueries({ queryKey: ["catalog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectM = useMutation({
    mutationFn: () => rejectFn({ data: { id: suggestion.id } }),
    onSuccess: () => {
      toast.success("Rejeitada.");
      qc.invalidateQueries({ queryKey: ["catalog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const aiM = useMutation({
    mutationFn: () => aiFn({ data: { id: suggestion.id } }),
    onSuccess: (r) => {
      setBrand(r.brand ?? "");
      setType(r.type ?? "");
      setPkg(r.pkg ?? "");
      setDirty(false);
      toast.success(`IA sugeriu (${Math.round((r.confidence ?? 0) * 100)}%)`);
      qc.invalidateQueries({ queryKey: ["catalog-suggestions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <TableRow>
      <TableCell className="text-sm max-w-xs align-top">
        <div>{suggestion.source_name}</div>
        {editable && (
          <button
            type="button"
            onClick={() => aiM.mutate()}
            disabled={aiM.isPending}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline disabled:opacity-50"
          >
            {aiM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
            Reclassificar com IA
          </button>
        )}
      </TableCell>
      <TableCell>
        {editable ? (
          <Input
            value={brand}
            onChange={(e) => { setBrand(e.target.value); setDirty(true); }}
            placeholder="—"
            className="h-8 min-w-[7rem]"
          />
        ) : (<span className="text-sm">{suggestion.suggested_brand ?? "—"}</span>)}
      </TableCell>
      <TableCell>
        {editable ? (
          <div className="flex items-center gap-1">
            <Input
              value={type}
              onChange={(e) => { setType(e.target.value); setDirty(true); }}
              placeholder="—"
              className="h-8 min-w-[8rem]"
            />
            <Select value="" onValueChange={(v) => { setType(v); setDirty(true); }}>
              <SelectTrigger className="h-8 w-9 px-2" aria-label="Preset de categoria">
                <SelectValue placeholder="•" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {CATEGORY_PRESETS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (<span className="text-sm">{suggestion.suggested_type ?? "—"}</span>)}
      </TableCell>
      <TableCell>
        {editable ? (
          <Input
            value={pkg}
            onChange={(e) => { setPkg(e.target.value); setDirty(true); }}
            placeholder="—"
            className="h-8 w-24"
          />
        ) : (<span className="text-sm">{suggestion.suggested_package ?? "—"}</span>)}
      </TableCell>
      <TableCell>{confidenceBadge(suggestion.confidence)}</TableCell>
      <TableCell className="text-right space-x-1 whitespace-nowrap">
        {editable ? (
          <>
            {dirty && (
              <Button size="sm" variant="ghost-navy" onClick={() => saveM.mutate()} disabled={saveM.isPending}>
                <Save className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
            )}
            <Button size="sm" variant="executive" onClick={() => approveM.mutate()} disabled={approveM.isPending}>
              {approveM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span className="ml-1">Aprovar</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => rejectM.mutate()} disabled={rejectM.isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Badge variant="outline">{suggestion.status}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

