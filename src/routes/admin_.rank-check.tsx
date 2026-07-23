import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { searchProductPrice, type PriceSearchResult } from "@/lib/price-search.functions";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Search as SearchIcon, Trophy } from "lucide-react";

export const Route = createFileRoute("/admin_/rank-check")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Validação do ranking — Admin" },
      { name: "description", content: "Teste rapidamente a ordenação por menor preço." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Gate,
});

const PRESETS = [
  "arroz urbano 1kg",
  "feijão camil 1kg",
  "leite italac 1l",
  "óleo soya 900ml",
  "açúcar união 1kg",
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
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
            <CardDescription>Esta página é exclusiva para administradores.</CardDescription>
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
  const searchFn = useServerFn(searchProductPrice);
  const [query, setQuery] = useState("arroz urbano 1kg");
  const [result, setResult] = useState<PriceSearchResult | null>(null);

  const mut = useMutation({
    mutationFn: (q: string) => searchFn({ data: { query: q, mode: "strict" } }),
    onSuccess: (r) => setResult(r),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    mut.mutate(q);
  };

  const runPreset = (q: string) => {
    setQuery(q);
    mut.mutate(q);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Admin</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Validação do ranking</h1>
            <p className="text-sm text-muted-foreground">
              Rode uma busca e veja o ranking de estabelecimentos ordenado pelo menor preço do produto principal.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <form onSubmit={submit} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: arroz urbano 1kg"
                autoFocus
              />
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
                <span className="ml-2">Buscar</span>
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button key={p} type="button" size="sm" variant="outline" onClick={() => runPreset(p)}>
                  {p}
                </Button>
              ))}
            </div>
            {mut.error ? (
              <p className="text-sm text-destructive">{(mut.error as Error).message}</p>
            ) : null}
          </CardContent>
        </Card>

        {result ? <ResultView result={result} /> : null}
      </div>
    </AppShell>
  );
}

function ResultView({ result }: { result: PriceSearchResult }) {
  const markets = result.markets;
  const isSorted = markets.every(
    (m, i) => i === 0 || markets[i - 1].priceMin <= m.priceMin,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Stat label="Amostras" value={String(result.samples)} />
          <Stat label="Mínimo" value={result.min != null ? fmtBRL(result.min) : "—"} />
          <Stat label="Média" value={result.avg != null ? fmtBRL(result.avg) : "—"} />
          <Stat label="Máximo" value={result.max != null ? fmtBRL(result.max) : "—"} />
          <Stat label="Modo" value={result.mode} />
          <Stat label="Tokens" value={result.tokens.join(" · ") || "—"} />
          <Stat label="Grupo canônico" value={result.canonicalGroup ?? "—"} />
          <Stat label="Você quis dizer" value={result.didYouMean ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Ranking por menor preço ({markets.length})
            </CardTitle>
            <CardDescription>
              Deve estar em ordem crescente de <b>priceMin</b>. Desempate pelo scan mais recente.
            </CardDescription>
          </div>
          <Badge variant={isSorted ? "default" : "destructive"}>
            {isSorted ? "Ordenação OK" : "Ordenação FORA"}
          </Badge>
        </CardHeader>
        <CardContent>
          {markets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem resultados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Estabelecimento</th>
                    <th className="py-2 pr-3 text-right">Menor preço</th>
                    <th className="py-2 pr-3 text-right">Média</th>
                    <th className="py-2 pr-3 text-right">Amostras</th>
                    <th className="py-2 pr-3">Último scan</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m, i) => {
                    const prev = i > 0 ? markets[i - 1] : null;
                    const outOfOrder = prev != null && prev.priceMin > m.priceMin;
                    return (
                      <tr key={`${m.establishmentId ?? m.marketName}-${i}`} className="border-t">
                        <td className="py-2 pr-3 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-3">
                          <span className="font-medium">{m.marketName || "—"}</span>
                          {m.marketKind ? (
                            <span className="ml-2 text-xs text-muted-foreground">{m.marketKind}</span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold">
                          {fmtBRL(m.priceMin)}
                          {outOfOrder ? (
                            <Badge variant="destructive" className="ml-2">↑</Badge>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 text-right">{fmtBRL(m.priceAvg)}</td>
                        <td className="py-2 pr-3 text-right">{m.samples}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{fmtDate(m.lastSeen)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {result.groups.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Grupos de produto ({result.groups.length})</CardTitle>
            <CardDescription>O ranking acima é derivado do primeiro grupo (produto principal).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.groups.slice(0, 5).map((g, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{g.productName}</span>
                  <span className="text-muted-foreground">
                    {fmtBRL(g.min)} · {g.samples} amostras · {g.prices.length} estabelecimentos
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}
