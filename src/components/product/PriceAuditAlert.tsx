import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import type { AuditReport } from "@/lib/price-audit";

/**
 * Alerta de auditoria de preços — aparece somente quando a verificação
 * automática de cada pesquisa encontra inconsistência.
 */
export function PriceAuditAlert({ report }: { report: AuditReport | null }) {
  const [dismissed, setDismissed] = useState(false);
  if (!report || report.issues.length === 0 || dismissed) return null;

  const critical = report.criticalCount > 0;
  const shown = report.issues.slice(0, 4);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={
        "relative mt-4 rounded-2xl border px-4 py-3 " +
        (critical
          ? "border-destructive/40 bg-destructive/10"
          : "border-warning/40 bg-warning/10")
      }
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar alerta de auditoria"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest">
        {critical ? (
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={2} />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 text-warning" strokeWidth={2} />
        )}
        <span className={critical ? "text-destructive" : "text-warning"}>
          Auditoria de preços · {report.criticalCount} crítico(s), {report.warnCount} aviso(s)
        </span>
      </p>

      <ul className="mt-2 space-y-1">
        {shown.map((issue, i) => (
          <li key={`${issue.code}-${i}`} className="text-[12.5px] leading-snug text-foreground">
            <span className="font-semibold">{issue.product}:</span> {issue.message}
          </li>
        ))}
      </ul>

      {report.issues.length > shown.length && (
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          +{report.issues.length - shown.length} outra(s) inconsistência(s)
        </p>
      )}
    </div>
  );
}
