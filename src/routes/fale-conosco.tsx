import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Send, Copy, Check, ShieldCheck } from "lucide-react";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { dsx } from "@/lib/ds";
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
  { value: "denuncia", label: "Denúncia" },
  { value: "parceria", label: "Parceria" },
  { value: "outro", label: "Outro" },
];

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] leading-tight text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25";

const labelClass =
  "text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground";

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
    <div className="flex min-h-[100svh] flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-2">
        <HomeBrandLink />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3 md:py-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <span className="badge-gold-outline inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
              <MessageSquare className="h-3 w-3" />
              Fale Conosco
            </span>
            <h1 className="mt-1.5 font-['Instrument_Serif',ui-serif,Georgia,serif] text-[clamp(22px,3.2vw,32px)] leading-[1.06] tracking-[-0.012em] text-foreground">
              Precisa falar com a equipe do{" "}
              <span className="italic text-brand-gold">PreçoCerto</span>?
            </h1>
          </div>
          <p className="hidden max-w-xs text-right text-[12.5px] leading-snug text-muted-foreground md:block">
            Resposta em até 2 dias úteis pelo e-mail institucional.
          </p>
        </header>

        <div className="mt-3 grid gap-3 md:grid-cols-[1.5fr_1fr]">
          {/* Formulário */}
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-border bg-card p-3.5 shadow-sm md:p-4"
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Nome</span>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder="Como podemos te chamar"
                  className={fieldClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>E-mail (opcional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="para resposta"
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="mt-2.5">
              <span className={labelClass}>Assunto</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ASSUNTOS.map((a) => {
                  const active = assunto === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAssunto(a.value)}
                      aria-pressed={active}
                      className={dsx(
                        "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition",
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
            </div>

            <label className="mt-2.5 block">
              <span className={labelClass}>Mensagem</span>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                required
                minLength={10}
                rows={4}
                placeholder="Conte pra gente o que aconteceu, sua sugestão ou dúvida…"
                className={dsx(fieldClass, "resize-none leading-[1.45]")}
              />
            </label>

            <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="min-w-0 text-[11px] leading-snug text-muted-foreground">
                Mínimo 10 caracteres. Ao enviar, seu app de e-mail abre preenchido para{" "}
                <strong className="font-semibold text-foreground">{CONTACT_EMAIL}</strong>.
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-gold btn-state-safe inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[14px] font-bold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
                Enviar
              </button>
            </div>
          </form>

          {/* Canal direto + privacidade */}
          <aside className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                <Mail className="h-3.5 w-3.5" />
                Canal direto
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="truncate text-[13px] font-semibold text-foreground hover:text-brand-gold"
                >
                  {CONTACT_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={onCopyEmail}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11.5px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  aria-label="Copiar e-mail"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-brand-gold/35 bg-brand-gold/10 p-3.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Privacidade
              </div>
              <p className="mt-1.5 text-[12.5px] leading-[1.45] text-foreground/90">
                Nunca envie senhas ou dados bancários. Suas mensagens seguem a{" "}
                <a href="/privacidade" className="font-semibold underline underline-offset-2">
                  Política de Privacidade
                </a>
                .
              </p>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
