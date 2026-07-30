import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, History, Loader2, RefreshCw, Radio, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listAdminAuditLog,
  ADMIN_AUDIT_LABELS,
  type AdminAuditPage,
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

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const EXPORT_LIMIT = 500;

function useDebounced<T>(value: T, delay = DEBOUNCE_MS): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function AdminActionsAudit() {
  const fetchLog = useServerFn(listAdminAuditLog);
  const fetchEsts = useServerFn(listEstablishments);
  const queryClient = useQueryClient();
  const [action, setAction] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [establishmentId, setEstablishmentId] = useState("all");
  const [actorEmail, setActorEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState("30");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [pendingNew, setPendingNew] = useState(0);
  const flashUntilRef = useRef(0);
  const [flashing, setFlashing] = useState(false);

  // Debounced values feed the query key — badge/filter count stays instant.
  const dQuery = useDebounced(query);
  const dActorEmail = useDebounced(actorEmail);

  // Reset to page 1 whenever a filter that shrinks the result set changes.
  useEffect(() => { setPage(1); }, [action, targetType, establishmentId, dActorEmail, dQuery, from, to, days]);

  const ests = useQuery({
    queryKey: ["admin", "audit", "establishments"],
    queryFn: () => fetchEsts(),
    staleTime: 5 * 60_000,
  });

  const usingDateRange = from !== "" || to !== "";
  const offset = (page - 1) * PAGE_SIZE;

  const logQuery = useQuery<AdminAuditPage>({
    queryKey: ["admin", "audit-actions", action, targetType, establishmentId, dActorEmail, from, to, days, dQuery, offset],
    queryFn: () =>
      fetchLog({
        data: {
          action,
          targetType,
          establishmentId: establishmentId !== "all" ? establishmentId : undefined,
          actorEmail: dActorEmail.trim() || undefined,
          search: dQuery.trim() || undefined,
          from: from || undefined,
          to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
          days: usingDateRange || days === "all" ? undefined : Number(days),
          limit: PAGE_SIZE,
          offset,
        },
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Realtime: assina novos INSERTs em admin_audit_log e atualiza sob demanda.
  // Quando o usuário está na página 1 sem busca livre, recarrega automaticamente
  // e faz um "flash" sutil. Nas demais páginas, acumula um badge "N novos".
  useEffect(() => {
    const channel = supabase
      .channel("admin-audit-log-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_log" },
        () => {
          const onFirstPageNoSearch = page === 1 && dQuery.trim() === "";
          if (onFirstPageNoSearch) {
            queryClient.invalidateQueries({ queryKey: ["admin", "audit-actions"] });
            flashUntilRef.current = Date.now() + 1400;
            setFlashing(true);
            setTimeout(() => {
              if (Date.now() >= flashUntilRef.current) setFlashing(false);
            }, 1500);
          } else {
            setPendingNew((n) => n + 1);
          }
        },
      )
      .subscribe((status) => {
        setLiveConnected(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, page, dQuery]);

  const loadPendingNew = () => {
    setPendingNew(0);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ["admin", "audit-actions"] });
  };

  const rows: AdminAuditRow[] = logQuery.data?.rows ?? [];
  const total = logQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);

  // Contagem de filtros ativos reflete o input imediato (não o valor com debounce).
  const activeFilters = [
    action !== "all",
    targetType !== "all",
    establishmentId !== "all",
    actorEmail.trim() !== "",
    usingDateRange,
    query.trim() !== "",
  ].filter(Boolean).length;

  const searchPending = query !== dQuery || actorEmail !== dActorEmail;

  const clearAll = () => {
    setAction("all"); setTargetType("all"); setEstablishmentId("all");
    setActorEmail(""); setFrom(""); setTo(""); setQuery(""); setDays("30"); setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const full = await fetchLog({
        data: {
          action,
          targetType,
          establishmentId: establishmentId !== "all" ? establishmentId : undefined,
          actorEmail: dActorEmail.trim() || undefined,
          search: dQuery.trim() || undefined,
          from: from || undefined,
          to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
          days: usingDateRange || days === "all" ? undefined : Number(days),
          limit: EXPORT_LIMIT,
          offset: 0,
        },
      });
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
        full.rows,
      );
    } finally {
      setExporting(false);
    }
  };

  const busy = logQuery.isFetching || searchPending;
  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 registros";
    const start = offset + 1;
    const end = Math.min(offset + rows.length, total);
    return `${start}–${end} de ${total.toLocaleString("pt-BR")}`;
  }, [offset, rows.length, total]);

  return (
    <Card className={cn("transition-shadow duration-500", flashing && "ring-2 ring-emerald-500/40 shadow-lg")}>
      <CardHeader className="pb-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Auditoria de ações críticas
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[12.5px] font-medium",
                  liveConnected
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground",
                )}
                title={liveConnected ? "Conectado — novos eventos aparecem em tempo real" : "Conectando ao tempo real…"}
              >
                <Radio className={cn("h-2.5 w-2.5", liveConnected && "animate-pulse")} />
                {liveConnected ? "Ao vivo" : "Conectando"}
              </span>
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
            {pendingNew > 0 && (
              <Button
                size="sm"
                variant="default"
                className="h-8 animate-in fade-in slide-in-from-top-1"
                onClick={loadPendingNew}
                aria-label={`Carregar ${pendingNew} novos eventos`}
              >
                <Radio className="mr-1.5 h-3.5 w-3.5" />
                {pendingNew} nov{pendingNew > 1 ? "os" : "o"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={handleExport}
              disabled={exporting}
              aria-label="Exportar auditoria para CSV"
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => logQuery.refetch()} aria-label="Atualizar auditoria">
              <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar em detalhes, ID ou ação…"
              className="h-8 pl-8 pr-8"
              aria-label="Buscar na auditoria"
            />
            {searchPending && query.trim() !== "" && (
              <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {Object.entries(ADMIN_AUDIT_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={targetType} onValueChange={setTargetType}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Alvo" /></SelectTrigger>
            <SelectContent>
              {TARGET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={establishmentId} onValueChange={setEstablishmentId}>
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
            onChange={(e) => setActorEmail(e.target.value)}
            placeholder="E-mail do admin…"
            className="h-8"
            aria-label="Filtrar por e-mail do executor"
          />
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <div className="grid gap-1">
            <label className={cn(tc.meta, "text-[12.5px] uppercase tracking-wider")}>De</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8"
              max={to || undefined}
              aria-label="Data inicial"
            />
          </div>
          <div className="grid gap-1">
            <label className={cn(tc.meta, "text-[12.5px] uppercase tracking-wider")}>Até</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8"
              min={from || undefined}
              aria-label="Data final"
            />
          </div>
          <div className="grid gap-1">
            <label className={cn(tc.meta, "text-[12.5px] uppercase tracking-wider")}>Período rápido</label>
            <Select
              value={days}
              onValueChange={(v) => { setDays(v); if (v !== "all") { setFrom(""); setTo(""); } }}
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
        ) : total === 0 ? (
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
              <TableBody className={cn(logQuery.isFetching && "opacity-70 transition-opacity")}>
                {rows.map((r) => (
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
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className={tc.meta}>
                {rangeLabel} · Página {current} de {totalPages}
              </p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7" disabled={current <= 1 || busy} onClick={() => setPage(current - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="outline" className="h-7" disabled={current >= totalPages || busy} onClick={() => setPage(current + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
