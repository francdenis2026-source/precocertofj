import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, History, Loader2, RefreshCw, Search, X } from "lucide-react";
import {
  listAdminAuditLog,
  ADMIN_AUDIT_LABELS,
  type AdminAuditRow,
} from "@/lib/admin-team.functions";
import { listEstablishments } from "@/lib/establishments.functions";
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

const TARGET_TYPES: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos os alvos" },
  { value: "scan", label: "Preço/scan" },
  { value: "product_catalog", label: "Catálogo" },
  { value: "establishment", label: "Estabelecimento" },
  { value: "user", label: "Usuário" },
  { value: "role", label: "Função/papel" },
  { value: "cache", label: "Cache" },
];

const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function AdminActionsAudit() {
  const fetchLog = useServerFn(listAdminAuditLog);
  const fetchEsts = useServerFn(listEstablishments);
  const [action, setAction] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [establishmentId, setEstablishmentId] = useState("all");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState("30");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const ests = useQuery({
    queryKey: ["admin", "audit", "establishments"],
    queryFn: () => fetchEsts(),
    staleTime: 5 * 60_000,
  });

  const usingDateRange = from !== "" || to !== "";
  const logQuery = useQuery<AdminAuditRow[]>({
    queryKey: ["admin", "audit-actions", action, targetType, establishmentId, actorEmail, from, to, days, usingDateRange],
    queryFn: () =>
      fetchLog({
        data: {
          action,
          targetType,
          establishmentId: establishmentId !== "all" ? establishmentId : undefined,
          actorEmail: actorEmail.trim() || undefined,
          from: from || undefined,
          to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
          days: usingDateRange || days === "all" ? undefined : Number(days),
          limit: 500,
        },
      }),
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
        norm(r.targetId ?? "").includes(q) ||
        norm(ADMIN_AUDIT_LABELS[r.action] ?? r.action).includes(q),
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);

  const activeFilters = [
    action !== "all",
    targetType !== "all",
    establishmentId !== "all",
    actorEmail.trim() !== "",
    usingDateRange,
    query.trim() !== "",
  ].filter(Boolean).length;

  const clearAll = () => {
    setAction("all"); setTargetType("all"); setEstablishmentId("all");
    setActorEmail(""); setFrom(""); setTo(""); setQuery(""); setDays("30"); setPage(1);
  };

  return (
    <Card>
      <CardHeader className="pb-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Auditoria de ações críticas
              {activeFilters > 0 && (
                <Badge variant="secondary" className={cn(tc.tag, "ml-1")}>
                  {activeFilters} filtro{activeFilters > 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className={tc.meta}>
              Filtre por estabelecimento, usuário, tabela e intervalo de datas para achar alterações específicas.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
            {activeFilters > 0 && (
              <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={clearAll}>
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Filtrar (texto livre nos resultados)…"
              className="h-8 pl-8"
              aria-label="Filtrar auditoria"
            />
          </div>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {Object.entries(ADMIN_AUDIT_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={targetType} onValueChange={(v) => { setTargetType(v); setPage(1); }}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Alvo" /></SelectTrigger>
            <SelectContent>
              {TARGET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={establishmentId} onValueChange={(v) => { setEstablishmentId(v); setPage(1); }}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Estabelecimento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estabelecimentos</SelectItem>
              {(ests.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={actorEmail}
            onChange={(e) => { setActorEmail(e.target.value); setPage(1); }}
            placeholder="E-mail do admin…"
            className="h-8"
            aria-label="Filtrar por e-mail do executor"
          />
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <div className="grid gap-1">
            <label className={cn(tc.meta, "text-[11px] uppercase tracking-wider")}>De</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="h-8"
              max={to || undefined}
              aria-label="Data inicial"
            />
          </div>
          <div className="grid gap-1">
            <label className={cn(tc.meta, "text-[11px] uppercase tracking-wider")}>Até</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="h-8"
              min={from || undefined}
              aria-label="Data final"
            />
          </div>
          <div className="grid gap-1">
            <label className={cn(tc.meta, "text-[11px] uppercase tracking-wider")}>Período rápido</label>
            <Select
              value={days}
              onValueChange={(v) => { setDays(v); setPage(1); if (v !== "all") { setFrom(""); setTo(""); } }}
              disabled={usingDateRange}
            >
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando registros…
          </div>
        ) : filtered.length === 0 ? (
          <p className={cn(tc.meta, "py-8 text-center")}>
            Nenhuma ação registrada para os filtros aplicados.
          </p>
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
