import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditForEntity, type AuditEntry } from "@/lib/audit.functions";
import { Loader2, History, X } from "lucide-react";
import { useState } from "react";

type EntityType = "shopping_item" | "finance_tx";

type FieldChange = { field: string; before: unknown; after: unknown };

function diffJson(before: unknown, after: unknown): FieldChange[] {
  const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const skip = new Set(["updated_at", "created_at", "id"]);
  return keys
    .filter((k) => !skip.has(k))
    .filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => ({ field: k, before: b[k], after: a[k] }));
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function AuditHistoryButton({
  entityType,
  entityId,
  label = "Histórico",
}: {
  entityType: EntityType;
  entityId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-primary/5 hover:text-primary"
      >
        <History className="h-3 w-3" />
        {label}
      </button>
      {open && <AuditDrawer entityType={entityType} entityId={entityId} onClose={() => setOpen(false)} />}
    </>
  );
}

function AuditDrawer({
  entityType,
  entityId,
  onClose,
}: {
  entityType: EntityType;
  entityId: string;
  onClose: () => void;
}) {
  const listFn = useServerFn(listAuditForEntity);
  const { data, isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["audit", entityType, entityId],
    queryFn: () => listFn({ data: { entityType, entityId } }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-[14px] font-semibold text-foreground">Histórico de edições</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-surface"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <p className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> carregando…
            </p>
          ) : (data?.length ?? 0) === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">Sem alterações registradas.</p>
          ) : (
            <ul className="space-y-2">
              {data!.map((e) => {
                const changes = e.action === "update" ? diffJson(e.before, e.after) : [];
                return (
                  <li key={e.id} className="rounded-xl border border-border bg-surface p-3">
                    <p className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      <span className={e.action === "delete" ? "text-destructive" : "text-primary"}>
                        {e.action === "delete" ? "Exclusão" : "Edição"}
                      </span>
                      <span>{new Date(e.createdAt).toLocaleString("pt-BR")}</span>
                    </p>
                    {e.action === "delete" ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">Registro removido.</p>
                    ) : changes.length === 0 ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">Sem diferenças relevantes.</p>
                    ) : (
                      <ul className="mt-1 space-y-1 font-mono text-[11px]">
                        {changes.map((c) => (
                          <li key={c.field} className="flex flex-wrap items-baseline gap-1">
                            <span className="font-semibold text-foreground">{c.field}:</span>
                            {/* eslint-disable-next-line no-restricted-syntax -- diff genérico de auditoria: o valor pode ser texto, data ou número, não é preço visual. */}
                            <span className="text-muted-foreground line-through">{fmt(c.before)}</span>
                            <span className="text-muted-foreground">→</span>
                            {/* eslint-disable-next-line no-restricted-syntax -- idem: valor arbitrário do log. */}
                            <span className="text-primary">{fmt(c.after)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
