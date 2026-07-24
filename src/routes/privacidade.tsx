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
  ArrowLeft,
} from "lucide-react";
import { Footer } from "@/components/brand/Footer";
import { cn } from "@/lib/utils";

/**
 * Termos e Privacidade — layout compacto com abas.
 * Tokens semânticos + accent brand-gold para funcionar em light e dark.
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
      className="scroll-mt-20 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-brand-gold/40"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md border border-brand-gold/30 bg-brand-gold/10 text-brand-gold">
          <Icon className="h-3 w-3" strokeWidth={2.4} />
        </span>
        <h2 className="text-title font-semibold tracking-tight text-foreground">
          {item.title}
        </h2>
      </div>
      <div className="text-body-sm text-muted-foreground">
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
          Somente com processadores essenciais: banco/auth em nuvem e Mercado
          Pago (pagamento PIX e cartão).{" "}
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
          variar.{" "}
          <strong className="text-foreground">
            Confirme sempre no estabelecimento
          </strong>{" "}
          antes da compra.
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
          className="text-body-sm font-semibold text-brand-gold underline underline-offset-2 hover:text-brand-gold/80"
        >
          precocerto-fj@proton.me
        </a>
      ),
    },
  ];

  const items = tab === "privacidade" ? privacidadeItems : termosItems;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <header className="mb-4">
          <Link
            to="/"
            aria-label="PreçoCerto — voltar ao início"
            className="mb-3 inline-flex items-center gap-2.5 group"
          >
            <img
              src="/logo-mark.svg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-lg object-contain shadow-sm ring-1 ring-brand-gold/30 transition-transform group-hover:scale-[1.03]"
            />
            <span className="font-display text-title font-semibold leading-none tracking-tight text-foreground">
              <span className="text-brand-gold">P</span>reço<span className="text-brand-gold">C</span>erto
            </span>
          </Link>
          <p className="text-eyebrow">
            <ShieldCheck className="mr-1 inline h-3 w-3" strokeWidth={2.2} />
            Documento oficial · Atualizado em {updated}
          </p>
          <h1 className="text-h2 mt-1.5 text-foreground">
            Termos e Privacidade
          </h1>
          <p className="text-body-sm mt-1.5 max-w-xl text-muted-foreground">
            Em linguagem clara: o que coletamos, como usamos e as regras de uso
            da plataforma. Não vendemos dados. Exclusão e exportação a qualquer
            momento.
          </p>
        </header>



        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Seções do documento"
          className="mb-3 inline-flex rounded-lg border border-border bg-card p-1"
        >
          {(["privacidade", "termos"] as TabKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "text-eyebrow-muted rounded-md px-3 py-1.5 transition-colors",
                tab === k
                  ? "bg-brand-gold text-brand-navy shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}


            >
              {k === "privacidade" ? "Privacidade" : "Termos"}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <Link
            to="/"
            className="text-eyebrow-muted inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-brand-gold"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
            Voltar para a página inicial
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
