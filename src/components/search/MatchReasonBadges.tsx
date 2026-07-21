import type { MatchReason } from "@/lib/search-tokens";

/**
 * Mostra ao usuário o "motivo do match" de um resultado — quais tokens
 * casaram e como (palavra inteira / prefixo / marca).
 */
export function MatchReasonBadges({
  reasons,
  className,
}: {
  reasons: MatchReason[];
  className?: string;
}) {
  if (!reasons || reasons.length === 0) return null;

  // Deduplica por token+tipo (nome + marca podem repetir o token).
  const seen = new Set<string>();
  const unique = reasons.filter((r) => {
    const k = `${r.token}::${r.kind}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <div
      className={
        "flex flex-wrap items-center gap-1 leading-none " + (className ?? "")
      }
      aria-label="Motivo do match"
    >
      {unique.map((r) => (
        <span
          key={`${r.token}-${r.kind}`}
          className={
            "inline-flex h-4 max-w-[8rem] items-center truncate rounded-full border px-1.5 font-mono text-[9px] font-semibold uppercase leading-none tracking-wider " +
            badgeClass(r.kind)
          }
          title={`${r.token} — ${label(r.kind)}`}
          aria-label={`${r.token} — ${label(r.kind)}`}
        >
          <span className="truncate">{r.token}</span>
        </span>
      ))}
    </div>
  );
}

function badgeClass(kind: MatchReason["kind"]): string {
  switch (kind) {
    case "exact":
      return "border-primary/30 bg-primary/10 text-primary";
    case "prefix":
      return "border-accent/30 bg-accent/10 text-accent";
    case "brand":
      return "border-savings/30 bg-savings/10 text-savings";
  }
}

function label(kind: MatchReason["kind"]): string {
  switch (kind) {
    case "exact":
      return "palavra";
    case "prefix":
      return "prefixo";
    case "brand":
      return "marca";
  }
}
