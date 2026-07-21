import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mail,
  Receipt,
  Camera,
  Send,
  CheckCircle2,
  Gift,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/brand/AppShell";
import { SocialProofStrip } from "@/components/collab/SocialProofStrip";
import { CollaboratorUploadForm } from "@/components/collab/CollaboratorUploadForm";
import { COLLAB_EMAIL, collabMailtoHref } from "@/lib/collab-mailto";

export const Route = createFileRoute("/colaborar")({
  head: () => ({
    meta: [
      { title: "Seja colaborador · PreçoCerto" },
      {
        name: "description",
        content:
          "Envie suas notas fiscais e ganhe 30 dias grátis após conferência. Ajude a manter os preços do seu bairro atualizados.",
      },
      { property: "og:title", content: "Seja colaborador · PreçoCerto" },
      {
        property: "og:description",
        content:
          "Rede colaborativa: envie notas fiscais por e-mail e receba 30 dias de acesso após a equipe conferir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollaboratePage,
});

function CollaboratePage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:px-6">
        {/* Header editorial */}
        <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/8 via-card to-background p-6 md:p-9">
          <span
            aria-hidden
            className="absolute left-8 top-0 h-1 w-20 rounded-b-full bg-primary"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          />
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3 w-3" strokeWidth={2.6} />
            Rede colaborativa
          </p>
          <h1 className="mt-3 font-display text-[30px] leading-[1.05] tracking-tight text-foreground md:text-[38px]">
            Seja colaborador.{" "}
            <span className="text-primary">Ganhe 30 dias grátis.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
            O PreçoCerto é mantido por gente comum enviando notas fiscais dos seus mercados favoritos.
            Cada comprovante ajuda a manter os preços do bairro atualizados — e, em troca, você
            recebe <strong className="text-foreground">30 dias de acesso completo</strong> após conferência da equipe.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={collabMailtoHref()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_2px_0_0_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" strokeWidth={2.4} />
              Enviar minha primeira nota
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </a>
            <a
              href={`mailto:${COLLAB_EMAIL}`}
              className="select-all rounded-full border border-border bg-background px-4 py-2.5 font-mono text-[12.5px] font-semibold text-foreground hover:bg-muted"
            >
              {COLLAB_EMAIL}
            </a>
          </div>
        </header>

        {/* Prova social */}
        <div className="mt-6">
          <SocialProofStrip />
          <CollaboratorUploadForm />
        </div>

        {/* Passo a passo */}
        <section aria-labelledby="steps-title" className="mt-8">
          <h2
            id="steps-title"
            className="font-display text-[22px] font-bold tracking-tight text-foreground"
          >
            Como funciona — em 4 passos
          </h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            <Step
              n={1}
              Icon={Camera}
              title="Fotografe a nota fiscal"
              text="Frente completa, sem cortes. O nome do mercado e os preços precisam estar legíveis."
            />
            <Step
              n={2}
              Icon={Mail}
              title="Anexe no e-mail"
              text={`Envie para ${COLLAB_EMAIL}. Use o botão acima — ele já preenche o assunto e o checklist.`}
            />
            <Step
              n={3}
              Icon={Receipt}
              title="Complete o checklist"
              text="Informe seu nome, mercado, cidade, data da compra e CPF (para vincular ao acesso)."
            />
            <Step
              n={4}
              Icon={Gift}
              title="Receba 30 dias grátis"
              text="Após conferência, seu acesso é liberado por 30 dias e o status aparece em Meu Perfil."
            />
          </ol>
        </section>

        {/* Termos de elegibilidade */}
        <section aria-labelledby="elig-title" className="mt-8">
          <h2
            id="elig-title"
            className="flex items-center gap-2 font-display text-[22px] font-bold tracking-tight text-foreground"
          >
            <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={2.4} />
            Elegibilidade para os 30 dias grátis
          </h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            <EligItem ok text="Nota fiscal legível de mercado, mercearia, farmácia ou distribuidora." />
            <EligItem ok text="Compra feita nos últimos 60 dias, com data visível." />
            <EligItem ok text="Ao menos 5 itens com preço claro por unidade ou por kg/L." />
            <EligItem ok text="Um CPF só pode receber 30 dias grátis a cada 90 dias." />
            <EligItem ok text="Aprovações liberam automaticamente 30 dias de acesso completo." />
            <EligItem
              text="Notas ilegíveis, duplicadas ou com dados adulterados não são aceitas."
              warn
            />
          </ul>
        </section>

        {/* Checklist */}
        <section
          aria-labelledby="checklist-title"
          className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-6"
        >
          <h2
            id="checklist-title"
            className="font-display text-[20px] font-bold tracking-tight text-foreground"
          >
            Antes de clicar em enviar
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            O botão de e-mail já preenche este checklist automaticamente — basta completar.
          </p>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {[
              "Nome completo",
              "Mercado favorito",
              "Cidade / bairro",
              "Data da compra",
              "Quantidade de notas anexadas",
              "CPF para os 30 dias",
            ].map((c) => (
              <li
                key={c}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground"
              >
                <CheckCircle2
                  className="h-4 w-4 flex-none text-primary"
                  strokeWidth={2.4}
                />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <a
              href={collabMailtoHref()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_2px_0_0_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              <Send className="h-4 w-4" strokeWidth={2.4} />
              Abrir e-mail com tudo preenchido
            </a>
          </div>
        </section>

        {/* Rodapé com link para o perfil */}
        <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-4 text-center">
          <p className="text-[13px] text-muted-foreground">
            Acompanhe o status de cada envio em{" "}
            <Link
              to="/perfil"
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Meu perfil → Meus 30 dias colaborador
            </Link>
            .
          </p>
        </div>
      </main>
    </AppShell>
  );
}

function Step({
  n,
  Icon,
  title,
  text,
}: {
  n: number;
  Icon: typeof Mail;
  title: string;
  text: string;
}) {
  return (
    <li className="relative flex gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.22em] text-primary">
            Passo {n}
          </span>
        </div>
        <h3 className="mt-0.5 font-display text-[15.5px] font-bold text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </li>
  );
}

function EligItem({
  text,
  ok = false,
  warn = false,
}: {
  text: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const Icon = warn ? AlertCircle : ok ? CheckCircle2 : CheckCircle2;
  const tone = warn
    ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
    : "border-border bg-card text-foreground";
  const iconTone = warn ? "text-amber-600 dark:text-amber-400" : "text-primary";
  return (
    <li
      className={
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] " + tone
      }
    >
      <Icon className={"h-4 w-4 flex-none " + iconTone} strokeWidth={2.4} />
      <span>{text}</span>
    </li>
  );
}
