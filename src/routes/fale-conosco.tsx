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
    <div className="min-h-screen bg-[#f7f9fc]">
      <SiteHeader variant="solid" />

      <main className={dsx(ds.container, "py-8 md:py-14")}>
        <header className="max-w-2xl">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ borderColor: "#e2c67a", background: "#fbf3dc", color: "#7a5a1e" }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Fale Conosco
          </span>
          <h1
            className="mt-4 font-['Instrument_Serif',ui-serif,Georgia,serif] text-[32px] leading-[1.05] tracking-[-0.012em] text-[#0f1b3d] md:text-[46px]"
          >
            Precisa falar com a equipe do <span className="italic text-[#b58a3c]">PreçoCerto</span>?
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-[1.55] text-[#334463] md:text-[16px]">
            Envie sua mensagem pelo formulário abaixo. Nós respondemos direto do e-mail institucional{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-[#0f1b3d] underline underline-offset-2 hover:text-[#b58a3c]"
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
            className="rounded-2xl border bg-white p-5 shadow-sm md:p-7"
            style={{ borderColor: "#d4dbe6" }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#334463]">
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
                  className="mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-[#0f1b3d] outline-none transition focus:border-[#b58a3c] focus:ring-2 focus:ring-[#b58a3c]/25"
                  style={{ borderColor: "#d4dbe6" }}
                />
              </label>

              <label className="block">
                <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#334463]">
                  E-mail (opcional)
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="para resposta"
                  className="mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-[#0f1b3d] outline-none transition focus:border-[#b58a3c] focus:ring-2 focus:ring-[#b58a3c]/25"
                  style={{ borderColor: "#d4dbe6" }}
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#334463]">
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
                      className={dsx(
                        "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
                        active
                          ? "border-[#0f1b3d] bg-[#0f1b3d] text-white"
                          : "border-[#d4dbe6] bg-white text-[#334463] hover:border-[#0f1b3d]/40",
                      )}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <label className="mt-4 block">
              <span className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-[#334463]">
                Mensagem
              </span>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                required
                minLength={10}
                rows={6}
                placeholder="Conte pra gente o que aconteceu, sua sugestão ou dúvida…"
                className="mt-1.5 w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-[15px] leading-[1.55] text-[#0f1b3d] outline-none transition focus:border-[#b58a3c] focus:ring-2 focus:ring-[#b58a3c]/25"
                style={{ borderColor: "#d4dbe6" }}
              />
              <span className="mt-1 block text-[11.5px] text-[#6a7a94]">
                Mínimo de 10 caracteres. Nunca envie senhas ou dados bancários.
              </span>
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-[#6a7a94]">
                Ao enviar, seu app de e-mail abre com a mensagem preenchida para{" "}
                <strong className="font-semibold text-[#0f1b3d]">{CONTACT_EMAIL}</strong>.
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[15px] font-bold shadow-md transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "#b58a3c",
                  color: "#0f1b3d",
                  boxShadow: "0 6px 16px #b58a3c40",
                }}
              >
                <Send className="h-4 w-4" />
                Enviar mensagem
              </button>
            </div>
          </form>

          {/* Fallback / canal direto */}
          <aside className="space-y-4">
            <div
              className="rounded-2xl border bg-white p-5 shadow-sm"
              style={{ borderColor: "#d4dbe6" }}
            >
              <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.18em] text-[#b58a3c]">
                <Mail className="h-4 w-4" />
                Canal direto
              </div>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-[#334463]">
                Se preferir, escreva diretamente para o e-mail institucional. Respondemos em até
                dois dias úteis.
              </p>
              <div
                className="mt-3 flex items-center justify-between gap-2 rounded-lg border bg-[#f7f9fc] px-3 py-2.5"
                style={{ borderColor: "#d4dbe6" }}
              >
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="truncate text-[14px] font-semibold text-[#0f1b3d] hover:text-[#b58a3c]"
                >
                  {CONTACT_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={onCopyEmail}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold text-[#334463] transition hover:border-[#0f1b3d]/40"
                  style={{ borderColor: "#d4dbe6", background: "white" }}
                  aria-label="Copiar e-mail"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl border p-5"
              style={{ borderColor: "#e2c67a", background: "#fbf3dc" }}
            >
              <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.18em] text-[#7a5a1e]">
                <ShieldCheck className="h-4 w-4" />
                Privacidade
              </div>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-[#5c4514]">
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
