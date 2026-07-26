/**
 * LogoQualityPanel — laudo de qualidade da logomarca no cadastro/edição.
 *
 * Verifica tamanho mínimo, nitidez, transparência e escala, e lista as
 * recomendações de correção antes de publicar o mercado.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import {
  analyzeLogo,
  buildLogoQualityReport,
  type LogoQualityReport,
} from "@/lib/logo-quality";
import { SmartLogo } from "@/components/brand/SmartLogo";
import { cn } from "@/lib/utils";

export function LogoQualityPanel({
  src,
  name,
  premium3d = false,
}: {
  src?: string | null;
  name: string;
  premium3d?: boolean;
}) {
  const [report, setReport] = useState<LogoQualityReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!src) {
      setReport(null);
      return;
    }
    let alive = true;
    setBusy(true);
    void analyzeLogo(src).then((m) => {
      if (!alive) return;
      setReport(buildLogoQualityReport(m));
      setBusy(false);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  if (!src) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Qualidade da logomarca</p>
        {busy ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Analisando…
          </span>
        ) : report?.analyzed ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold",
              report.score >= 85
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : report.score >= 60
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-destructive/15 text-destructive",
            )}
          >
            {report.score}/100
          </span>
        ) : null}
      </div>

      {!busy && report && !report.analyzed ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Não foi possível ler os pixels desta imagem (restrição de origem). Reenvie o arquivo
          para rodar a verificação completa.
        </p>
      ) : null}

      {report?.analyzed ? (
        <>
          <ul className="mt-2 space-y-1.5">
            {report.checks.map((c) => (
              <li key={c.id} className="flex gap-2 text-xs">
                {c.status === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                ) : c.status === "warn" ? (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                ) : (
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="font-semibold">{c.label}:</span>{" "}
                  <span className="text-muted-foreground">{c.detail}</span>
                  {c.fix ? (
                    <span className="mt-0.5 block text-[11px] text-foreground/75">→ {c.fix}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          {!report.publishable ? (
            <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] font-semibold text-destructive">
              Corrija os itens críticos antes de publicar — a marca pode ficar borrada ou com
              moldura nos cards.
            </p>
          ) : null}

          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Prévia nos cards
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <SmartLogo src={src} name={name} frameHeight={64} className="w-[112px]" />
              <SmartLogo
                src={src}
                name={name}
                frameHeight={64}
                premium3d
                className="w-[112px]"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Fundo escolhido automaticamente ({report.metrics && report.metrics.lightInkRatio > 0.55 ? "suave" : "branco"})
              {premium3d ? " • relevo 3D ativo" : " • à direita, variação 3D premium"}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
