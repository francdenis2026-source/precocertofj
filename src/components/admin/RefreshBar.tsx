import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRefreshHistory, type RefreshHistoryEntry } from "@/hooks/useRefreshHistory";
import { logRefreshEvent } from "@/lib/refresh-audit.functions";

export type RefreshBarStatus = {
  label: string;
  tone: "muted" | "ok" | "error";
};

export type RefreshBarProps = {
  /**
   * Identificador único do painel (ex: "coverage", "audit-admin"). Usado
   * como chave em localStorage e como `target_id` no admin_audit_log.
   */
  scope: string;
  /** Rótulo humano do painel exibido ao lado do dot de status. */
  label: string;
  /** Nome da RPC/consulta principal — anotado no log de auditoria. */
  rpc?: string;
  /** Status derivado da query (loading/ok/error). */
  status: RefreshBarStatus;
  /** Ação que dispara a atualização; deve retornar quando terminar. */
  onRefresh: () => void | Promise<unknown>;
  disabled?: boolean;
  compact?: boolean;
  /** Sufixo à direita (ex: toggle de auto-refresh). */
  trailing?: React.ReactNode;
};

function fmtHistory(entry: RefreshHistoryEntry): string {
  const when = new Date(entry.ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const badge = entry.status === "success" ? "✓" : entry.status === "error" ? "✗" : "⏱";
  return `${badge} ${when} · ${entry.durationMs}ms${entry.errorCode ? ` · ${entry.errorCode}` : ""}`;
}

/**
 * Barra padronizada de "Atualizar" para painéis do admin.
 *
 * Encapsula: status + spinner, timestamp da última consulta,
 * persistência local do histórico (`useRefreshHistory`) e envio de
 * evento de auditoria ao servidor (`logRefreshEvent`) apenas quando
 * demora > 250ms ou falha, evitando poluir o log.
 */
export function RefreshBar({
  scope,
  label,
  rpc,
  status,
  onRefresh,
  disabled,
  compact,
  trailing,
}: RefreshBarProps) {
  const [busy, setBusy] = useState(false);
  const { history, last, record } = useRefreshHistory(scope);
  const logFn = useServerFn(logRefreshEvent);

  const handleClick = useCallback(async () => {
    if (disabled || busy) return;
    setBusy(true);
    const start = performance.now();
    let result: RefreshHistoryEntry["status"] = "success";
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    try {
      await Promise.resolve(onRefresh());
    } catch (err) {
      result = "error";
      const e = err as { code?: string; message?: string; name?: string };
      errorCode = e.code ?? e.name ?? "error";
      errorMessage = e.message?.slice(0, 300);
    } finally {
      const durationMs = Math.round(performance.now() - start);
      record({ status: result, durationMs, errorCode, rpc });
      // Log server-side (fire-and-forget). O próprio server function decide
      // se deve gravar (ignora refreshes rápidos de sucesso).
      void logFn({
        data: {
          scope,
          result,
          durationMs,
          rpc,
          errorCode,
          errorMessage,
        },
      }).catch(() => {
        /* silencioso: log de auditoria nunca deve quebrar UX */
      });
      setBusy(false);
    }
  }, [busy, disabled, logFn, onRefresh, record, rpc, scope]);

  const isBusy = busy || disabled;
  const effectiveTone: RefreshBarStatus["tone"] = busy ? "muted" : status.tone;
  const dotClass =
    effectiveTone === "ok"
      ? "bg-emerald-500"
      : effectiveTone === "error"
        ? "bg-destructive"
        : "bg-muted-foreground/40";

  const tooltipContent = useMemo(() => {
    if (history.length === 0) return "Sem histórico de atualização.";
    return history.slice(0, 5).map(fmtHistory).join("\n");
  }, [history]);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 ${
        compact ? "py-1.5" : "py-2"
      }`}
      role="status"
      aria-live="polite"
      data-testid={`refresh-bar-${scope}`}
    >
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        <span className="font-medium text-foreground/80">{label}</span>
        <span data-testid={`refresh-status-${scope}`}>· {busy ? "Consultando…" : status.label}</span>
        {last && !busy && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-1 inline-flex items-center gap-1 rounded px-1 text-[12.5px] text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Histórico de atualizações"
                >
                  <HistoryIcon className="h-3 w-3" aria-hidden />
                  {last.durationMs}ms
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="whitespace-pre text-[12.5px]">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClick}
          disabled={isBusy}
          aria-label={`Atualizar ${label}`}
          data-testid={`refresh-button-${scope}`}
        >
          {busy ? (
            <Loader2
              className="mr-2 h-4 w-4 animate-spin"
              data-testid="refresh-spinner"
              aria-hidden
            />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          )}
          Atualizar
        </Button>
      </div>
    </div>
  );
}
