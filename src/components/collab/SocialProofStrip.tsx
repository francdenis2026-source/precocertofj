import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, MapPin, Receipt, Store } from "lucide-react";
import { getCollaboratorPublicStats } from "@/lib/collaborator.functions";

/**
 * Bloco compacto de prova social. Puxa contagens reais do banco
 * (colaboradores únicos, envios, cidades, estabelecimentos).
 */
export function SocialProofStrip({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const fetchStats = useServerFn(getCollaboratorPublicStats);
  const { data } = useQuery({
    queryKey: ["collab-public-stats"],
    queryFn: () => fetchStats(),
    staleTime: 10 * 60 * 1000,
  });

  const isDark = variant === "dark";
  const collaborators = Math.max(data?.collaborators ?? 0, 0);
  const submissions = Math.max(data?.submissions ?? 0, 0);
  const cities = Math.max(data?.cities ?? 0, 0);
  const establishments = Math.max(data?.establishments ?? 0, 0);

  const items: Array<{ label: string; value: string; Icon: typeof Users }> = [
    {
      label: collaborators === 1 ? "colaborador ativo" : "colaboradores ativos",
      value: fmt(collaborators),
      Icon: Users,
    },
    {
      label: submissions === 1 ? "nota fiscal enviada" : "notas fiscais enviadas",
      value: fmt(submissions),
      Icon: Receipt,
    },
    {
      label: cities === 1 ? "cidade coberta" : "cidades cobertas",
      value: fmt(cities),
      Icon: MapPin,
    },
    {
      label: establishments === 1 ? "estabelecimento" : "estabelecimentos",
      value: fmt(establishments),
      Icon: Store,
    },
  ];

  return (
    <div
      aria-label="Prova social — impacto da rede colaborativa"
      className={
        "grid grid-cols-2 gap-2 rounded-2xl border p-3 md:grid-cols-4 md:gap-3 md:p-4 " +
        (isDark
          ? "border-white/10 bg-white/[0.04] backdrop-blur-md "
          : "border-border/70 bg-card ") +
        className
      }
    >
      {items.map(({ label, value, Icon }) => (
        <div key={label} className="flex items-center gap-2.5">
          <span
            className={
              "inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl " +
              (isDark ? "bg-emerald-300/15 text-emerald-200" : "bg-primary/10 text-primary")
            }
          >
            <Icon className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <div
              className={
                "font-display text-[18px] font-bold leading-none tabular-nums md:text-[20px] " +
                (isDark ? "text-white" : "text-foreground")
              }
            >
              {value}
            </div>
            <div
              className={
                "mt-1 truncate text-[11px] font-medium uppercase tracking-wide md:text-[11.5px] " +
                (isDark ? "text-white/70" : "text-muted-foreground")
              }
            >
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",") + "k";
  return String(n);
}
