import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Send, Copy, Check, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ds, dsx } from "@/lib/ds";
import { toast } from "sonner";

const CONTACT_EMAIL = "precocerto-fj@proton.me";

export const Route = createFileRoute("/fale-conosco")({
  head: () => ({
    meta: [
      { title: "Fale Conosco · PreçoCerto" },
      {
        name: "description",
        content:
          "Envie sua dúvida, sugestão ou denúncia para a equipe do PreçoCerto. Resposta direta no e-mail institucional precocerto-fj@proton.me.",
      },
      { property: "og:title", content: "Fale Conosco · PreçoCerto" },
      {
        property: "og:description",
        content:
          "Canal oficial de contato do PreçoCerto — comparador colaborativo dos mercados de Feijó (AC).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FaleConoscoPage,
});

type Assunto = "duvida" | "sugestao" | "denuncia" | "parceria" | "outro";

const ASSUNTOS: Array<{ value: Assunto; label: string }> = [
  { value: "duvida", label: "Dúvida" },
  { value: "sugestao", label: "Sugestão" },
  { value: "denuncia", label: "Denúncia de preço" },
  { value: "parceria", label: "Parceria / mercado" },
  { value: "outro", label: "Outro" },
];

function FaleConoscoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState<Assunto>("duvida");
  const [mensagem, setMensagem] = useState("");
  const [copied, setCopied] = useState(false);

  const canSubmit = nome.trim().length >= 2 && mensagem.trim().length >= 10;

  const mailtoHref = useMemo(() => {
    const subjectLabel = ASSUNTOS.find((a) => a.value === assunto)?.label ?? "Contato";
    const subject = `[PreçoCerto · ${subjectLabel}] ${nome || "Contato do site"}`;
    const bodyLines = [
      `Nome: ${nome || "-"}`,
      `E-mail para resposta: ${email || "-"}`,
      `Assunto: ${subjectLabel}`,
      "",
      "Mensagem:",
      mensagem || "-",
      "",
      "— enviado pelo formulário /fale-conosco",
    ];
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  }, [nome, email, assunto, mensagem]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Preencha nome e uma mensagem com pelo menos 10 caracteres.");
      return;
    }
    window.location.href = mailtoHref;
    toast.success("Abrindo seu app de e-mail…", {
      description: `Se nada abrir, escreva direto para ${CONTACT_EMAIL}.`,
    });
  };

  const onCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      toast.success("E-mail copiado.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente: " + CONTACT_EMAIL);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="solid" />

      <main className={dsx(ds.container, "py-8 md:py-14")}>
        <header className="max-w-2xl">
          <span className="badge-gold-outline inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
            <MessageSquare className="h-3.5 w-3.5" />
            Fale Conosco
          </span>
          <h1 className="mt-4 font-['Instrument_Serif',ui-serif,Georgia,serif] text-[32px] leading-[1.05] tracking-[-0.012em] text-foreground md:text-[46px]">
            Precisa falar com a equipe do{" "}
            <span className="italic text-brand-gold">PreçoCerto</span>?
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-[1.55] text-muted-foreground md:text-[16px]">
            Envie sua mensagem pelo formulário abaixo. Nós respondemos direto do e-mail institucional{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-foreground underline underline-offset-2 hover:text-brand-gold"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </header>

        <div className="mt-8 grid gap-6 md:mt-10 md:grid-cols-[1.4fr_1fr]">
          {/* Formulário */}
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Nome
                </span>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder="Como podemos te chamar"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </label>

              <label className="block">
                <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  E-mail (opcional)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="para resposta"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Assunto
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ASSUNTOS.map((a) => {
                  const active = assunto === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAssunto(a.value)}
                      aria-pressed={active}
                      className={dsx(
                        "pc-tile rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <label className="mt-4 block">
              <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Mensagem
              </span>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                required
                minLength={10}
                rows={6}
                placeholder="Conte pra gente o que aconteceu, sua sugestão ou dúvida…"
                className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3.5 py-2.5 text-[15px] leading-[1.55] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
              <span className="mt-1 block text-[11.5px] text-muted-foreground">
                Mínimo de 10 caracteres. Nunca envie senhas ou dados bancários.
              </span>
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-muted-foreground">
                Ao enviar, seu app de e-mail abre com a mensagem preenchida para{" "}
                <strong className="font-semibold text-foreground">{CONTACT_EMAIL}</strong>.
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-gold btn-state-safe pc-lift inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[15px] font-bold shadow-md transition active:scale-[0.98] disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                Enviar mensagem
              </button>
            </div>
          </form>

          {/* Fallback / canal direto */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                <Mail className="h-4 w-4" />
                Canal direto
              </div>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-muted-foreground">
                Se preferir, escreva diretamente para o e-mail institucional. Respondemos em até
                dois dias úteis.
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="truncate text-[14px] font-semibold text-foreground hover:text-brand-gold"
                >
                  {CONTACT_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={onCopyEmail}
                  className="pc-tile inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  aria-label="Copiar e-mail"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-gold/35 bg-brand-gold/10 p-5">
              <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                <ShieldCheck className="h-4 w-4" />
                Privacidade
              </div>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-foreground/90">
                Suas mensagens são tratadas conforme a nossa{" "}
                <a href="/privacidade" className="font-semibold underline underline-offset-2">
                  Política de Privacidade
                </a>
                . Não compartilhamos seus dados com terceiros sem consentimento.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

