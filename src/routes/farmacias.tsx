import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, Clock, MapPin, Phone, Pill, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  AVISO_LEGAL,
  CONTATOS_FISCALIZACAO,
  FARMACIAS,
  PLANTAO_MES,
  PLANTOES,
  diaDaSemana,
  diaVigente,
  farmaciaPorId,
} from "@/lib/farmacias-plantao";

export const Route = createFileRoute("/farmacias")({
  head: () => ({
    meta: [
      { title: "Plantão das farmácias de Feijó/AC — Calendário oficial | PreçoCerto" },
      {
        name: "description",
        content:
          "Consulte o calendário oficial de plantões das farmácias e drogarias de Feijó/AC, com endereços, telefones e a farmácia responsável em cada dia do mês.",
      },
      { property: "og:title", content: "Plantão das farmácias de Feijó/AC" },
      {
        property: "og:description",
        content:
          "Calendário de rodízio das farmácias de Feijó/AC com endereços e telefones de contato.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FarmaciasPage,
});

function FarmaciasPage() {
  const hoje = diaVigente();
  const dias = useMemo(() => Object.keys(PLANTOES).map(Number).sort((a, b) => a - b), []);
  const plantaoHoje = hoje ? farmaciaPorId(PLANTOES[hoje]) : null;
  const amanha = hoje && PLANTOES[hoje + 1] ? farmaciaPorId(PLANTOES[hoje + 1]) : null;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Link
          to="/estabelecimentos"
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Estabelecimentos
        </Link>

        <header className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy">
            <Pill className="h-3 w-3" aria-hidden /> Informativo público
          </span>
          <h1 className="mt-2 font-serif text-[24px] font-semibold leading-tight tracking-tight sm:text-[30px]">
            Plantão das farmácias de Feijó
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Calendário de rodízio referente a <strong className="text-foreground">{PLANTAO_MES.label}</strong>,
            publicado pela Secretaria Municipal de Saúde — Departamento de Vigilância Sanitária.
            Ainda não há farmácias com preços cadastrados na plataforma; esta área existe para
            orientar a comunidade sobre atendimento de urgência.
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
            Atendimento em balcão até as 22h · após esse horário, sobreaviso
          </p>
        </header>

        {plantaoHoje ? (
          <section className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Plantão de hoje">
            <article className="rounded-xl border border-brand-gold/70 bg-brand-gold/10 p-4 shadow-sm">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--pc-gold-ink)]">
                Hoje · dia {hoje} ({diaDaSemana(hoje!)})
              </div>
              <h2 className="mt-1 font-serif text-[20px] font-semibold leading-tight">
                {plantaoHoje.nome}
              </h2>
              <p className="mt-1 inline-flex items-start gap-1.5 text-[13px] text-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" aria-hidden />
                {plantaoHoje.endereco} — {plantaoHoje.bairro}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {plantaoHoje.telefones.map((t) => (
                  <a
                    key={t}
                    href={`tel:${t.replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[12px] font-semibold text-foreground transition-colors hover:border-brand-gold"
                  >
                    <Phone className="h-3 w-3" aria-hidden /> {t}
                  </a>
                ))}
              </div>
            </article>
            {amanha && (
              <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Amanhã · dia {hoje! + 1} ({diaDaSemana(hoje! + 1)})
                </div>
                <h2 className="mt-1 font-serif text-[18px] font-semibold leading-tight">
                  {amanha.nome}
                </h2>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {amanha.endereco} — {amanha.bairro}
                </p>
              </article>
            )}
          </section>
        ) : (
          <p className="mt-4 inline-flex items-start gap-2 rounded-xl border border-border/70 bg-card p-4 text-[13px] text-muted-foreground shadow-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
            O calendário publicado abaixo é referente a {PLANTAO_MES.label}. Confirme com a
            Vigilância Sanitária a escala do mês corrente.
          </p>
        )}

        <section className="mt-8" aria-label="Calendário de plantões">
          <h2 className="flex items-center gap-2 font-serif text-[20px] font-semibold leading-tight">
            <CalendarDays className="h-4 w-4 text-brand-gold" aria-hidden />
            Calendário — {PLANTAO_MES.label}
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-border/70 shadow-sm">
            <table className="w-full border-collapse text-left text-[13px]">
              <caption className="sr-only">
                Escala diária de plantão das farmácias de Feijó em {PLANTAO_MES.label}
              </caption>
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Dia
                  </th>
                  <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Semana
                  </th>
                  <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Farmácia de plantão
                  </th>
                </tr>
              </thead>
              <tbody>
                {dias.map((d) => {
                  const f = farmaciaPorId(PLANTOES[d]);
                  const atual = hoje === d;
                  return (
                    <tr
                      key={d}
                      className={
                        atual
                          ? "border-t border-border/60 bg-brand-gold/15"
                          : "border-t border-border/60 odd:bg-muted/20"
                      }
                    >
                      <td className="px-3 py-2 font-semibold tabular-nums">
                        {String(d).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">{diaDaSemana(d)}</td>
                      <td className="px-3 py-2 font-medium">
                        {f?.nome ?? "—"}
                        {atual && (
                          <span className="ml-2 rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy">
                            hoje
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8" aria-label="Farmácias e drogarias de Feijó">
          <h2 className="font-serif text-[20px] font-semibold leading-tight">
            Farmácias e drogarias da cidade
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FARMACIAS.map((f) => (
              <li key={f.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <h3 className="text-[15px] font-semibold leading-tight">{f.nome}</h3>
                <p className="mt-1 inline-flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" aria-hidden />
                  {f.endereco} — {f.bairro}, Feijó/AC
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.telefones.map((t) => (
                    <a
                      key={t}
                      href={`tel:${t.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[12px] font-semibold text-foreground transition-colors hover:border-brand-gold"
                    >
                      <Phone className="h-3 w-3" aria-hidden /> {t}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-xl border border-border/70 bg-card p-4 shadow-sm" aria-label="Reclamações e base legal">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground">
            <ShieldCheck className="h-4 w-4 text-brand-gold" aria-hidden />
            Reclamações e denúncias
          </h2>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
            {CONTATOS_FISCALIZACAO.map((c) => (
              <li key={c.orgao}>
                <span className="text-muted-foreground">{c.orgao}: </span>
                <a
                  href={`tel:${c.telefone.replace(/\D/g, "")}`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {c.telefone}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">{AVISO_LEGAL}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Informativo reproduzido do calendário oficial da Prefeitura Municipal de Feijó —
            Secretaria Municipal de Saúde / Vigilância Sanitária. Em caso de divergência, vale a
            publicação oficial do órgão.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
