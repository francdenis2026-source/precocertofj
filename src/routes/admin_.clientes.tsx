/**
 * /admin/clientes — Gestão de clientes cadastrados.
 *
 * KPIs (total, novos 7d, ativos 30d, pagantes ativos), lista com busca/sort,
 * e drawer de detalhe com abas: Perfil (editar), Licenças, Acessos.
 * Ações: editar perfil, gerar código de reset de PIN, ver e-mail/último login auth.
 */
import { createFileRoute } from "@tanstack/react-router";
import { formatShortDate } from "@/components/product/TrustIndicator";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminBeforeLoad } from "@/lib/route-guards";
import {
  adminListCustomers,
  adminGetCustomer,
  adminUpdateCustomer,
  adminResetCustomerPin,
  adminSuspendCustomer,
  adminReactivateCustomer,
  adminExportCustomers,
} from "@/lib/admin-customers.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, KeyRound, Copy, RefreshCw, Search, ShieldCheck, Ban, CheckCircle2, Download } from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { NewCustomerDialog } from "@/components/admin/NewCustomerDialog";
import { useAdminEntitiesRealtime } from "@/hooks/useAdminEntitiesRealtime";

const listOptions = (search: string, sort: "recent" | "logins" | "name" | "last_seen", limit: number, offset: number) =>
  queryOptions({
    queryKey: ["admin", "customers", { search, sort, limit, offset }],
    queryFn: () => adminListCustomers({ data: { search, sort, limit, offset } }),
    staleTime: 15_000,
  });

export const Route = createFileRoute("/admin_/clientes")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Clientes · Painel administrativo — PreçoCerto" },
      { name: "description", content: "Consulte, edite e audite clientes cadastrados. Reset de PIN, licenças e acessos." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(listOptions("", "recent", 50, 0));
  },
  component: () => (
    <AppShell scope="admin">
      <ClientesPage />
    </AppShell>
  ),
});

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("pt-BR"); } catch { return v; }
}
function fmtDateShort(v: string | null | undefined) {
  if (!v) return "—";
  try { return formatShortDate(v); } catch { return v; }
}

function ClientesPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<"recent" | "logins" | "name" | "last_seen">("recent");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [openId, setOpenId] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useSuspenseQuery(listOptions(search, sort, pageSize, page * pageSize));
  const kpis = list.data.kpis;

  useAdminEntitiesRealtime(
    () => { qc.invalidateQueries({ queryKey: ["admin", "customers"] }); },
    { tables: ["profiles"] },
  );

  function applySearch() {
    setPage(0);
    setSearch(searchInput.trim());
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel administrativo</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">Clientes cadastrados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auditoria de acessos, edição de perfil e reset de PIN.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewCustomerDialog onCreated={() => qc.invalidateQueries({ queryKey: ["admin", "customers"] })} />
          <Badge variant="outline" className="gap-1"><Users className="h-3.5 w-3.5" /> {kpis.total} no total</Badge>
        </div>
      </header>


      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total cadastrados" value={kpis.total} />
        <KpiCard label="Novos (últimos 7 dias)" value={kpis.newLast7} />
        <KpiCard label="Ativos (últimos 30 dias)" value={kpis.activeLast30} />
        <KpiCard label="Pagantes ativos" value={kpis.paidActive} accent />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lista de clientes</CardTitle>
          <CardDescription>Clique em uma linha para abrir o painel de detalhes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, cidade, bairro"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                className="pl-8"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={applySearch}>Buscar</Button>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as typeof sort); setPage(0); }}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label="Ordenar por"
            >
              <option value="recent">Mais recentes</option>
              <option value="last_seen">Último acesso</option>
              <option value="logins">Mais acessos</option>
              <option value="name">Nome (A–Z)</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => list.refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
            <ExportButton search={search} sort={sort} />
            <ExportPdfButton search={search} sort={sort} />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cidade / Bairro</TableHead>
                  <TableHead className="text-right">Logins</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Cadastrado</TableHead>
                  <TableHead>Plano</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.data.rows.map((r) => {
                    const paid = r.paid_until && new Date(r.paid_until) > new Date();
                    const trial = r.trial_ends_at && new Date(r.trial_ends_at) > new Date();
                    return (
                      <TableRow
                        key={r.id}
                        onClick={() => setOpenId(r.id)}
                        className="cursor-pointer hover:bg-muted/40"
                      >
                        <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.cpf_masked || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {[r.city, r.neighborhood].filter(Boolean).join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.total_logins ?? 0}</TableCell>
                        <TableCell className="text-xs">{fmtDate(r.last_seen_at)}</TableCell>
                        <TableCell className="text-xs">{fmtDateShort(r.created_at)}</TableCell>
                        <TableCell>
                          {paid ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">Pagante</Badge>
                          ) : trial ? (
                            <Badge variant="secondary">Trial</Badge>
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Página {page + 1} · {list.data.rows.length} de {list.data.pageTotal} resultados</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * pageSize >= list.data.pageTotal}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CustomerDrawer userId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : undefined}>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-foreground">{value.toLocaleString("pt-BR")}</p>
      </CardContent>
    </Card>
  );
}

function CustomerDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const getCustomer = useServerFn(adminGetCustomer);
  const updateCustomer = useServerFn(adminUpdateCustomer);
  const resetPin = useServerFn(adminResetCustomerPin);

  const detail = useQuery({
    queryKey: ["admin", "customer", userId],
    queryFn: () => getCustomer({ data: { userId: userId! } }),
    enabled: !!userId,
    staleTime: 5_000,
  });

  const update = useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      qc.invalidateQueries({ queryKey: ["admin", "customer", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const [resetCode, setResetCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const resetMut = useMutation({
    mutationFn: resetPin,
    onSuccess: (r) => {
      setResetCode({ code: r.code, expiresAt: r.expiresAt });
      toast.success(`Código gerado. Válido por ${r.ttlMinutes} min.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao gerar código"),
  });

  const p = detail.data?.profile;
  const [form, setForm] = useState<Record<string, string>>({});
  // Reset form when a new customer is loaded
  useMemo(() => {
    if (p) {
      setForm({
        full_name: p.full_name ?? "",
        phone: p.phone ?? "",
        city: p.city ?? "",
        neighborhood: p.neighborhood ?? "",
        address_street: p.address_street ?? "",
        address_number: p.address_number ?? "",
        address_district: p.address_district ?? "",
        address_city: p.address_city ?? "",
        address_state: p.address_state ?? "",
        address_zip: p.address_zip ?? "",
      });
      setResetCode(null);
    }
  }, [p?.id]);

  function submit() {
    if (!userId) return;
    update.mutate({ data: { userId, patch: form } });
  }

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{p?.full_name || "Cliente"}</SheetTitle>
          <SheetDescription>
            {detail.data?.email ?? "—"} · CPF {p?.cpf_masked ?? "—"}
          </SheetDescription>
        </SheetHeader>

        {detail.isLoading || !p ? (
          <div className="mt-8 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <Tabs defaultValue="perfil" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="perfil">Perfil</TabsTrigger>
              <TabsTrigger value="licencas">Licenças ({detail.data?.licenses.length ?? 0})</TabsTrigger>
              <TabsTrigger value="acessos">Acessos ({detail.data?.logins.length ?? 0})</TabsTrigger>
            </TabsList>

            {/* PERFIL */}
            <TabsContent value="perfil" className="mt-4 space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <p><strong>Total de logins:</strong> {p.total_logins ?? 0}</p>
                <p><strong>Último acesso:</strong> {fmtDate(p.last_seen_at)}</p>
                <p><strong>Último login (auth):</strong> {fmtDate(detail.data?.lastSignInAt)}</p>
                <p><strong>E-mail confirmado:</strong> {detail.data?.emailConfirmedAt ? "Sim" : "Não"}</p>
                <p><strong>Papel:</strong> {detail.data?.roles.map((r) => r.role).join(", ") || "cliente"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome completo" value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} />
                <Field label="Telefone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                <Field label="Cidade" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
                <Field label="Bairro" value={form.neighborhood} onChange={(v) => setForm((f) => ({ ...f, neighborhood: v }))} />
                <Field label="Rua" value={form.address_street} onChange={(v) => setForm((f) => ({ ...f, address_street: v }))} />
                <Field label="Número" value={form.address_number} onChange={(v) => setForm((f) => ({ ...f, address_number: v }))} />
                <Field label="Bairro (endereço)" value={form.address_district} onChange={(v) => setForm((f) => ({ ...f, address_district: v }))} />
                <Field label="Cidade (endereço)" value={form.address_city} onChange={(v) => setForm((f) => ({ ...f, address_city: v }))} />
                <Field label="UF" value={form.address_state} onChange={(v) => setForm((f) => ({ ...f, address_state: v.toUpperCase() }))} />
                <Field label="CEP" value={form.address_zip} onChange={(v) => setForm((f) => ({ ...f, address_zip: v }))} />
              </div>

              {p.suspended_at && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-destructive">
                    <Ban className="h-4 w-4" /> Conta suspensa
                  </p>
                  <p className="mt-1 text-xs text-destructive/90">
                    Desde {fmtDate(p.suspended_at)}. Motivo: {p.suspended_reason || "—"}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button onClick={submit} disabled={update.isPending}>
                  {update.isPending ? "Salvando…" : "Salvar alterações"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => userId && resetMut.mutate({ data: { userId } })}
                  disabled={resetMut.isPending}
                  className="gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  {resetMut.isPending ? "Gerando…" : "Gerar código de reset de PIN"}
                </Button>
                <SuspendToggleButton
                  userId={userId!}
                  suspended={!!p.suspended_at}
                  onDone={() => {
                    qc.invalidateQueries({ queryKey: ["admin", "customer", userId] });
                    qc.invalidateQueries({ queryKey: ["admin", "customers"] });
                  }}
                />
              </div>

              {resetCode && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30">
                  <p className="mb-1 flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-200">
                    <ShieldCheck className="h-4 w-4" /> Código gerado
                  </p>
                  <p className="font-mono text-2xl tracking-widest text-emerald-900 dark:text-emerald-100">{resetCode.code}</p>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                    Válido até {fmtDate(resetCode.expiresAt)}. Repasse ao cliente por canal seguro.
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 gap-1"
                    onClick={() => { navigator.clipboard.writeText(resetCode.code); toast.success("Código copiado"); }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* LICENÇAS */}
            <TabsContent value="licencas" className="mt-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resgatado</TableHead>
                      <TableHead>Expira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail.data?.licenses ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Nenhuma licença.</TableCell></TableRow>
                    ) : detail.data!.licenses.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs">{l.code}</TableCell>
                        <TableCell className="text-xs">{l.plan_id ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                        <TableCell className="text-xs">{fmtDateShort(l.redeemed_at)}</TableCell>
                        <TableCell className="text-xs">{fmtDateShort(l.expires_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ACESSOS */}
            <TabsContent value="acessos" className="mt-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Sucesso</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail.data?.logins ?? []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Nenhum acesso registrado.</TableCell></TableRow>
                    ) : detail.data!.logins.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">{fmtDate(l.created_at)}</TableCell>
                        <TableCell>
                          {l.success
                            ? <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>
                            : <Badge variant="destructive">Falha</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.reason ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{l.ip_address ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ExportButton({ search, sort }: { search: string; sort: "recent" | "logins" | "name" | "last_seen" }) {
  const exportFn = useServerFn(adminExportCustomers);
  const [loading, setLoading] = useState(false);
  async function handle() {
    try {
      setLoading(true);
      const res = await exportFn({ data: { search, sort, limit: 2000 } });
      const blob = new Blob(["\ufeff", res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exportados ${res.count} clientes.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      {loading ? "Exportando…" : "Exportar CSV"}
    </Button>
  );
}

function ExportPdfButton({ search, sort }: { search: string; sort: "recent" | "logins" | "name" | "last_seen" }) {
  const exportFn = useServerFn(adminExportCustomers);
  const [loading, setLoading] = useState(false);
  async function handle() {
    try {
      setLoading(true);
      const res = await exportFn({ data: { search, sort, limit: 2000 } });
      // Parse CSV (headers + rows) — carregamos jsPDF em runtime para não pesar o bundle
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = (autoTableMod as { default: (doc: unknown, opts: unknown) => void }).default;
      const lines = res.csv.split(/\r?\n/).filter(Boolean);
      const parse = (line: string) => {
        const out: string[] = [];
        let cur = "", inside = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inside && line[i + 1] === '"') { cur += '"'; i++; }
            else inside = !inside;
          } else if (ch === "," && !inside) { out.push(cur); cur = ""; }
          else cur += ch;
        }
        out.push(cur);
        return out;
      };
      const headers = parse(lines[0] ?? "");
      const rows = lines.slice(1).map(parse);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text("PreçoCerto — Clientes", 40, 40);
      doc.setFontSize(9);
      doc.text(
        `Exportado em ${new Date().toLocaleString("pt-BR")} · ${rows.length} registros`,
        40,
        56,
      );
      autoTable(doc, {
        startY: 70,
        head: [headers],
        body: rows,
        styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [15, 27, 61], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 246, 250] },
        margin: { left: 20, right: 20 },
      });
      doc.save(res.filename.replace(/\.csv$/, ".pdf"));
      toast.success(`PDF gerado com ${rows.length} clientes.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar PDF");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      {loading ? "Gerando…" : "Exportar PDF"}
    </Button>
  );
}

function SuspendToggleButton({
  userId,
  suspended,
  onDone,
}: {
  userId: string;
  suspended: boolean;
  onDone: () => void;
}) {
  const suspend = useServerFn(adminSuspendCustomer);
  const reactivate = useServerFn(adminReactivateCustomer);
  const [loading, setLoading] = useState(false);

  async function handle() {
    try {
      if (suspended) {
        if (!confirm("Reativar esta conta? O cliente poderá acessar novamente.")) return;
        setLoading(true);
        await reactivate({ data: { userId } });
        toast.success("Conta reativada.");
      } else {
        const reason = prompt("Motivo da suspensão (mínimo 3 caracteres):");
        if (!reason || reason.trim().length < 3) {
          if (reason !== null) toast.error("Motivo obrigatório (mín. 3 caracteres).");
          return;
        }
        setLoading(true);
        await suspend({ data: { userId, reason: reason.trim() } });
        toast.success("Conta suspensa. Sessões ativas foram encerradas.");
      }
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na operação");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={suspended ? "default" : "destructive"}
      onClick={handle}
      disabled={loading}
      className="gap-1.5"
    >
      {suspended ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
      {loading ? "Processando…" : suspended ? "Reativar conta" : "Suspender conta"}
    </Button>
  );
}
