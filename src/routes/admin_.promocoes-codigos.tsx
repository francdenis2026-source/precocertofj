/**
 * /admin/promocoes-codigos — 20 códigos de divulgação (Promo 30 dias).
 *
 * Mostra os 20 códigos ativos, quantos foram resgatados, por quem, e
 * permite copiar a lista para divulgação.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminBeforeLoad } from "@/lib/route-guards";
import { adminListPromoCodes } from "@/lib/admin-security.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Ticket, CheckCircle2, Clock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin_/promocoes-codigos")({
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Códigos de divulgação · PreçoCerto Admin" },
      { name: "description", content: "20 licenças de 30 dias para divulgação regional." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromoCodesPage,
});

function fmt(v: string | null | undefined) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("pt-BR"); } catch { return v; }
}

function PromoCodesPage() {
  const list = useServerFn(adminListPromoCodes);
  const q = useQuery({
    queryKey: ["admin", "promo-codes"],
    queryFn: () => list(),
    staleTime: 30_000,
  });

  const codes = q.data ?? [];
  const redeemedList = codes.filter((c) => c.status === "redeemed");
  const redeemed = redeemedList.length;
  const available = codes.filter((c) => c.status === "paid").length;
  const now = Date.now();
  const activeRedeemed = redeemedList.filter((c) => c.expires_at && Date.parse(c.expires_at) > now).length;
  const expiredRedeemed = redeemed - activeRedeemed;
  const daysLeft = (iso: string | null | undefined) => {
    if (!iso) return null;
    const diff = Date.parse(iso) - now;
    return Math.ceil(diff / 86_400_000);
  };

  const copyAll = () => {
    const text = codes
      .filter((c) => c.status === "paid")
      .map((c) => c.code)
      .join("\n");
    if (!text) {
      toast.info("Nenhum código disponível para copiar.");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${available} códigos copiados.`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel administrativo</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
            Códigos de divulgação
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            20 licenças de <strong>30 dias</strong> geradas para a campanha de
            lançamento. A contagem só começa quando o cliente resgata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => q.refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={copyAll} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copiar disponíveis
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={<Ticket className="h-4 w-4" />} label="Total geradas" value={codes.length} />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Disponíveis" value={available} accent="ok" />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Resgatadas" value={redeemed} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lista completa</CardTitle>
          <CardDescription>
            Copie um código individualmente e envie ao cliente para ativação em /resgatar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resgatado por</TableHead>
                  <TableHead>Resgatado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
                ) : codes.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhum código encontrado.</TableCell></TableRow>
                ) : (
                  codes.map((c) => {
                    const isRedeemed = c.status === "redeemed";
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.code}</TableCell>
                        <TableCell>
                          {isRedeemed ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">Resgatado</Badge>
                          ) : c.status === "paid" ? (
                            <Badge variant="outline">Disponível</Badge>
                          ) : (
                            <Badge variant="secondary">{c.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.redeemed_profile ? (
                            <>
                              <div className="font-medium text-foreground">{c.redeemed_profile.full_name ?? "—"}</div>
                              <div className="text-muted-foreground">
                                {[c.redeemed_profile.city, c.redeemed_profile.neighborhood].filter(Boolean).join(" · ") || "—"}
                              </div>
                            </>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{fmt(c.redeemed_at)}</TableCell>
                        <TableCell className="text-xs">{fmt(c.expires_at)}</TableCell>
                        <TableCell className="text-right">
                          {!isRedeemed && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Código copiado"); }}
                            >
                              <Copy className="h-3.5 w-3.5" /> Copiar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon?: React.ReactNode; label: string; value: number; accent?: "ok" }) {
  return (
    <Card className={accent === "ok" ? "border-emerald-500/30 bg-emerald-500/5" : undefined}>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
          {icon}{label}
        </p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-foreground">
          {value.toLocaleString("pt-BR")}
        </p>
      </CardContent>
    </Card>
  );
}
