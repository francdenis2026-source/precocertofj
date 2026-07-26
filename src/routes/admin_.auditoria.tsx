import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/brand/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  History,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/brand/PageHeader";
import { listCatalogAudit, type AuditLogEntry } from "@/lib/catalog-audit.functions";
import { AdminOnly } from "@/components/auth/AdminOnly";

export const Route = createFileRoute("/admin_/auditoria")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Auditoria de catálogo — Admin — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <AuditoriaPage />
    </AdminOnly>
  ),
});


const ACTION_LABEL: Record<string, string> = {
  update: "Atualização",
  image_upload: "Upload de foto",
  image_generated: "Foto gerada (IA)",
  image_web: "Foto da web",
  image_upload_failed: "Falha upload",
  image_web_failed: "Falha busca web",
  image_generated_failed: "Falha IA",
  image_search_matched: "Foto encontrada",
  image_search_missed: "Sem foto encontrada",
  image_reused: "Foto reaproveitada",
  merge: "Fusão de duplicatas",
  delete: "Remoção",
  create: "Criação",
};

const ACTION_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  update: "default",
  create: "default",
  merge: "secondary",
  delete: "destructive",
  image_upload: "secondary",
  image_generated: "secondary",
  image_web: "secondary",
  image_search_matched: "secondary",
  image_reused: "outline",
  image_search_missed: "outline",
  image_upload_failed: "destructive",
  image_web_failed: "destructive",
  image_generated_failed: "destructive",
};

function AuditoriaPage() {
  const fetchAudit = useServerFn(listCatalogAudit);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["catalog-audit"],
    queryFn: () => fetchAudit({ data: { limit: 500 } }),
    staleTime: 30_000,
  });

  const rows: AuditLogEntry[] = data ?? [];

  const actions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.action);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (!q) return true;
      return (
        (r.catalogDisplayName ?? "").toLowerCase().includes(q) ||
        (r.actorEmail ?? "").toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        (r.field ?? "").toLowerCase().includes(q) ||
        (r.oldValue ?? "").toLowerCase().includes(q) ||
        (r.newValue ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const summary = useMemo(() => {
    const counts = { update: 0, image: 0, merge: 0, failed: 0 };
    for (const r of rows) {
      if (r.action.endsWith("_failed")) counts.failed++;
      else if (r.action === "update" || r.action === "create") counts.update++;
      else if (r.action === "merge" || r.action === "delete") counts.merge++;
      else if (r.action.startsWith("image_")) counts.image++;
    }
    return counts;
  }, [rows]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Painel · Catálogo"
        title="Auditoria do catálogo"
        description="Histórico completo de alterações em produtos, fotos e mesclagens."
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Auditoria" }]}
        icon={<History className="h-5 w-5" />}
        goldRule
        actions={
          <Button variant="ghost-navy" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={"mr-2 h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
            Atualizar
          </Button>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-8">


        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <SummaryCard label="Total de eventos" value={rows.length} />
          <SummaryCard label="Alterações de dados" value={summary.update} />
          <SummaryCard label="Ações de imagem" value={summary.image} />
          <SummaryCard
            label="Falhas"
            value={summary.failed}
            tone={summary.failed > 0 ? "warning" : "ok"}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Eventos recentes
                </CardTitle>
                <CardDescription>
                  Últimos {rows.length} registros — filtre por produto, ação, e-mail ou valor.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar em produto, e-mail ou valor…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-72 pl-8"
                  />
                </div>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Todas ações</option>
                  {actions.map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABEL[a] ?? a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico…
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <ShieldAlert className="h-4 w-4" />
                {(error as Error).message}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead>De → Para</TableHead>
                        <TableHead>Por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ACTION_TONE[r.action] ?? "outline"}>
                              {ACTION_LABEL[r.action] ?? r.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-sm font-medium">
                            {r.catalogDisplayName ?? (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.field ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[320px]">
                            <ChangeCell oldValue={r.oldValue} newValue={r.newValue} />
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                            {r.actorEmail ?? (
                              <span className="italic">sistema</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Página {currentPage} de {totalPages} · {filtered.length} eventos
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "ok" | "warning";
}) {
  const toneCls =
    tone === "warning"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "ok"
        ? "border-savings/30 bg-savings/5"
        : "border-border bg-card";
  return (
    <div className={"rounded-xl border p-4 " + toneCls}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ChangeCell({ oldValue, newValue }: { oldValue: string | null; newValue: string | null }) {
  if (!oldValue && !newValue) return <span className="text-muted-foreground">—</span>;
  const truncate = (s: string) => (s.length > 60 ? s.slice(0, 57) + "…" : s);
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {oldValue !== null && (
        <span className="truncate text-muted-foreground line-through" title={oldValue}>
          {truncate(oldValue)}
        </span>
      )}
      {newValue !== null && (
        <span className="truncate font-medium text-foreground" title={newValue}>
          {truncate(newValue)}
        </span>
      )}
    </div>
  );
}
