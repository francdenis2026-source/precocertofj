import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackButton } from "@/components/layout/BackButton";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

/**
 * Termos e Privacidade — editorial de linhas finas (navy/gold).
 *
 * Otimizações:
 *  • zero imagens e zero dependências de ícones (glifos em texto) → sem jank
 *    de layout e sem requisições extras no primeiro paint;
 *  • data de atualização estática (evita mismatch de hidratação SSR/cliente);
 *  • tipografia 100% via tokens TypeClear (`tc.*`) e espaçamentos/raios do DS.
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

/** Data da última revisão do documento (estática de propósito). */
const UPDATED_AT = "12 fev 2026";

type Item = {
  id: string;
  title: string;
  body: React.ReactNode;
};

type TabKey = "privacidade" | "termos";

const PRIVACIDADE: Item[] = [
  {
    id: "dados",
    title: "Dados que coletamos",
    body: (
      <>
        CPF (criptografado), nome, celular e — opcional — endereço e foto. Também
        guardamos suas buscas e cestas salvas.
      </>
    ),
  },
  {
    id: "uso",
    title: "Como usamos",
    body: (
      <>
        Autenticar seu acesso, personalizar por cidade, processar assinatura e
        gerar métricas agregadas e anônimas. Base legal: LGPD art. 7º.
      </>
    ),
  },
  {
    id: "compartilhamento",
    title: "Com quem compartilhamos",
    body: (
      <>
        Apenas processadores essenciais: banco/auth em nuvem e Mercado Pago (PIX
        e cartão).{" "}
        <strong className="font-semibold text-foreground">
          Nunca vendemos seus dados.
        </strong>
      </>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos (LGPD)",
    body: (
      <>
        Acesso, correção, portabilidade, exclusão e revogação de consentimento.
        Respondemos em até 15 dias por e-mail.
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Segurança",
    body: (
      <>
        TLS em todas as conexões, isolamento por usuário (RLS no banco) e chaves
        privilegiadas restritas ao servidor.
      </>
    ),
  },
  {
    id: "atualizacoes",
    title: "Alterações",
    body: (
      <>
        Podemos atualizar este documento. Mudanças relevantes são avisadas por
        e-mail ou dentro da plataforma.
      </>
    ),
  },
];

const TERMOS: Item[] = [
  {
    id: "uso-aceitavel",
    title: "Uso aceitável",
    body: (
      <>
        Uso pessoal e de boa-fé. Cadastre dados verdadeiros e mantenha sua senha
        em sigilo — você responde pelo que acontece na sua conta.
      </>
    ),
  },
  {
    id: "precos",
    title: "Sobre os preços",
    body: (
      <>
        Preços são referenciais, coletados por usuários e parceiros.{" "}
        <strong className="font-semibold text-foreground">
          Confirme sempre no mercado
        </strong>{" "}
        antes da compra.
      </>
    ),
  },
  {
    id: "assinatura",
    title: "Assinatura",
    body: (
      <>
        Planos pagos liberam recursos avançados. Cancele quando quiser — o acesso
        segue até o fim do período vigente.
      </>
    ),
  },
  {
    id: "conduta",
    title: "Conduta proibida",
    body: (
      <>
        Sem raspagem automatizada, preços falsos, bots ou tentativa de burlar
        limites. Contas violadoras podem ser suspensas.
      </>
    ),
  },
  {
    id: "responsabilidade",
    title: "Responsabilidade",
    body: (
      <>
        A plataforma é fornecida &quot;como está&quot;. Não respondemos por
        decisões de compra baseadas nos preços exibidos.
      </>
    ),
  },
  {
    id: "contato",
    title: "Contato",
    body: (
      <a
        href="mailto:precocerto-fj@proton.me"
        className="font-semibold text-[var(--pc-gold-ink)] underline underline-offset-2 hover:opacity-80"
      >
        precocerto-fj@proton.me
      </a>
    ),
  },
];

function ItemCard({ item, index }: { item: Item; index: number }) {
  return (
    <section id={item.id} className="min-w-0 scroll-mt-20">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn(
            tc.num,
            "mt-px grid h-4 w-4 shrink-0 place-items-center rounded-md border border-brand-gold/30 bg-brand-gold/10 text-[9px] font-bold leading-none text-[var(--pc-gold-ink)]",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h2 className={tc.itemTitle}>{item.title}</h2>
          <p className={cn(tc.meta, "mt-0.5 text-pretty")}>{item.body}</p>
        </div>
      </div>
    </section>
  );
}

function PrivacidadePage() {
  const [tab, setTab] = useState<TabKey>("privacidade");
  const items = tab === "privacidade" ? PRIVACIDADE : TERMOS;

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      {/* HEADER editorial */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <span
          aria-hidden
          className="block h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 75%, transparent) 50%, transparent)",
          }}
        />
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 md:gap-6 md:px-8 md:py-3">
          <BackButton fallbackTo="/" variant="ghost" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={cn(tc.eyebrow, "hidden sm:block")}>
              Documento oficial
            </span>
            <h1 className={cn(tc.h1, "truncate")}>Termos e Privacidade</h1>
          </div>
          <span
            className={cn(
              tc.chip,
              "hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground sm:inline-flex",
            )}
          >
            LGPD
          </span>
        </div>
      </header>

      {/* IDENTIDADE + abas */}
      <section className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-3 py-2.5 sm:px-4 md:flex-row md:items-center md:justify-between md:px-8 md:py-3">
          <p className={cn(tc.lead, "max-w-2xl text-pretty")}>
            Em linguagem clara: o que coletamos, como usamos e as regras de uso.
            Não vendemos dados — exclusão e exportação a qualquer momento.
          </p>
          <div
            role="tablist"
            aria-label="Seções do documento"
            className="inline-flex w-full shrink-0 rounded-full border border-border bg-card p-0.5 md:w-auto"
          >
            {(["privacidade", "termos"] as TabKey[]).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold md:flex-none",
                  tc.chip,
                  tab === k
                    ? "bg-brand-gold text-brand-navy"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "privacidade" ? "Privacidade" : "Termos"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CONTEÚDO — grade fina, cabe em uma tela */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-3 sm:px-4 md:px-8 md:py-4">
        <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 sm:gap-y-3 lg:grid-cols-3 [&>section]:border-t [&>section]:border-border/60 [&>section]:pt-2.5 sm:[&>section]:pt-3">
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
          <p className={tc.meta}>Atualizado em {UPDATED_AT}</p>
          <Link
            to="/fale-conosco"
            className={cn(
              tc.chip,
              "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)]",
            )}
          >
            Fale conosco
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
