import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  Mail,
  FileText,
  ScrollText,
  Database,
  Share2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Footer } from "@/components/brand/Footer";
import { cn } from "@/lib/utils";

/**
 * Página compacta de Termos e Privacidade com navegação em abas.
 * Linguagem acessível, layout responsivo em cartões curtos, LGPD (Lei 13.709/2018).
 */
export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Termos e Privacidade · PreçoCerto" },
      {
        name: "description",
        content:
          "Termos de Serviço e Política de Privacidade do PreçoCerto em linguagem clara. LGPD, seus dados, seus direitos.",
      },
      { property: "og:title", content: "Termos e Privacidade · PreçoCerto" },
      {
        property: "og:description",
        content:
          "Termos de Serviço e Política de Privacidade do PreçoCerto — versão compacta e acessível.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadePage,
});

type Item = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  body: React.ReactNode;
};

function Card({ item }: { item: Item }) {
  const Icon = item.icon;
  return (
    <section
      id={item.id}
      className="scroll-mt-20 rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-3 w-3" strokeWidth={2.4} />
        </span>
        <h2 className="font-display text-[13px] font-bold tracking-tight text-foreground">
          {item.title}
        </h2>
      </div>
      <div className="text-[12.5px] leading-snug text-muted-foreground">
        {item.body}
      </div>
    </section>
  );
}

type TabKey = "privacidade" | "termos";

function PrivacidadePage() {
  const [tab, setTab] = useState<TabKey>("privacidade");

  const updated = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const privacidadeItems: Item[] = [
    {
      id: "dados",
      title: "Dados que coletamos",
      icon: Database,
      body: (
        <p>
          CPF (criptografado), nome, celular e — opcional — endereço e foto.
          Também guardamos suas buscas e cestas salvas.
        </p>
      ),
    },
    {
      id: "uso",
      title: "Como usamos",
      icon: ShieldCheck,
      body: (
        <p>
          Para autenticar seu acesso, personalizar por cidade, processar sua
          assinatura e gerar métricas agregadas e anônimas. Base legal: LGPD
          art. 7º.
        </p>
      ),
    },
    {
      id: "compartilhamento",
      title: "Com quem compartilhamos",
      icon: Share2,
      body: (
        <p>
          Somente com processadores essenciais: banco/auth em nuvem, Mercado
          Pago (assinatura PIX) e Twilio (SMS de recuperação).{" "}
          <strong className="text-foreground">Nunca vendemos seus dados.</strong>
        </p>
      ),
    },
    {
      id: "direitos",
      title: "Seus direitos (LGPD)",
      icon: UserCheck,
      body: (
        <p>
          Acesso, correção, portabilidade, exclusão e revogação de consentimento.
          Respondemos em até 15 dias por e-mail.
        </p>
      ),
    },
    {
      id: "seguranca",
      title: "Segurança",
      icon: Lock,
      body: (
        <p>
          TLS em todas as conexões, isolamento por usuário (RLS no banco) e
          chaves privilegiadas restritas ao servidor.
        </p>
      ),
    },
    {
      id: "atualizacoes",
      title: "Alterações",
      icon: FileText,
      body: (
        <p>
          Podemos atualizar este documento. Mudanças relevantes são avisadas
          por e-mail ou dentro da plataforma.
        </p>
      ),
    },
  ];

  const termosItems: Item[] = [
    {
      id: "uso-aceitavel",
      title: "Uso aceitável",
      icon: CheckCircle2,
      body: (
        <p>
          Uso pessoal e de boa-fé. Cadastre dados verdadeiros e mantenha sua
          senha em sigilo — você é responsável pelo que acontece na sua conta.
        </p>
      ),
    },
    {
      id: "precos",
      title: "Sobre os preços",
      icon: ScrollText,
      body: (
        <p>
          Preços são referenciais, coletados por usuários e parceiros. Podem
          variar. <strong className="text-foreground">Confirme sempre no estabelecimento</strong> antes da compra.
        </p>
      ),
    },
    {
      id: "assinatura",
      title: "Assinatura",
      icon: FileText,
      body: (
        <p>
          Planos pagos liberam recursos avançados (assistente IA, comparações
          completas). Cancele quando quiser — o acesso segue até o fim do
          período vigente.
        </p>
      ),
    },
    {
      id: "conduta",
      title: "Conduta proibida",
      icon: AlertTriangle,
      body: (
        <p>
          Não é permitido raspagem automatizada, inserir preços falsos, usar
          bots ou tentar burlar limites. Contas violadoras podem ser suspensas.
        </p>
      ),
    },
    {
      id: "responsabilidade",
      title: "Limite de responsabilidade",
      icon: ShieldCheck,
      body: (
        <p>
          A plataforma é fornecida &quot;como está&quot;. Não nos
          responsabilizamos por decisões de compra baseadas em preços aqui
          exibidos.
        </p>
      ),
    },
    {
      id: "contato",
      title: "Contato",
      icon: Mail,
      body: (
        <a
          href="mailto:precocerto-fj@proton.me"
          className="font-mono text-[12px] font-semibold text-primary underline underline-offset-2"
        >
          precocerto-fj@proton.me
        </a>
      ),
    },
  ];

  const items = tab === "privacidade" ? privacidadeItems : termosItems;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            <ShieldCheck className="mr-1 inline h-3 w-3" strokeWidth={2.2} />
            Documento oficial · Atualizado em {updated}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
            Termos e Privacidade
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
            Em linguagem clara: o que coletamos, como usamos e as regras de uso
            da plataforma. Não vendemos dados. Exclusão e exportação a qualquer
            momento.
          </p>
        </header>

        {/* Tabs de navegação */}
        <div
          role="tablist"
          aria-label="Seções do documento"
          className="mb-4 inline-flex rounded-lg border border-border bg-card p-1"
        >
          <button
            role="tab"
            aria-selected={tab === "privacidade"}
            onClick={() => setTab("privacidade")}
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
              tab === "privacidade"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Privacidade
          </button>
          <button
            role="tab"
            aria-selected={tab === "termos"}
            onClick={() => setTab("termos")}
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
              tab === "termos"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Termos
          </button>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            to="/"
            className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
