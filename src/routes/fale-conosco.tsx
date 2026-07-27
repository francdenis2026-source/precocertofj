import { useMemo, useState, useId } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Mail,
  MessageSquare,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Phone,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { z } from "zod";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { dsx } from "@/lib/ds";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CONTACT_EMAIL = "precocerto-fj@proton.me";
const CONTACT_PHONE = "(68) 99203-1340";
const CONTACT_PHONE_RAW = "5568992031340";
const CONTACT_HOURS = "Seg a Sex · 8h às 18h";


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

const fieldBase =
  "mt-0.5 w-full rounded-lg border bg-background px-2.5 py-1.5 text-[13.5px] leading-tight sm:mt-1 sm:px-3 sm:py-2 sm:text-[14px] text-foreground outline-none transition placeholder:text-muted-foreground pc-focus";

const fieldClass = cn(
  fieldBase,
  "border-border focus:border-brand focus:ring-2 focus:ring-brand/25",
);

const fieldErrorClass = cn(
  fieldBase,
  "border-destructive/70 focus:border-destructive focus:ring-2 focus:ring-destructive/25",
);

const labelClass = cn(
  tc.eyebrow,
  "text-muted-foreground tracking-[0.16em]",
);

const contactSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe seu nome (mínimo 2 caracteres).")
    .max(80, "Nome muito longo (máximo 80 caracteres)."),
  email: z
    .string()
    .trim()
    .max(120, "E-mail muito longo.")
    .refine(
      (v) => v.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "E-mail em formato inválido.",
    )
    .optional()
    .or(z.literal("")),
  mensagem: z
    .string()
    .trim()
    .min(10, "Mensagem muito curta (mínimo 10 caracteres).")
    .max(2000, "Mensagem muito longa (máximo 2000 caracteres)."),
});

type FormErrors = Partial<Record<"nome" | "email" | "mensagem", string>>;

function FaleConoscoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState<Assunto>("duvida");
  const [mensagem, setMensagem] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const nomeId = useId();
  const emailId = useId();
  const mensagemId = useId();
  const errNomeId = `${nomeId}-err`;
  const errEmailId = `${emailId}-err`;
  const errMsgId = `${mensagemId}-err`;

  const validate = (): FormErrors => {
    const result = contactSchema.safeParse({ nome, email, mensagem });
    if (result.success) return {};
    const next: FormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormErrors;
      if (key && !next[key]) next[key] = issue.message;
    }
    return next;
  };

  const canSubmit =
    nome.trim().length >= 2 && mensagem.trim().length >= 10 && !sending;

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const next = validate();
    setTouched({ nome: true, email: true, mensagem: true });
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Revise os campos destacados.", {
        description: Object.values(next)[0],
      });
      // Focus first invalid field
      const firstKey = Object.keys(next)[0];
      const el = document.getElementById(
        firstKey === "nome" ? nomeId : firstKey === "email" ? emailId : mensagemId,
      ) as HTMLElement | null;
      el?.focus();
      return;
    }
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      window.location.href = mailtoHref;
      toast.success("Abrindo seu app de e-mail…", {
        description: `Se nada abrir, escreva direto para ${CONTACT_EMAIL}.`,
      });
    } catch {
      toast.error("Não foi possível abrir seu app de e-mail.", {
        description: `Escreva direto para ${CONTACT_EMAIL}.`,
      });
    } finally {
      setTimeout(() => setSending(false), 800);
    }
  };

  const copy = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`${label} copiado.`);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    } catch {
      toast.error(`Não foi possível copiar. Use: ${value}`);
    }
  };

  const showErr = (k: keyof FormErrors) => touched[k] && errors[k];


  return (
    <IsolatedPage className="bg-background">
      <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pt-1 md:pt-2">
        <HomeBrandLink />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-2 md:py-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <span className="badge-gold-outline hidden items-center gap-1.5 sm:inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
              <MessageSquare className="h-3 w-3" />
              Fale Conosco
            </span>
            <h1 className="sm:mt-1.5 font-['Instrument_Serif',ui-serif,Georgia,serif] text-[clamp(19px,3.2vw,32px)] leading-[1.06] tracking-[-0.012em] text-foreground">
              Precisa falar com a equipe do{" "}
              <span className="italic text-brand-gold">PreçoCerto</span>?
            </h1>
          </div>
          <p className="hidden max-w-xs text-right text-[12.5px] leading-snug text-muted-foreground md:block">
            Resposta em até 2 dias úteis pelo e-mail institucional.
          </p>
        </header>

        <div className="mt-2 grid gap-2 md:mt-3 md:gap-3 md:grid-cols-[1.5fr_1fr]">
          {/* Formulário */}
          <form
            onSubmit={onSubmit}
            noValidate
            aria-describedby="form-help"
            className="pc-surface-1 p-2.5 md:p-4"
          >
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2.5">
              <div className="block">
                <label htmlFor={nomeId} className={labelClass}>
                  Nome
                </label>
                <input
                  id={nomeId}
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, nome: true }));
                    setErrors(validate());
                  }}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Como podemos te chamar"
                  aria-invalid={Boolean(showErr("nome"))}
                  aria-describedby={showErr("nome") ? errNomeId : undefined}
                  className={showErr("nome") ? fieldErrorClass : fieldClass}
                />
                {showErr("nome") && (
                  <p
                    id={errNomeId}
                    role="alert"
                    className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-destructive"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                    {errors.nome}
                  </p>
                )}
              </div>

              <div className="block">
                <label htmlFor={emailId} className={labelClass}>
                  E-mail (opcional)
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, email: true }));
                    setErrors(validate());
                  }}
                  autoComplete="email"
                  maxLength={120}
                  placeholder="para resposta"
                  aria-invalid={Boolean(showErr("email"))}
                  aria-describedby={showErr("email") ? errEmailId : undefined}
                  className={showErr("email") ? fieldErrorClass : fieldClass}
                />
                {showErr("email") && (
                  <p
                    id={errEmailId}
                    role="alert"
                    className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-destructive"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <fieldset className="mt-2.5 border-0 p-0">
              <legend className={labelClass}>Assunto</legend>
              <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Assunto do contato">
                {ASSUNTOS.map((a) => {
                  const active = assunto === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAssunto(a.value)}
                      role="radio"
                      aria-checked={active}
                      className={dsx(
                        "pc-focus rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition sm:py-1 sm:text-[12px]",
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
            </fieldset>

            <div className="mt-2 block sm:mt-2.5">
              <label htmlFor={mensagemId} className={labelClass}>
                Mensagem
              </label>
              <textarea
                id={mensagemId}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                onBlur={() => {
                  setTouched((t) => ({ ...t, mensagem: true }));
                  setErrors(validate());
                }}
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                placeholder="Conte pra gente o que aconteceu, sua sugestão ou dúvida…"
                aria-invalid={Boolean(showErr("mensagem"))}
                aria-describedby={showErr("mensagem") ? errMsgId : undefined}
                className={cn(
                  showErr("mensagem") ? fieldErrorClass : fieldClass,
                  "h-[60px] resize-none leading-[1.45] sm:h-[104px]",
                )}
              />
              <div className="mt-0.5 flex items-center justify-between gap-2">
                {showErr("mensagem") ? (
                  <p
                    id={errMsgId}
                    role="alert"
                    className="flex items-center gap-1 text-[11.5px] font-medium text-destructive"
                  >
                    <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                    {errors.mensagem}
                  </p>
                ) : (
                  <span aria-hidden />
                )}
                <span
                  className="text-[10.5px] tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  {mensagem.trim().length}/2000
                </span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:mt-2.5 sm:gap-3">
              <p id="form-help" className="min-w-0 text-[11px] leading-snug text-muted-foreground">
                <span className="hidden sm:inline">
                  Mínimo 10 caracteres. Ao enviar, seu app de e-mail abre preenchido para{" "}
                </span>
                <span className="sm:hidden">Abre seu app de e-mail para </span>
                <strong className="font-semibold text-foreground">{CONTACT_EMAIL}</strong>.
              </p>

              <button
                type="submit"
                disabled={!canSubmit}
                aria-busy={sending}
                className="btn-gold btn-state-safe pc-focus inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[14px] font-bold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-3.5 w-3.5" aria-hidden />
                )}
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </form>

          {/* Atalhos de contato + privacidade */}
          <aside className="grid gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-1">
            <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm md:p-3.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                <Mail className="h-3.5 w-3.5" />
                Atalhos de contato
              </div>

              <ul className="mt-1.5 grid gap-1">
                <li className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-foreground hover:text-brand-gold"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{CONTACT_EMAIL}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copy("email", CONTACT_EMAIL, "E-mail")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11.5px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    aria-label="Copiar e-mail"
                  >
                    {copiedKey === "email" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span className="hidden lg:inline">
                      {copiedKey === "email" ? "Copiado" : "Copiar"}
                    </span>
                  </button>
                </li>

                <li className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
                  <a
                    href={`https://wa.me/${CONTACT_PHONE_RAW}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-foreground hover:text-brand-gold"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{CONTACT_PHONE}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copy("phone", CONTACT_PHONE, "Telefone")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11.5px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    aria-label="Copiar telefone"
                  >
                    {copiedKey === "phone" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span className="hidden lg:inline">
                      {copiedKey === "phone" ? "Copiado" : "Copiar"}
                    </span>
                  </button>
                </li>

                <li className="flex min-w-0 items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[12.5px] font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{CONTACT_HOURS}</span>
                </li>
              </ul>

              <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-[1.35] text-muted-foreground sm:hidden">
                <ShieldCheck className="mt-[1px] h-3 w-3 shrink-0 text-brand-gold" />
                <span>
                  Nunca envie senhas ou dados bancários —{" "}
                  <a href="/privacidade" className="font-semibold underline underline-offset-2">
                    Privacidade
                  </a>
                  .
                </span>
              </p>
            </div>

            <div className="hidden rounded-xl border border-brand-gold/35 bg-brand-gold/10 p-2.5 sm:block md:p-3.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Privacidade
              </div>
              <p className="mt-1 text-[12px] leading-[1.4] text-foreground/90 md:text-[12.5px]">
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

    </IsolatedPage>

  );
}
