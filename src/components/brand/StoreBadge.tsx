/**
 * StoreBadge — identificador visual estável para um estabelecimento.
 *
 * Regras:
 *  • Se `logoUrl` existe → mostra a logo em círculo (reconhecimento imediato).
 *  • Senão → mostra a inicial em círculo colorido.
 *    – A cor vem de `brandColor` (hex) quando cadastrada no admin.
 *    – Caso contrário, é derivada de forma determinística do nome
 *      (mesma mercado → sempre mesma cor).
 *
 * Também é usado para pintar uma faixa lateral de 3px na linha do
 * resultado (via `getStoreColor`) — assim mesmo com logo, cada mercado
 * fica facilmente distinguível numa lista longa.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { signLogoUrl } from "@/lib/signed-images";





const PALETTE = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#0ea5e9", // sky-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Cor determinística de um estabelecimento — respeita `brandColor` quando presente. */
export function getStoreColor(name: string, brandColor?: string | null): string {
  if (brandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor)) return brandColor;
  const key = (name ?? "").trim().toLowerCase() || "—";
  return PALETTE[hashString(key) % PALETTE.length];
}

function initials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export type StoreBadgeProps = {
  name: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  /** Distância em km até o estabelecimento — exibida no tooltip se informada. */
  distanceKm?: number | null;
  /** Marca este badge como referente ao mais barato encontrado. */
  isCheapest?: boolean;
  /** Explicação curta do porquê é o mais barato (ex.: "R$ 3,29 abaixo da média"). */
  cheapestReason?: string | null;
  /** Desativa o tooltip mesmo quando há conteúdo. */
  disableTooltip?: boolean;
};

function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/**
 * Marca de estabelecimento redonda. Não renderiza o nome — combine
 * com um `<span>` ao lado quando quiser exibir o nome também.
 *
 * Quando o consumidor passa `name`, `distanceKm` ou `isCheapest`, o badge
 * é envolvido em um tooltip acessível mostrando nome, distância (se houver)
 * e uma linha explicando por que é o mais barato quando aplicável.
 */
export function StoreBadge({
  name,
  logoUrl,
  brandColor,
  size = "sm",
  className,
  distanceKm,
  isCheapest,
  cheapestReason,
  disableTooltip,
}: StoreBadgeProps) {
  const color = getStoreColor(name, brandColor);
  const dim =
    size === "xs" ? "h-4 w-4 text-[8px]" : size === "md" ? "h-8 w-8 text-[11px]" : "h-6 w-6 text-[9px]";

  // Assina URLs do bucket privado `logos` on-the-fly (com cache global).
  const [resolvedLogo, setResolvedLogo] = useState<string | null>(logoUrl ?? null);
  useEffect(() => {
    let cancelled = false;
    if (!logoUrl) {
      setResolvedLogo(null);
      return;
    }
    signLogoUrl(logoUrl).then((u) => {
      if (!cancelled) setResolvedLogo(u ?? logoUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const visual = resolvedLogo ? (
    <span

      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-offset-1 ring-offset-background",
        dim,
        className,
      )}
      style={{ ["--tw-ring-color" as string]: color }}
      aria-hidden
    >
      <img
        src={resolvedLogo ?? undefined}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold text-white",
        dim,
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
      title={name}
    >
      {initials(name)}
    </span>
  );

  // Tooltips foram removidos do sistema — o badge nunca mais é envolvido em Tooltip.
  // As informações de nome/distância/menor preço continuam disponíveis via aria-label
  // e como texto adjacente no layout.
  void distanceKm; void isCheapest; void cheapestReason; void disableTooltip;
  return visual;
}


/**
 * Faixa lateral colorida (3px) para prefixar uma linha/li — reforça
 * a identificação da mercado mesmo em listas densas.
 */
export function StoreColorBar({
  name,
  brandColor,
  className,
}: {
  name: string;
  brandColor?: string | null;
  className?: string;
}) {
  const color = getStoreColor(name, brandColor);
  return (
    <span
      aria-hidden
      className={cn("block w-[3px] shrink-0 self-stretch rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
