import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getMyAccount } from "@/lib/account.functions";
import { getAccessStatus, daysRemaining } from "@/lib/paywall";
import { cn } from "@/lib/utils";
import { ShieldCheck, Clock, Sparkles } from "lucide-react";

/**
 * Chip discreto de status de licença para a sidebar do app.
 * Ocupa pouco espaço e mostra apenas a informação essencial.
 */
export function LicenseStatusChip() {
  const fetchAccount = useServerFn(getMyAccount);
  const { data: acc, isLoading } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    staleTime: 60_000,
  });

  if (isLoading || !acc) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 px-2 py-1 text-[10px] text-sidebar-foreground/50">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sidebar-foreground/40" />
        Licença…
      </span>
    );
  }

  const daysLeft = acc.status === "active"
    ? daysRemaining(acc.paidUntil)
    : acc.status === "trial"
      ? daysRemaining(acc.trialEndsAt)
      : 0;

  const isActive = acc.status === "active";
  const isTrial = acc.status === "trial";
  const isExpired = acc.status === "expired";

  const tone = isActive
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : isTrial
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-destructive/40 bg-destructive/10 text-destructive";

  const Icon = isActive ? ShieldCheck : isTrial ? Clock : Sparkles;
  const label = isActive
    ? `Ativa · ${daysLeft}d`
    : isTrial
      ? `Teste · ${daysLeft}d`
      : "Renovar";

  return (
    <Link
      to={isExpired ? "/comprar-licenca" : "/minhas-licencas"}
      className={cn(
        "group inline-flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 transition-colors hover:opacity-90",
        tone,
      )}
      title={
        isActive
          ? `Assinatura ativa. Renova em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}.`
          : isTrial
            ? `Período de teste. Termina em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}.`
            : "Sua licença expirou. Clique para renovar."
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <Icon className="h-3 w-3" strokeWidth={2.2} />
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </span>
      <span className="text-[10px] opacity-70 group-hover:opacity-100">
        {isExpired ? "Renovar" : "Ver"}
      </span>
    </Link>
  );
}
