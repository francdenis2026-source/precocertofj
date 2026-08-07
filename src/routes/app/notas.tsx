import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { getMyPromoSubmissions } from "@/lib/promo.functions";
import { PageHeader, SectionCard } from "@/components/layout";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import * as React from "react";

export const Route = createFileRoute("/app/notas")({
  head: () => ({
    meta: [
      { title: "Minhas Notas — PreçoCerto" },
      { name: "description", content: "Acompanhe o status das suas notas fiscais enviadas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <PromoStatusPage />
    </ProtectedGate>
  ),
});

function PromoStatusPage() {
  const fetchSubmissions = useServerFn(getMyPromoSubmissions);
  const [userCpf, setUserCpf] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // O CPF está guardado no metadado ou é parte do e-mail mockado
        const email = data.user.email || "";
        const cpfMatch = email.match(/cpf-(\d+)/);
        if (cpfMatch) setUserCpf(cpfMatch[1]);
      }
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["my-promo-submissions", userCpf],
    queryFn: () => fetchSubmissions({ data: userCpf || "" }),
    enabled: !!userCpf,
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "enviada":
        return { 
          label: "Enviada", 
          icon: Send, 
          color: "text-blue-500", 
          bg: "bg-blue-500/10", 
          border: "border-blue-500/20" 
        };
      case "em_analise":
        return { 
          label: "Em Análise", 
          icon: Clock, 
          color: "text-amber-500", 
          bg: "bg-amber-500/10", 
          border: "border-amber-500/20" 
        };
      case "aceita":
        return { 
          label: "Aceita", 
          icon: CheckCircle2, 
          color: "text-emerald-500", 
          bg: "bg-emerald-500/10", 
          border: "border-emerald-500/20" 
        };
      case "recusada":
        return { 
          label: "Recusada", 
          icon: AlertCircle, 
          color: "text-rose-500", 
          bg: "bg-rose-500/10", 
          border: "border-rose-500/20" 
        };
      default:
        return { 
          label: status, 
          icon: FileText, 
          color: "text-muted-foreground", 
          bg: "bg-muted/10", 
          border: "border-muted/20" 
        };
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Status de Notas"
          description="Acompanhe o processamento das notas fiscais enviadas para a promoção."
          breadcrumbs={[{ label: "Painel", to: "/app" }, { label: "Minhas Notas" }]}
          actions={
            <Button asChild className="rounded-xl shadow-md">
              <Link to="/">Enviar Nova Nota</Link>
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Histórico de Envios</h2>
            
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />
                ))}
              </div>
            ) : !data || data.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-border bg-[var(--bg-surface)] p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-20" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-bold">Nenhuma nota enviada</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                  Envie suas notas fiscais para atualizar os preços e ganhar acesso premium.
                </p>
                <Button asChild className="mt-6 rounded-xl px-8" size="lg">
                  <Link to="/">Participar Agora</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.map((item) => {
                  const config = getStatusConfig(item.status);
                  const StatusIcon = config.icon;
                  return (
                    <div key={item.id} className="pc-card flex items-center justify-between gap-4 p-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
                          config.bg, config.color
                        )}>
                          <StatusIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate font-display text-base font-bold text-foreground">
                            {item.fileName}
                          </h4>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <span>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                            <span>·</span>
                            <span className={config.color}>{config.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Promoção</h2>
            <div className="pc-card space-y-6 p-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notas Enviadas</span>
                <p className="font-display text-3xl font-bold text-[var(--brand-primary)]">{data?.length || 0}</p>
              </div>
              <div className="border-t border-border pt-6 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)]">Como funciona?</h4>
                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                  Cada nota aprovada garante 30 dias de acesso premium. Nossa equipe valida o estabelecimento em até 24h.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
