import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { BackButton } from "@/components/layout/BackButton";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

/**
 * Termos e Privacidade — editorial single-viewport.
 *
 * Objetivo: caber sem rolagem em telas ≥ 720px de altura.
 *  • copy condensada em uma linha por item;
 *  • 6 itens por aba em grade 2/3 col;
 *  • rodapé compacto com contato + créditos + parcerias.
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
          "Documento oficial do PreçoCerto — LGPD, coleta, uso, direitos e regras de assinatura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadePage,
});

const UPDATED_AT = "12 fev 2026";

type Item = { id: string; title: string; body: React.ReactNode };
type TabKey = "privacidade" | "termos";

const PRIVACIDADE: Item[] = [
  {
    id: "dados",
    title: "Dados que coletamos",
    body: <>CPF criptografado, nome, celular e — opcional — endereço, foto, buscas e cestas.</>,
  },
  {
    id: "uso",
    title: "Como usamos",
    body: <>Autenticar acesso, personalizar por cidade, processar assinatura e métricas anônimas (LGPD art. 7º).</>,
  },
  {
    id: "compartilhamento",
    title: "Com quem compartilhamos",
    body: (
      <>
        Apenas processadores essenciais (auth em nuvem e Mercado Pago).{" "}
        <strong className="font-semibold text-foreground">Nunca vendemos dados.</strong>
      </>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos (LGPD)",
    body: <>Acesso, correção, portabilidade, exclusão e revogação — resposta em até 15 dias por e-mail.</>,
  },
  {
    id: "seguranca",
    title: "Segurança",
    body: <>TLS em toda conexão, isolamento por usuário (RLS) e chaves privilegiadas restritas ao servidor.</>,
  },
  {
    id: "atualizacoes",
    title: "Alterações",
    body: <>Mudanças relevantes são avisadas por e-mail ou dentro da plataforma.</>,
  },
];

const TERMOS: Item[] = [
  {
    id: "uso-aceitavel",
    title: "Uso aceitável",
    body: <>Uso pessoal e de boa-fé. Dados verdadeiros e senha em sigilo — você responde pela sua conta.</>,
  },
  {
    id: "precos",
    title: "Sobre os preços",
    body: (
      <>
        Referenciais, coletados pela comunidade.{" "}
        <strong className="font-semibold text-foreground">Confirme no caixa</strong> antes da compra.
      </>
    ),
  },
  {
    id: "assinatura",
    title: "Assinatura",
    body: <>Planos pagos liberam recursos avançados. Cancele quando quiser — vale até o fim do período.</>,
  },
  {
    id: "conduta",
    title: "Conduta proibida",
    body: <>Sem raspagem automatizada, preços falsos, bots ou burla de limites. Contas podem ser suspensas.</>,
  },
  {
    id: "responsabilidade",
    title: "Responsabilidade",
    body: <>A plataforma é fornecida &quot;como está&quot;. Decisões de compra são do usuário.</>,
  },
  {
    id: "evolucao",
    title: "Plataforma em evolução",
    body: <>Funções em desenvolvimento contínuo podem ter instabilidade — sua colaboração melhora a base.</>,
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
            "mt-px grid h-4 w-4 shrink-0 place-items-center rounded-md border border-brand-gold/30 bg-brand-gold/10 text-[10px] font-bold leading-none text-[var(--pc-gold-ink)]",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h2 className={cn(tc.itemTitle, "leading-tight")}>{item.title}</h2>
          <p className={cn(tc.meta, "mt-0.5 text-pretty leading-snug")}>{item.body}</p>
        </div>
      </div>
    </section>
  );
}

function PrivacidadePage() {
  const [tab, setTab] = useState<TabKey>("privacidade");
  const items = tab === "privacidade" ? PRIVACIDADE : TERMOS;

  return (
    <IsolatedPage
      className="bg-background"
      contentClassName="flex h-[100dvh] flex-col overflow-hidden !pb-0"
    >
      {/* HEADER */}
      <header className="shrink-0 border-b border-border/60 bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <span
          aria-hidden
          className="block h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand-gold) 75%, transparent) 50%, transparent)",
          }}
        />
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2 sm:px-4 md:gap-6 md:px-8">
          <div className="flex min-w-0 items-center gap-1.5">
            <BackButton fallbackTo="/" variant="ghost" />
            <span aria-hidden className="h-5 w-px bg-border" />
            <HomeBrandLink />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={cn(tc.eyebrow, "hidden sm:block")}>Documento oficial</span>
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

      {/* Lead + abas */}
      <section className="shrink-0 border-b border-border/60">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-3 py-2 sm:px-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className={cn(tc.lead, "max-w-2xl text-pretty")}>
            Em linguagem clara: o que coletamos, como usamos e as regras de uso. Não vendemos
            dados — exclusão e exportação a qualquer momento.
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
                  "pc-focus flex-1 rounded-full px-3 py-1 transition-colors md:flex-none",
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

      {/* CONTEÚDO — 6 cards em grade densa, sem rolagem em ≥720px */}
      <main className="pc-rail mx-auto w-full max-w-5xl min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 md:px-8">
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={item.id} className="min-w-0">
              {i > 0 && <hr className="pc-rule mb-3 sm:hidden" />}
              <ItemCard item={item} index={i} />
            </div>
          ))}
        </div>
      </main>

      {/* RODAPÉ compacto: contato + créditos + parcerias */}
      <footer className="shrink-0 border-t border-border/60 bg-background/92">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1.5 px-3 py-2 sm:px-4 md:flex-row md:items-center md:justify-between md:px-8">
          <p className={cn(tc.meta, "leading-snug")}>
            Idealizado por{" "}
            <strong className="font-semibold text-foreground">Franc D&apos;nis</strong> — Feijó (AC).
            Parcerias, delivery ou apps sob demanda:{" "}
            <a
              href="https://wa.me/5568992031340"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--pc-gold-ink)] underline underline-offset-2"
            >
              (68) 99203-1340
            </a>{" "}
            ·{" "}
            <a
              href="mailto:precocerto-fj@proton.me"
              className="font-semibold text-[var(--pc-gold-ink)] underline underline-offset-2"
            >
              precocerto-fj@proton.me
            </a>
          </p>
          <div className="flex items-center gap-2">
            <span className={cn(tc.meta, "shrink-0")}>Atualizado {UPDATED_AT}</span>
            <Link
              to="/fale-conosco"
              className={cn(
                tc.chip,
                "pc-focus inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-muted-foreground transition-colors hover:border-brand-gold hover:text-[var(--pc-gold-ink)]",
              )}
            >
              Fale conosco
            </Link>
          </div>
        </div>
      </footer>
    </IsolatedPage>
  );
}
