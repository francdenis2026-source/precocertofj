import { AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";

/**
 * Sinaliza o quanto se pode confiar no preço/comparação exibida.
 *
 * Heurísticas:
 * - `alta`   : ≥ 3 mercados, spread razoável, tamanho conhecido.
 * - `media`  : 2 mercados OU spread elevado (> 60%) OU tamanho ausente.
 * - `baixa`  : 1 única mercado (sem comparação real) OU spread absurdo (> 150%)
 *              OU dados divergentes (min > avg, etc.).
 *
 * O badge é intencionalmente discreto — pequeno, monoespaçado e com
 * `title`/`aria-label` explicativos, para não competir com o preço.
 */
export type ConfidenceLevel = "alta" | "media" | "baixa";

export function computeConfidence(input: {
  storeCount: number;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  hasSize: boolean;
}): { level: ConfidenceLevel; reasons: string[] } {
  const reasons: string[] = [];
  const { storeCount, minPrice, avgPrice, maxPrice, hasSize } = input;
  const spread =
    minPrice > 0 && Number.isFinite(minPrice) && Number.isFinite(maxPrice)
      ? (maxPrice - minPrice) / minPrice
      : 0;

  const divergent =
    !Number.isFinite(minPrice) ||
    !Number.isFinite(avgPrice) ||
    !Number.isFinite(maxPrice) ||
    minPrice <= 0 ||
    avgPrice < minPrice - 0.01 ||
    maxPrice < minPrice - 0.01;

  if (divergent) reasons.push("divergent data between stores");
  if (storeCount <= 1) reasons.push("only 1 store with price");
  else if (storeCount === 2) reasons.push("only 2 stores compared");
  if (!hasSize) reasons.push("size/weight not provided");
  if (spread > 1.5) reasons.push(`very high price variation (${Math.round(spread * 100)}%)`);
  else if (spread > 0.6) reasons.push(`high price variation (${Math.round(spread * 100)}%)`);

  let level: ConfidenceLevel = "alta";
  if (divergent || storeCount <= 1 || spread > 1.5) level = "baixa";
  else if (storeCount === 2 || spread > 0.6 || !hasSize) level = "media";

  return { level, reasons };
}

const STYLES: Record<
  ConfidenceLevel,
  { label: string; className: string; Icon: typeof ShieldCheck }
> = {
  alta: {
    label: "High confidence",
    className:
      "border-savings/40 bg-savings/10 text-savings",
    Icon: ShieldCheck,
  },
  media: {
    label: "Partial confidence",
    className:
      "border-accent-strong/40 bg-accent/10 text-accent-strong",
    Icon: HelpCircle,
  },
  baixa: {
    label: "Low confidence",
    className:
      "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: AlertTriangle,
  },
};

export function ConfidenceBadge({
  level,
  reasons,
  compact = false,
  className = "",
}: {
  level: ConfidenceLevel;
  reasons?: string[];
  compact?: boolean;
  className?: string;
}) {
  const s = STYLES[level];
  const Icon = s.Icon;
  const tooltip = reasons && reasons.length > 0 ? `${s.label}: ${reasons.join("; ")}` : s.label;
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono font-semibold uppercase leading-none tracking-wide " +
        s.className +
        " " +
        (compact ? "text-[11px]" : "text-[11px]") +
        " " +
        className
      }
    >
      <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={2.2} />
      {level === "alta" ? "high conf." : level === "media" ? "partial conf." : "low conf."}
    </span>
  );
}
