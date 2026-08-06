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
      <div className="mx-auto max-w-4xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Status de Notas"
          description="Acompanhe aqui o processamento das notas fiscais que você enviou."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/app">Voltar ao painel</Link>
            </Button>
          }
        />

        <SectionCard 
          title="Minhas Notas" 
          description="Lista de envios realizados para a promoção '30 dias grátis'."
          className="pc-animate-fade-in"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)] opacity-50 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Buscando seus envios...</p>
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-6 opacity-20">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">Nenhuma nota enviada</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-8">
                Você ainda não participou da nossa promoção enviando sua primeira nota fiscal.
              </p>
              <Button asChild className="rounded-xl font-bold px-8">
                <Link to="/">Participar Agora</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arquivo / Data</th>
                    <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((item) => {
                    const config = getStatusConfig(item.status);
                    const StatusIcon = config.icon;
                    return (
                      <tr key={item.id} className="group transition-colors hover:bg-muted/30">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate text-foreground">{item.fileName}</p>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {new Date(item.createdAt).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider",
                            config.color, config.bg, config.border
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="mt-8 p-6 rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5">
          <h4 className="text-sm font-black uppercase tracking-widest text-[var(--brand-primary)] mb-2">Como funciona?</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Após o envio, nossa equipe valida se a nota fiscal é válida e pertence a um estabelecimento da nossa região. 
            Assim que aprovada, sua conta ganha automaticamente 30 dias de acesso premium.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
