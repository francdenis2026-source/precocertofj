import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listTrialCodes, createTrialCodes, updateTrialCode,
  deleteTrialCode, revokeTrialCode, listTrialAccessUsers,
  type TrialCodeRow, type TrialUser,
} from "@/lib/trial-access.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  KeyRound, Plus, Copy, Trash2, Pencil, Ban, RefreshCw, Users,
  Clock, Search, ShieldOff, Download, FileDown,
} from "lucide-react";

export const Route = createFileRoute("/admin_/acessos-temporarios")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Acessos temporários — Admin PreçoCerto" },
      { name: "description", content: "Central de códigos de acesso temporário (sem IA). Criar, editar, revogar e auditar usuários ativos." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AppShell scope="admin">
      <TrialAccessPage />
    </AppShell>
  ),
});

const PRESETS = [
  { label: "6 h", minutes: 360 },
  { label: "12 h", minutes: 720 },
  { label: "24 h", minutes: 1440 },
  { label: "3 dias", minutes: 3 * 1440 },
  { label: "7 dias", minutes: 7 * 1440 },
  { label: "15 dias", minutes: 15 * 1440 },
];

function fmtDuration(mins: number | null | undefined): string {
  if (!mins || mins <= 0) return "—";
  if (mins % 1440 === 0) return `${mins / 1440} dia${mins / 1440 > 1 ? "s" : ""}`;
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60} h`;
  return `${mins} min`;
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function statusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Disponível", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    redeemed: { label: "Em uso", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    revoked: { label: "Revogado", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    expired: { label: "Expirado", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    pending: { label: "Pendente", cls: "bg-muted text-muted-foreground border-border" },
  };
  const it = map[s] ?? { label: s, cls: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={it.cls}>{it.label}</Badge>;
}

function TrialAccessPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTrialCodes);
  const listUsers = useServerFn(listTrialAccessUsers);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<TrialCodeRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<TrialCodeRow | null>(null);
  const [revokeRow, setRevokeRow] = useState<TrialCodeRow | null>(null);

  const codesQ = useQuery({
    queryKey: ["trial-codes", statusFilter, search],
    queryFn: () => list({ data: { status: statusFilter || undefined, search: search || undefined, limit: 300 } }),
    staleTime: 15_000,
  });
  // Auditoria: refresh mais responsivo (10s) + realtime + broadcast entre abas
  const [auditInclEnded, setAuditInclEnded] = useState(true);
  const usersQ = useQuery({
    queryKey: ["trial-users", auditInclEnded],
    queryFn: () => listUsers({ data: { includeEnded: auditInclEnded } }),
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  // Ticker global (1s) para atualizar o contador de "restante"
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trial-codes"] });
    qc.invalidateQueries({ queryKey: ["trial-users"] });
  };

  // Realtime: qualquer INSERT/UPDATE/DELETE em license_codes reflete imediatamente
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ch = supabase
      .channel(`trial-codes-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "license_codes" },
        () => invalidate(),
      )
      .subscribe();

    // Sincronização entre abas (revogação em uma aba propaga imediatamente)
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("pc-trial-access");
      bc.onmessage = () => invalidate();
    }
    (window as unknown as { __pcTrialBc?: BroadcastChannel | null }).__pcTrialBc = bc;

    return () => {
      supabase.removeChannel(ch);
      bc?.close();
      (window as unknown as { __pcTrialBc?: BroadcastChannel | null }).__pcTrialBc = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const counts = useMemo(() => {
    const rows = codesQ.data ?? [];
    return {
      total: rows.length,
      available: rows.filter((r) => r.status === "paid").length,
      inUse: rows.filter((r) => r.status === "redeemed" && (!r.access_expires_at || new Date(r.access_expires_at) > new Date())).length,
      revoked: rows.filter((r) => r.status === "revoked").length,
    };
  }, [codesQ.data]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <KeyRound className="h-5 w-5 text-primary" />
            Acessos temporários
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Códigos que liberam a plataforma por tempo determinado.{" "}
            <strong className="text-foreground">Sem uso de IA.</strong>{" "}
            O cronômetro começa apenas quando o código é ativado.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={invalidate}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Criar códigos
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total" value={counts.total} />
        <Kpi label="Disponíveis" value={counts.available} tone="emerald" />
        <Kpi label="Em uso" value={counts.inUse} tone="sky" />
        <Kpi label="Revogados" value={counts.revoked} tone="rose" />
      </div>

      <Tabs defaultValue="codes" className="mt-6">
        <TabsList>
          <TabsTrigger value="codes">
            <KeyRound className="mr-1.5 h-4 w-4" /> Códigos
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Users className="mr-1.5 h-4 w-4" /> Auditoria de acessos ({usersQ.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="mt-4">
          <Card className="p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8" placeholder="Buscar por código (ex. PC-ABCD)"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-md border bg-background px-2 py-2 text-sm"
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="paid">Disponíveis</option>
                <option value="redeemed">Em uso</option>
                <option value="revoked">Revogados</option>
                <option value="expired">Expirados</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2">Código</th>
                    <th className="p-2">Duração</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Ativado em</th>
                    <th className="p-2">Expira em</th>
                    <th className="p-2">Reserva válida até</th>
                    <th className="p-2">Notas</th>
                    <th className="p-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(codesQ.data ?? []).map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 font-mono">
                        <button
                          className="inline-flex items-center gap-1.5 hover:text-primary"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(r.code);
                              toast.success("Código copiado");
                            } catch {
                              toast.error("Não foi possível copiar");
                            }
                          }}
                          title="Copiar"
                        >
                          {r.code} <Copy className="h-3.5 w-3.5 opacity-60" />
                        </button>
                      </td>
                      <td className="p-2">{fmtDuration(r.duration_minutes)}</td>
                      <td className="p-2">{statusBadge(r.status)}</td>
                      <td className="p-2 text-muted-foreground">{fmtDate(r.redeemed_at)}</td>
                      <td className="p-2 text-muted-foreground">{fmtDate(r.access_expires_at)}</td>
                      <td className="p-2 text-muted-foreground">{fmtDate(r.expires_at)}</td>
                      <td className="p-2 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          {r.status !== "redeemed" && (
                            <Button size="icon" variant="ghost" onClick={() => setEditRow(r)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {(r.status === "redeemed") && (
                            <Button size="icon" variant="ghost" onClick={() => setRevokeRow(r)} title="Encerrar acesso agora">
                              <ShieldOff className="h-4 w-4 text-rose-600" />
                            </Button>
                          )}
                          {r.status === "paid" && (
                            <Button size="icon" variant="ghost" onClick={() => setDeleteRow(r)} title="Excluir">
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          )}
                          {r.status === "paid" && (
                            <Button size="icon" variant="ghost" onClick={() => setRevokeRow(r)} title="Revogar">
                              <Ban className="h-4 w-4 text-amber-700" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {codesQ.data && codesQ.data.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                      Nenhum código encontrado. Crie um lote para começar.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditTable
            rows={usersQ.data ?? []}
            loading={usersQ.isPending}
            onRefresh={invalidate}
            includeEnded={auditInclEnded}
            onIncludeEndedChange={setAuditInclEnded}
          />
        </TabsContent>
      </Tabs>

      <CreateDialog open={createOpen} onOpenChange={setCreateOpen} onDone={invalidate} />
      <EditDialog row={editRow} onClose={() => setEditRow(null)} onDone={invalidate} />
      <DeleteDialog row={deleteRow} onClose={() => setDeleteRow(null)} onDone={invalidate} />
      <RevokeDialog row={revokeRow} onClose={() => setRevokeRow(null)} onDone={invalidate} />
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "sky" | "rose" }) {
  const t = tone === "emerald" ? "text-emerald-700"
    : tone === "sky" ? "text-sky-700"
    : tone === "rose" ? "text-rose-700" : "text-foreground";
  return (
    <Card className="p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${t}`}>{value}</div>
    </Card>
  );
}

function AuditTable({ rows, loading, onRefresh, includeEnded, onIncludeEndedChange }: {
  rows: TrialUser[]; loading: boolean; onRefresh: () => void;
  includeEnded: boolean; onIncludeEndedChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<"all" | "active" | "ended">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minRemain, setMinRemain] = useState<string>("");

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    const minR = minRemain ? Number(minRemain) : null;
    return rows.filter((r) => {
      if (qn) {
        const hay = `${r.full_name ?? ""} ${r.email ?? ""} ${r.code ?? ""}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      if (statusF === "active" && !r.is_active) return false;
      if (statusF === "ended" && r.is_active) return false;
      if (from && r.redeemed_at) {
        if (new Date(r.redeemed_at).getTime() < from) return false;
      }
      if (to && r.redeemed_at) {
        if (new Date(r.redeemed_at).getTime() > to) return false;
      }
      if (minR !== null && Number.isFinite(minR)) {
        if ((r.minutes_remaining ?? 0) < minR) return false;
      }
      return true;
    });
  }, [rows, q, statusF, dateFrom, dateTo, minRemain]);

  const exportCsv = () => {
    const header = ["Nome", "Email", "Codigo", "AtivadoEm", "ExpiraEm", "MinutosRestantes", "Ativo"];
    const lines = [header.join(";")];
    for (const r of filtered) {
      lines.push([
        (r.full_name ?? "").replace(/;/g, ","),
        (r.email ?? "").replace(/;/g, ","),
        r.code, r.redeemed_at ?? "", r.access_expires_at ?? "",
        String(r.minutes_remaining ?? 0), r.is_active ? "sim" : "nao",
      ].join(";"));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `acessos-temporarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const rowsHtml = filtered.map((r) => `<tr>
      <td>${r.full_name ?? "—"}<br><small>${r.email ?? ""}</small></td>
      <td>${r.code}</td><td>${fmtDate(r.redeemed_at)}</td>
      <td>${fmtDuration(r.minutes_remaining)}</td>
      <td>${fmtDate(r.access_expires_at)}</td>
      <td>${r.is_active ? "Ativo" : "Encerrado"}</td>
    </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Acessos temporários</title>
      <style>body{font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#111}
      h1{font-size:18px;margin:0 0 4px}small{color:#666}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f4f6f9}</style></head><body>
      <h1>Auditoria — Acessos temporários</h1>
      <small>Gerado em ${new Date().toLocaleString("pt-BR")} · ${filtered.length} registro(s)</small>
      <table><thead><tr><th>Usuário</th><th>Código</th><th>Ativado em</th><th>Restante</th><th>Expira em</th><th>Status</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Habilite pop-ups para exportar PDF"); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  return (
    <Card className="p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Auditoria — Acessos temporários</h2>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="mr-1.5 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={!filtered.length}>
            <FileDown className="mr-1.5 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Auto-atualiza a cada 30s. Contadores em tempo real. Bloqueio de IA aplicado automaticamente.
      </p>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-6">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nome, email ou código" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <select className="rounded-md border bg-background px-2 py-2 text-sm"
          value={statusF} onChange={(e) => setStatusF(e.target.value as typeof statusF)}>
          <option value="all">Todos</option>
          <option value="active">Ativos agora</option>
          <option value="ended">Encerrados</option>
        </select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Ativado a partir de" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Ativado até" />
        <Input type="number" min={0} placeholder="Mín. minutos restantes" value={minRemain} onChange={(e) => setMinRemain(e.target.value)} />
      </div>

      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={includeEnded} onChange={(e) => onIncludeEndedChange(e.target.checked)} />
          Incluir sessões encerradas (histórico)
        </label>
        <span className="ml-auto">
          Mostrando <strong className="text-foreground">{filtered.length}</strong> de {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Usuário</th>
              <th className="p-2">Código</th>
              <th className="p-2">Ativado em</th>
              <th className="p-2">Restante</th>
              <th className="p-2">Expira em</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.license_id} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{r.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email || "—"}</div>
                </td>
                <td className="p-2 font-mono text-xs">{r.code}</td>
                <td className="p-2 text-muted-foreground">{fmtDate(r.redeemed_at)}</td>
                <td className="p-2">
                  <LiveRemaining expiresAt={r.access_expires_at} fallbackMinutes={r.minutes_remaining} />
                </td>
                <td className="p-2 text-muted-foreground">{fmtDate(r.access_expires_at)}</td>
                <td className="p-2">
                  {r.is_active ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Encerrado</Badge>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                Nenhum acesso corresponde aos filtros.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LiveRemaining({ expiresAt, fallbackMinutes }: { expiresAt: string | null; fallbackMinutes: number }) {
  if (!expiresAt) return <span className="text-muted-foreground">—</span>;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Expirado</Badge>;
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label = h > 0 ? `${h}h ${m}m ${String(s).padStart(2, "0")}s`
    : m > 0 ? `${m}m ${String(s).padStart(2, "0")}s`
    : `${s}s`;
  const tone = totalSec < 300 ? "text-rose-700" : totalSec < 3600 ? "text-amber-700" : "text-foreground";
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums text-sm font-medium ${tone}`}>
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
      <span className="sr-only">restante · referência {fallbackMinutes} min</span>
    </span>
  );
}


function CreateDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const create = useServerFn(createTrialCodes);
  const [quantity, setQuantity] = useState(5);
  const [unit, setUnit] = useState<"hours" | "days">("hours");
  const [value, setValue] = useState(24);
  const [reservationDays, setReservationDays] = useState(180);
  const [notes, setNotes] = useState("");

  const minutes = unit === "days" ? value * 1440 : value * 60;

  const m = useMutation({
    mutationFn: () => create({ data: { quantity, durationMinutes: minutes, reservationDays, notes: notes || undefined } }),
    onSuccess: (res) => {
      toast.success(`${res.codes.length} código(s) criado(s)`);
      onOpenChange(false); onDone();
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar códigos de acesso temporário</DialogTitle>
          <DialogDescription>
            Códigos liberam a plataforma sem IA. O cronômetro só começa quando o cliente insere o código.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Duração — preset</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  onClick={() => { setUnit(p.minutes % 1440 === 0 ? "days" : "hours"); setValue(p.minutes % 1440 === 0 ? p.minutes / 1440 : p.minutes / 60); }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${minutes === p.minutes ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label>Duração personalizada</Label>
              <Input type="number" min={1} value={value} onChange={(e) => setValue(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <Label>Unidade</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                value={unit} onChange={(e) => setUnit(e.target.value as "hours" | "days")}
              >
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
            </div>
            <div>
              <Label>Reserva (dias)</Label>
              <Input type="number" min={1} max={730} value={reservationDays} onChange={(e) => setReservationDays(Math.max(1, Math.min(730, Number(e.target.value) || 1)))} />
              <p className="mt-1 text-[10px] text-muted-foreground">Prazo p/ o código ser ativado</p>
            </div>
          </div>

          <div>
            <Label>Notas (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: Campanha WhatsApp julho" />
          </div>

          <div className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
            Total: <strong className="text-foreground">{quantity}</strong> código(s) × <strong className="text-foreground">{fmtDuration(minutes)}</strong> de acesso.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ row, onClose, onDone }: { row: TrialCodeRow | null; onClose: () => void; onDone: () => void }) {
  const update = useServerFn(updateTrialCode);
  const [unit, setUnit] = useState<"hours" | "days">("hours");
  const [value, setValue] = useState(24);
  const [notes, setNotes] = useState("");

  useMemo(() => {
    if (row?.duration_minutes) {
      if (row.duration_minutes % 1440 === 0) { setUnit("days"); setValue(row.duration_minutes / 1440); }
      else { setUnit("hours"); setValue(Math.max(1, Math.round(row.duration_minutes / 60))); }
    }
    setNotes(row?.notes ?? "");
  }, [row]);

  const minutes = unit === "days" ? value * 1440 : value * 60;

  const m = useMutation({
    mutationFn: () => update({ data: { id: row!.id, durationMinutes: minutes, notes: notes || null } }),
    onSuccess: () => { toast.success("Código atualizado"); onClose(); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!row) return null;
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar código {row.code}</DialogTitle>
          <DialogDescription>Só pode alterar códigos ainda não resgatados.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label>Duração</Label>
              <Input type="number" min={1} value={value} onChange={(e) => setValue(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <Label>Unidade</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                value={unit} onChange={(e) => setUnit(e.target.value as "hours" | "days")}
              >
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ row, onClose, onDone }: { row: TrialCodeRow | null; onClose: () => void; onDone: () => void }) {
  const del = useServerFn(deleteTrialCode);
  const m = useMutation({
    mutationFn: () => del({ data: { id: row!.id } }),
    onSuccess: () => { toast.success("Código excluído"); onClose(); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AlertDialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir código {row?.code}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. O código será removido permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RevokeDialog({ row, onClose, onDone }: { row: TrialCodeRow | null; onClose: () => void; onDone: () => void }) {
  const rev = useServerFn(revokeTrialCode);
  const isActive = row?.status === "redeemed";
  const m = useMutation({
    mutationFn: () => rev({ data: { id: row!.id, endAccessNow: true } }),
    onSuccess: () => {
      toast.success(isActive ? "Acesso encerrado" : "Código revogado");
      onClose(); onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AlertDialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive ? `Encerrar acesso do código ${row?.code}?` : `Revogar código ${row?.code}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? "O usuário perderá o acesso imediatamente. Esta ação é registrada na auditoria."
              : "O código não poderá mais ser usado. Você pode reativar depois se necessário."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Processando..." : (isActive ? "Encerrar acesso" : "Revogar")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
