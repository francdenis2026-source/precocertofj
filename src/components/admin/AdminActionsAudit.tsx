import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, History, Loader2, RefreshCw, Search } from "lucide-react";
import {
  listAdminAuditLog,
  ADMIN_AUDIT_LABELS,
  type AdminAuditRow,
} from "@/lib/admin-team.functions";
import { exportRowsToCSV, stampedFilename } from "@/lib/export";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

const CRITICAL = new Set([
  "scan_delete",
  "catalog_delete",
  "establishment_delete",
  "user_remove",
  "role_grant",
  "role_revoke",
]);

const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function AdminActionsAudit() {
  const fetchLog = useServerFn(listAdminAuditLog);
  const [action, setAction] = useState("all");
  const [days, setDays] = useState("30");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const logQuery = useQuery<AdminAuditRow[]>({
    queryKey: ["admin", "audit-actions", action, days],
    queryFn: () => fetchLog({ data: { action, days: days === "all" ? undefined : Number(days), limit: 500 } }),
    staleTime: 30_000,
  });

  const rows = logQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return rows;
    return rows.filter(
      (r) =>
        norm(r.actorEmail ?? "").includes(q) ||
        norm(r.notes ?? "").includes(q) ||
        norm(r.targetType).includes(q) ||
        norm(ADMIN_AUDIT_LABELS[r.action] ?? r.action).includes(q),
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <Card>
      <CardHeader className="pb-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Auditoria de ações críticas
            </CardTitle>
            <CardDescription className={tc.meta}>
              Criação e edição de preços, alterações de catálogo, acessos e gestão de usuários.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Filtrar…"
                className="h-8 w-44 pl-8"
                aria-label="Filtrar auditoria"
              />
            </div>
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(ADMIN_AUDIT_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={(v) => { setDays(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() =>
                exportRowsToCSV(
                  stampedFilename("auditoria-admin"),
                  [
                    { key: "when", header: "Quando", accessor: (r: AdminAuditRow) => new Date(r.createdAt).toLocaleString("pt-BR") },
                    { key: "action", header: "Ação", accessor: (r) => ADMIN_AUDIT_LABELS[r.action] ?? r.action },
                    { key: "target", header: "Alvo", accessor: (r) => r.targetType },
                    { key: "targetId", header: "ID do alvo", accessor: (r) => r.targetId ?? "" },
                    { key: "notes", header: "Detalhes", accessor: (r) => r.notes ?? "" },
                    { key: "actor", header: "Executado por", accessor: (r) => r.actorEmail ?? "" },
                  ],
                  filtered,
                )
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => logQuery.refetch()} aria-label="Atualizar auditoria">
              <RefreshCw className={cn("h-3.5 w-3.5", logQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando registros…
          </div>
        ) : filtered.length === 0 ? (
          <p className={cn(tc.meta, "py-8 text-center")}>Nenhuma ação registrada no período.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tc.tableHead}>Quando</TableHead>
                  <TableHead className={tc.tableHead}>Ação</TableHead>
                  <TableHead className={tc.tableHead}>Alvo</TableHead>
                  <TableHead className={tc.tableHead}>Detalhes</TableHead>
                  <TableHead className={tc.tableHead}>Executado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className={cn(tc.meta, "whitespace-nowrap")}>
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={CRITICAL.has(r.action) ? "destructive" : "secondary"} className={tc.tag}>
                        {ADMIN_AUDIT_LABELS[r.action] ?? r.action}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(tc.cell, "whitespace-nowrap")}>{r.targetType}</TableCell>
                    <TableCell className={cn(tc.cell, "max-w-[380px] truncate")} title={r.notes ?? ""}>
                      {r.notes ?? "—"}
                    </TableCell>
                    <TableCell className={cn(tc.meta, "whitespace-nowrap")}>{r.actorEmail ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="mt-2.5 flex items-center justify-between">
                <p className={tc.meta}>
                  Página {current} de {totalPages} · {filtered.length} registros
                </p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7" disabled={current <= 1} onClick={() => setPage(current - 1)}>Anterior</Button>
                  <Button size="sm" variant="outline" className="h-7" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
