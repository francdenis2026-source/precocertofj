import { ShieldCheck, ShieldAlert, Shield, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TrustLevel = "alta" | "media" | "baixa";

export function computeTrust(lastSeenAt: string | null | undefined, totalScans: number | null | undefined): TrustLevel {
  const scans = Number(totalScans ?? 0);
  const t = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  if (!t) return "baixa";
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  if (days <= 7 && scans >= 2) return "alta";
  if (days <= 30 && scans >= 1) return "media";
  return "baixa";
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem data";
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h atrás`;
  const day = Math.round(h / 24);
  if (day < 30) return `${day} ${day === 1 ? "dia" : "dias"} atrás`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} ${mo === 1 ? "mês" : "meses"} atrás`;
  const y = Math.round(mo / 12);
  return `${y} ${y === 1 ? "ano" : "anos"} atrás`;
}

export function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Rótulo curto e coerente com a data atual — evita ambiguidades como
 * "12 fev 2026" quando a diferença é de meses. Regras:
 *  - dia atual         → "hoje"
 *  - até 6 dias        → "há N dias" / "ontem"
 *  - até 30 dias       → "dd/MM"
 *  - acima             → "dd/MM/aa"
 * Datas futuras (relógio adiantado) caem no formato "dd/MM/aa".
 */
export function formatShortDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

/** Data absoluta longa para uso em `title`/tooltip de acessibilidade. */
export function formatAbsoluteTooltip(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

const CONFIG: Record<TrustLevel, {
  label: string;
  color: string;
  icon: typeof ShieldCheck;
  description: string;
}> = {
  alta: {
    label: "Alta confiança",
    color: "border-savings/40 bg-savings/10 text-savings-foreground",
    icon: ShieldCheck,
    description: "Preço confirmado recentemente com múltiplas leituras.",
  },
  media: {
    label: "Confiança média",
    color: "border-warning/40 bg-warning/10 text-warning dark:text-warning",
    icon: Shield,
    description: "Preço com leitura razoavelmente recente. Pode ter pequenas variações.",
  },
  baixa: {
    label: "Baixa confiança",
    color: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: ShieldAlert,
    description: "Última leitura é antiga ou pouco frequente. Confirme no mercado antes de decidir.",
  },
};

type Props = {
  lastSeenAt: string | null | undefined;
  totalScans: number | null | undefined;
  compact?: boolean;
  className?: string;
};

export function TrustIndicator({ lastSeenAt, totalScans, compact = false, className }: Props) {
  const level = computeTrust(lastSeenAt, totalScans);
  const cfg = CONFIG[level];
  const Icon = cfg.icon;
  const scans = Number(totalScans ?? 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors hover:opacity-90",
            cfg.color,
            className,
          )}
          aria-label={cfg.label}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {compact ? cfg.label.replace(/^(Alta|Confiança média|Baixa) ?/, "") : cfg.label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-72 rounded-xl border-border bg-card p-3 text-xs shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{cfg.label}</p>
            <p className="mt-1 leading-snug text-muted-foreground">{cfg.description}</p>
            <dl className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <dt>Última leitura</dt>
                <dd className="font-medium text-foreground">
                  {formatRelative(lastSeenAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>Total de leituras</dt>
                <dd className="font-medium text-foreground">{scans}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt>Data completa</dt>
                <dd className="font-medium text-foreground">{formatFullDate(lastSeenAt)}</dd>
              </div>
            </dl>
            <p className="mt-2 flex items-start gap-1 rounded-md bg-muted/50 p-1.5 text-[11px] leading-snug text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              Os valores são coletados nos mercados e podem variar por atualização de tabela ou etiquetagem. Confirme no ponto de venda.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
