import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
} from "lucide-react";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { ShareButton } from "@/components/ds";
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* Barra superior compacta */}
      <header className="shrink-0 border-b border-border/60 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2.5">
          <Link
            to="/estabelecimentos"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden /> Voltar
          </Link>
          <span aria-hidden className="h-5 w-px bg-border" />
          <HomeBrandLink />
          <div className="ml-auto">
            <ShareButton
              title="Plantão das farmácias de Feijó/AC"
              text={`Farmácia de plantão hoje: ${plantaoHoje?.nome ?? "veja o calendário"}`}
              label="Compartilhar"
            />
          </div>
        </div>
      </header>

      <main className="pc-rail mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto px-4 pb-6 pt-4">

        {/* Cabeçalho editorial compacto */}
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/60 bg-[color-mix(in_oklab,var(--brand-gold)_14%,transparent)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--pc-gold-ink)]">
              <Pill className="h-3 w-3" aria-hidden /> Informativo público
            </span>
            <h1 className="mt-1.5 font-serif text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
              Plantão das farmácias de Feijó
            </h1>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              Rodízio de <strong className="text-foreground">{PLANTAO_MES.label}</strong>, publicado pela
              Secretaria Municipal de Saúde — Vigilância Sanitária.
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-foreground shadow-sm md:self-end">
            <Clock className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
            Balcão até 22h · após, sobreaviso
          </p>
        </div>

        {/* Plantão de hoje / amanhã — cartões espelhados compactos */}
        {plantaoHoje ? (
          <section className="mt-4 grid gap-3 md:grid-cols-2" aria-label="Plantão de hoje">
            <article className="relative overflow-hidden rounded-xl border border-brand-gold/70 bg-gradient-to-br from-[color-mix(in_oklab,var(--brand-gold)_16%,var(--card))] to-card p-4 shadow-sm">
              <span
                aria-hidden
                className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-brand-gold"
              />
              <div className="flex items-center justify-between">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--pc-gold-ink)]">
                  Hoje · dia {String(hoje).padStart(2, "0")} · {diaDaSemana(hoje!)}
                </div>
                <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy">
                  Plantão
                </span>
              </div>
              <h2 className="mt-1 font-serif text-[20px] font-semibold leading-tight">
                {plantaoHoje.nome}
              </h2>
              <p className="mt-1 inline-flex items-start gap-1.5 text-[12.5px] text-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" aria-hidden />
                {plantaoHoje.endereco} — {plantaoHoje.bairro}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {plantaoHoje.telefones.map((t) => (
                  <a
                    key={t}
                    href={`tel:${t.replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-gold/50 bg-background px-2.5 py-1 text-[12px] font-semibold text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  >
                    <Phone className="h-3 w-3 text-brand-gold" aria-hidden /> {t}
                  </a>
                ))}
              </div>
            </article>

            {amanha ? (
              <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Amanhã · dia {String(hoje! + 1).padStart(2, "0")} · {diaDaSemana(hoje! + 1)}
                </div>
                <h2 className="mt-1 font-serif text-[18px] font-semibold leading-tight">
                  {amanha.nome}
                </h2>
                <p className="mt-1 inline-flex items-start gap-1.5 text-[12px] text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold/80" aria-hidden />
                  {amanha.endereco} — {amanha.bairro}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {amanha.telefones.map((t) => (
                    <a
                      key={t}
                      href={`tel:${t.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11.5px] font-medium text-foreground transition-colors hover:border-brand-gold"
                    >
                      <Phone className="h-3 w-3" aria-hidden /> {t}
                    </a>
                  ))}
                </div>
              </article>
            ) : (
              <article className="rounded-xl border border-dashed border-border/70 bg-card/60 p-4 text-[12.5px] text-muted-foreground">
                Consulte o calendário abaixo para saber a próxima farmácia de plantão.
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

        {/* Corpo em 2 colunas: calendário + drogarias */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section aria-label="Calendário de plantões">
            <h2 className="flex items-center gap-2 font-serif text-[18px] font-semibold leading-tight">
              <CalendarDays className="h-4 w-4 text-brand-gold" aria-hidden />
              Calendário — {PLANTAO_MES.label}
            </h2>
            <div className="mt-2 overflow-hidden rounded-xl border border-border/70 shadow-sm">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <caption className="sr-only">
                  Escala diária de plantão em {PLANTAO_MES.label}
                </caption>
                <thead className="bg-muted/60">
                  <tr>
                    <th scope="col" className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Dia
                    </th>
                    <th scope="col" className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Semana
                    </th>
                    <th scope="col" className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
                            ? "border-t border-brand-gold/50 bg-[color-mix(in_oklab,var(--brand-gold)_16%,transparent)]"
                            : "border-t border-border/50 odd:bg-muted/15"
                        }
                      >
                        <td className="px-2.5 py-1.5 font-semibold tabular-nums text-foreground">
                          {String(d).padStart(2, "0")}
                        </td>
                        <td className="px-2.5 py-1.5 capitalize text-muted-foreground">
                          {diaDaSemana(d)}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <span className="font-medium text-foreground">{f?.nome ?? "—"}</span>
                          {atual && (
                            <span className="ml-2 rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy">
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

          <section aria-label="Farmácias e drogarias de Feijó">
            <h2 className="font-serif text-[18px] font-semibold leading-tight">
              Farmácias e drogarias da cidade
            </h2>
            <ul className="mt-2 grid grid-cols-1 gap-2">
              {FARMACIAS.map((f) => (
                <li
                  key={f.id}
                  className="group rounded-lg border border-border/70 bg-card p-2.5 shadow-sm transition-colors hover:border-brand-gold/60 hover:bg-[var(--pc-hover-tint)]"
                >
                  <h3 className="text-[13.5px] font-semibold leading-tight text-foreground group-hover:text-[var(--pc-gold-ink)]">
                    {f.nome}
                  </h3>
                  <p className="mt-0.5 inline-flex items-start gap-1 text-[11.5px] text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-brand-gold/80" aria-hidden />
                    {f.endereco} — {f.bairro}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {f.telefones.map((t) => (
                      <a
                        key={t}
                        href={`tel:${t.replace(/\D/g, "")}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                      >
                        <Phone className="h-2.5 w-2.5 text-brand-gold" aria-hidden /> {t}
                      </a>
                    ))}
                    <span className="ml-auto">
                      <ShareButton
                        size="sm"
                        title={f.nome}
                        text={`${f.nome} — ${f.endereco}, ${f.bairro}. Telefone: ${f.telefones[0] ?? ""}`}
                        label="Compartilhar"
                      />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Rodapé legal compacto */}
        <section
          className="mt-6 rounded-xl border border-border/70 bg-card p-3 shadow-sm"
          aria-label="Reclamações e base legal"
        >
          <h2 className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
            Reclamações e denúncias
          </h2>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            {CONTATOS_FISCALIZACAO.map((c) => (
              <li key={c.orgao}>
                <span className="text-muted-foreground">{c.orgao}: </span>
                <a
                  href={`tel:${c.telefone.replace(/\D/g, "")}`}
                  className="font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  {c.telefone}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{AVISO_LEGAL}</p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground/80">
            Reproduzido do calendário oficial da Prefeitura Municipal de Feijó — Vigilância
            Sanitária. Em caso de divergência, vale a publicação oficial.
          </p>
        </section>
      </main>
    </div>
  );
}
