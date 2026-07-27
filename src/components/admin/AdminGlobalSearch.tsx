import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Download, Loader2, X } from "lucide-react";
import {
  adminGlobalSearch,
  type GlobalSearchResult,
} from "@/lib/admin-insights.functions";
import { listEstablishments } from "@/lib/establishments.functions";
import { exportRowsToCSV, stampedFilename } from "@/lib/export";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

type Scope = "all" | "products" | "stores" | "prices";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AdminGlobalSearch() {
  const runSearch = useServerFn(adminGlobalSearch);
  const listStores = useServerFn(listEstablishments);

  const [raw, setRaw] = useState("");
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [storeId, setStoreId] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [days, setDays] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(raw.trim()), 280);
    return () => clearTimeout(t);
  }, [raw]);

  const storesQuery = useQuery({
    queryKey: ["admin", "search", "stores"],
    queryFn: () => listStores(),
    staleTime: 300_000,
  });

  const filters = useMemo(
    () => ({
      q,
      scope,
      establishmentId: storeId === "all" ? null : storeId,
      minPrice: minPrice ? Number(minPrice.replace(",", ".")) : null,
      maxPrice: maxPrice ? Number(maxPrice.replace(",", ".")) : null,
      days: days === "all" ? null : Number(days),
      verifiedOnly,
    }),
    [q, scope, storeId, minPrice, maxPrice, days, verifiedOnly],
  );

  const hasFilters =
    Boolean(q) || storeId !== "all" || Boolean(minPrice) || Boolean(maxPrice) || days !== "all" || verifiedOnly;

  const results = useQuery<GlobalSearchResult>({
    queryKey: ["admin", "global-search", filters],
    queryFn: () => runSearch({ data: filters }),
    enabled: hasFilters,
    staleTime: 20_000,
  });

  const clearAll = () => {
    setRaw("");
    setQ("");
    setScope("all");
    setStoreId("all");
    setMinPrice("");
    setMaxPrice("");
    setDays("all");
    setVerifiedOnly(false);
  };

  const data = results.data;

  return (
    <section
      aria-label="Busca global do painel"
      className="rounded-xl border border-border/70 bg-card p-2.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Buscar produtos, estabelecimentos ou registros de preço…"
            className="h-9 pl-8"
            aria-label="Busca global"
          />
          {raw && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className={cn(tc.control, "h-9 w-[140px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tudo</SelectItem>
            <SelectItem value="products">Produtos</SelectItem>
            <SelectItem value="stores">Estabelecimentos</SelectItem>
            <SelectItem value="prices">Preços</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className={cn(tc.control, "h-9 rounded-lg px-3")}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Filtros
        </Button>
      </div>

      {showFilters && (
        <div className="mt-2 grid gap-2 rounded-lg border border-border/60 bg-background/60 p-2 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className={cn(tc.tag, "mb-1 block text-muted-foreground")}>Estabelecimento</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(storesQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={cn(tc.tag, "mb-1 block text-muted-foreground")}>Preço mín. (R$)</Label>
            <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} inputMode="decimal" className="h-8" placeholder="0,00" />
          </div>
          <div>
            <Label className={cn(tc.tag, "mb-1 block text-muted-foreground")}>Preço máx. (R$)</Label>
            <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputMode="decimal" className="h-8" placeholder="999,00" />
          </div>
          <div>
            <Label className={cn(tc.tag, "mb-1 block text-muted-foreground")}>Período</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o histórico</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Switch id="admin-verified" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
            <Label htmlFor="admin-verified" className={cn(tc.meta, "cursor-pointer")}>Somente verificados</Label>
          </div>
        </div>
      )}

      {!hasFilters ? (
        <p className={cn(tc.meta, "mt-2 px-0.5")}>
          Digite um termo ou aplique um filtro para localizar registros em todo o sistema.
        </p>
      ) : results.isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className={tc.meta}>Buscando…</span>
        </div>
      ) : results.isError ? (
        <p className={cn(tc.meta, "mt-2 text-destructive")}>Falha ao buscar. Tente novamente.</p>
      ) : data ? (
        <div className="mt-2.5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={tc.tag}>{data.counts.products} produtos</Badge>
            <Badge variant="secondary" className={tc.tag}>{data.counts.stores} lojas</Badge>
            <Badge variant="secondary" className={tc.tag}>{data.counts.prices} preços</Badge>
            <Button
              size="sm"
              variant="outline"
              className={cn(tc.control, "ml-auto h-7 rounded-full px-2.5")}
              onClick={() =>
                exportRowsToCSV(
                  stampedFilename("busca-admin"),
                  [
                    { key: "tipo", header: "Tipo", accessor: (r: Record<string, string>) => r.tipo },
                    { key: "nome", header: "Nome", accessor: (r) => r.nome },
                    { key: "detalhe", header: "Detalhe", accessor: (r) => r.detalhe },
                    { key: "valor", header: "Valor", accessor: (r) => r.valor },
                  ],
                  [
                    ...data.products.map((p) => ({
                      tipo: "Produto",
                      nome: p.name,
                      detalhe: `${p.stores} lojas · ${p.prices} preços`,
                      valor: brl(p.minPrice),
                    })),
                    ...data.stores.map((s) => ({
                      tipo: "Estabelecimento",
                      nome: s.name,
                      detalhe: s.neighborhood ?? "—",
                      valor: `${s.prices} preços`,
                    })),
                    ...data.prices.map((p) => ({
                      tipo: "Preço",
                      nome: p.productName,
                      detalhe: `${p.storeName} · ${new Date(p.createdAt).toLocaleDateString("pt-BR")}`,
                      valor: brl(p.price),
                    })),
                  ],
                )
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-3">
            {data.products.length > 0 && (
              <ResultList
                title="Produtos"
                items={data.products.map((p) => ({
                  id: p.key,
                  primary: p.name,
                  secondary: `${p.stores} lojas · ${p.prices} preços`,
                  value: brl(p.minPrice),
                }))}
              />
            )}
            {data.stores.length > 0 && (
              <ResultList
                title="Estabelecimentos"
                items={data.stores.map((s) => ({
                  id: s.id,
                  primary: s.name,
                  secondary: [s.kind, s.neighborhood].filter(Boolean).join(" · ") || "—",
                  value: `${s.prices}`,
                }))}
              />
            )}
            {data.prices.length > 0 && (
              <ResultList
                title="Registros de preço"
                items={data.prices.map((p) => ({
                  id: p.id,
                  primary: p.productName,
                  secondary: `${p.storeName} · ${new Date(p.createdAt).toLocaleDateString("pt-BR")}${p.verified ? " · verificado" : ""}`,
                  value: brl(p.price),
                }))}
              />
            )}
          </div>

          {data.products.length + data.stores.length + data.prices.length === 0 && (
            <p className={cn(tc.meta, "py-3 text-center")}>Nenhum resultado para os filtros atuais.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ResultList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; primary: string; secondary: string; value: string }>;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/50">
      <p className={cn(tc.tag, "border-b border-border/50 px-2.5 py-1.5 text-muted-foreground")}>
        {title} · {items.length}
      </p>
      <ul className="max-h-[240px] divide-y divide-border/40 overflow-y-auto">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <p className={cn(tc.cell, "truncate font-medium text-foreground")}>{it.primary}</p>
              <p className={cn(tc.meta, "truncate")}>{it.secondary}</p>
            </div>
            <span className={cn(tc.cell, "shrink-0 font-semibold tabular-nums text-foreground")}>{it.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
