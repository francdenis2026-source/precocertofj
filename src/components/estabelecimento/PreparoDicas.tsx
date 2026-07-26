import { useCallback, useEffect, useMemo, useState } from "react";
import { Beef, Clock, Download, Filter, Flame, Share2, Star, Trash2, X } from "lucide-react";
import imgCozidao from "@/assets/preparo/cozidao.jpg";
import imgAssado from "@/assets/preparo/assado.jpg";
import imgChurrasco from "@/assets/preparo/churrasco.jpg";
import imgStrogonoff from "@/assets/preparo/strogonoff.jpg";
import imgEnsopado from "@/assets/preparo/ensopado.jpg";
import imgGrelhado from "@/assets/preparo/grelhado.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PREPARO_DICAS, PROTEINAS, favoriteKey, type ProteinaId } from "@/lib/preparo-dicas-data";
import { gerarGuiaPreparoPDF } from "@/lib/preparo-dicas-pdf";
import { shareOrDownloadPreparoCard } from "@/lib/preparo-dicas-card";
import {
  MODOS,
  TEMPO_FAIXAS,
  aplicarFiltros,
  type ModoId,
  type TempoFaixaId,
} from "@/lib/preparo-dicas-filtros";

const PROTEINA_LABEL: Record<ProteinaId, string> = PROTEINAS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p.label }),
  {} as Record<ProteinaId, string>,
);

const FOTOS: Record<string, string> = {
  cozidao: imgCozidao,
  assado: imgAssado,
  churrasco: imgChurrasco,
  strogonoff: imgStrogonoff,
  ensopado: imgEnsopado,
  grelhado: imgGrelhado,
};

const STORAGE_KEY = "preparo:favoritos:v1";

function useFavoritos() {
  const [favs, setFavs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavs(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setFavs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (key: string) => {
      const next = new Set(favs);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persist(next);
    },
    [favs, persist],
  );

  const clear = useCallback(() => persist(new Set()), [persist]);

  return { favs, toggle, clear };
}

/** Chip padrão navy/gold — mesmo desenho usado no balcão do açougue. */
const chipCls = (active: boolean, disabled = false) =>
  disabled
    ? "inline-flex h-7 shrink-0 cursor-not-allowed items-center gap-1 rounded-full border border-dashed border-border/60 bg-background/40 px-2.5 text-[11px] font-medium leading-none text-muted-foreground/60"
    : active
      ? "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-brand-gold bg-brand-gold px-2.5 text-[11px] font-bold leading-none text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      : "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const microLabel =
  "text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-muted-foreground";

export function PreparoDicas() {
  const { favs, toggle, clear } = useFavoritos();
  const [baixando, setBaixando] = useState(false);
  const [cardKey, setCardKey] = useState<string | null>(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [temposSel, setTemposSel] = useState<Set<TempoFaixaId>>(() => new Set());
  const [modosSel, setModosSel] = useState<Set<ModoId>>(() => new Set());
  const [proteinasSel, setProteinasSel] = useState<Set<ProteinaId>>(() => new Set());



  const toggleTempo = (id: TempoFaixaId) => {
    setTemposSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleModo = (id: ModoId) => {
    setModosSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleProteina = (id: ProteinaId) => {
    setProteinasSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const limparFiltros = () => {
    setTemposSel(new Set());
    setModosSel(new Set());
    setProteinasSel(new Set());
  };
  const filtrosAtivos = temposSel.size + modosSel.size + proteinasSel.size;

  const dicasFiltradas = useMemo(
    () => aplicarFiltros(PREPARO_DICAS, { tempos: temposSel, modos: modosSel, proteinas: proteinasSel }),
    [temposSel, modosSel, proteinasSel],
  );

  // Proteínas efetivamente presentes nos dados (dicas + variações).
  // Chips sem nenhum corte cadastrado são desabilitados.
  const proteinasDisponiveis = useMemo(() => {
    const s = new Set<ProteinaId>();
    PREPARO_DICAS.forEach((d) => {
      (d.proteinas && d.proteinas.length > 0 ? d.proteinas : (["boi"] as ProteinaId[])).forEach((p) => s.add(p));
      (d.variacoes ?? []).forEach((v) => {
        (v.proteinas && v.proteinas.length > 0 ? v.proteinas : (["boi"] as ProteinaId[])).forEach((p) => s.add(p));
      });
    });
    return s;
  }, []);

  const favoritosPorDica = useMemo(() => {
    const map = new Map<string, string[]>();
    PREPARO_DICAS.forEach((d) => {
      const nomes = d.cortes
        .map((c) => c.nome)
        .filter((n) => favs.has(favoriteKey(d.key, n)));
      if (nomes.length) map.set(d.key, nomes);
    });
    return map;
  }, [favs]);


  const handleBaixarPDF = async () => {
    try {
      setBaixando(true);
      // dá tempo do botão exibir estado de loading
      await new Promise((r) => setTimeout(r, 30));
      gerarGuiaPreparoPDF({ favorites: favs });
      toast.success("PDF gerado — verifique seus downloads.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <section
      aria-labelledby="preparo-dicas-title"
      className="rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_2px_rgba(11,30,63,0.05)] sm:p-4"
    >
      {/* Cabeçalho compacto */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className={microLabel}>Guia de preparo</p>
          <h2
            id="preparo-dicas-title"
            className="mt-1.5 font-serif text-[18px] font-semibold leading-tight tracking-tight text-foreground sm:text-[20px]"
          >
            Qual corte usar em cada preparo
          </h2>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            Toque em um preparo para ver os cortes recomendados. Marque com ★ e baixe o PDF para
            consultar offline.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleBaixarPDF}
          disabled={baixando}
          className="h-8 shrink-0 gap-1.5 text-[12px] font-semibold"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {baixando ? "Gerando…" : "PDF"}
        </Button>
      </header>

      {/* Barra de filtros — recolhida por padrão */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltrosAbertos((v) => !v)}
          aria-expanded={filtrosAbertos}
          aria-controls="preparo-filtros"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <Filter className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
          Filtros
          {filtrosAtivos > 0 && (
            <span className="rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-brand-navy">
              {filtrosAtivos}
            </span>
          )}
        </button>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {dicasFiltradas.length} de {PREPARO_DICAS.length} preparos
        </span>
        {filtrosAtivos > 0 && (
          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <X className="h-3 w-3" aria-hidden /> Limpar
          </button>
        )}
        {favs.size > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--pc-gold-ink)]">
            <Star className="h-3 w-3 fill-current" aria-hidden />
            {favs.size} favorito{favs.size === 1 ? "" : "s"}
            <button
              type="button"
              onClick={clear}
              aria-label="Limpar cortes favoritos"
              className="ml-0.5 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
            </button>
          </span>
        )}
      </div>

      {filtrosAbertos && (
        <div
          id="preparo-filtros"
          className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-2.5"
        >
          {[
            {
              label: "Tipo de corte",
              Icon: Beef,
              items: PROTEINAS.map((p) => ({
                id: p.id as string,
                label: p.label,
                active: proteinasSel.has(p.id),
                disabled: !proteinasDisponiveis.has(p.id),
                onClick: () => toggleProteina(p.id),
              })),
            },
            {
              label: "Tempo estimado",
              Icon: Clock,
              items: TEMPO_FAIXAS.map((f) => ({
                id: f.id as string,
                label: f.label,
                active: temposSel.has(f.id),
                disabled: false,
                onClick: () => toggleTempo(f.id),
              })),
            },
            {
              label: "Modo de cozimento",
              Icon: Flame,
              items: MODOS.map((m) => ({
                id: m.id as string,
                label: m.label,
                active: modosSel.has(m.id),
                disabled: false,
                onClick: () => toggleModo(m.id),
              })),
            },
          ].map(({ label, Icon, items }) => (
            <div key={label} className="grid gap-1.5 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-3">
              <p className={`flex items-center gap-1.5 sm:h-7 ${microLabel}`}>
                <Icon className="h-3 w-3 shrink-0 text-brand-gold" aria-hidden /> {label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={it.disabled ? undefined : it.onClick}
                    aria-pressed={it.active}
                    disabled={it.disabled}
                    title={it.disabled ? `${it.label} — sem cortes cadastrados` : it.label}
                    className={chipCls(it.active, it.disabled)}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dicasFiltradas.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-background/40 p-5 text-center">
          <p className="text-[13px] font-semibold text-foreground">Nenhum preparo encontrado.</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Ajuste as faixas de tempo ou modos de cozimento selecionados.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={limparFiltros}
            className="mt-3 h-8 gap-1 text-[12px]"
          >
            <X className="h-3 w-3" aria-hidden /> Limpar filtros
          </Button>
        </div>
      ) : (
        <Accordion type="single" collapsible className="mt-3 w-full border-t border-border/70">
          {dicasFiltradas.map((d) => {
            const favCount = favoritosPorDica.get(d.key)?.length ?? 0;
            const variacoesRender = d.variacoesFiltradas;
            const totalVariacoesOriginais = d.variacoes?.length ?? 0;
            return (
              <AccordionItem key={d.key} value={d.key} className="border-border/70">
                <AccordionTrigger className="py-2.5 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-2 text-left">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted">
                      <img
                        src={FOTOS[d.key]}
                        alt={`Exemplo de ${d.titulo.toLowerCase()}`}
                        loading="lazy"
                        width={512}
                        height={512}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[13.5px] font-semibold leading-tight text-foreground">
                        {d.titulo}
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                        {d.cortes.length} cortes
                        {totalVariacoesOriginais > 0 &&
                          (filtrosAtivos > 0
                            ? ` · ${variacoesRender.length}/${totalVariacoesOriginais} variações`
                            : ` · ${totalVariacoesOriginais} variações`)}
                        {` · ${d.tempo}`}
                      </p>
                    </div>
                    {favCount > 0 && (
                      <span className="shrink-0 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-[var(--pc-gold-ink)]">
                        ★ {favCount}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="sm:pl-[50px]">
                    <p className="text-[12.5px] leading-snug text-muted-foreground">{d.descricao}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] leading-none text-foreground">
                        <Clock className="h-3 w-3 text-brand-gold" aria-hidden />
                        {d.tempo}
                      </span>
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] leading-none text-foreground">
                        <Flame className="h-3 w-3 text-brand-gold" aria-hidden />
                        {d.modo}
                      </span>
                      <button
                        type="button"
                        disabled={cardKey === d.key}
                        onClick={async () => {
                          try {
                            setCardKey(d.key);
                            const result = await shareOrDownloadPreparoCard(d);
                            toast.success(
                              result === "shared"
                                ? "Card pronto para compartilhar."
                                : "Card salvo em seus downloads.",
                            );
                          } catch (e) {
                            console.error(e);
                            toast.error("Não foi possível gerar o card.");
                          } finally {
                            setCardKey(null);
                          }
                        }}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-[11px] font-semibold leading-none text-foreground transition-colors hover:border-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:opacity-60"
                      >
                        <Share2 className="h-3 w-3 text-brand-gold" aria-hidden />
                        {cardKey === d.key ? "Gerando…" : "Compartilhar card"}
                      </button>
                    </div>

                    {filtrosAtivos > 0 && !d.matchesSelf && (
                      <p className="mt-2 text-[11px] italic text-muted-foreground">
                        O preparo principal não casa com os filtros — apenas as variações abaixo
                        correspondem.
                      </p>
                    )}

                    {(filtrosAtivos === 0 || d.matchesSelf) && (
                      <div className="mt-2.5">
                        <p className={microLabel}>Cortes recomendados</p>
                        <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                          {d.cortes.map((c) => {
                            const fkey = favoriteKey(d.key, c.nome);
                            const isFav = favs.has(fkey);
                            return (
                              <li
                                key={c.nome}
                                className={`flex items-start gap-1.5 rounded-md border px-2 py-1.5 ${
                                  isFav
                                    ? "border-brand-gold/50 bg-brand-gold/10"
                                    : "border-border/60 bg-background/60"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggle(fkey);
                                  }}
                                  aria-pressed={isFav}
                                  aria-label={
                                    isFav
                                      ? `Remover ${c.nome} dos favoritos`
                                      : `Salvar ${c.nome} como favorito`
                                  }
                                  className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-[var(--pc-gold-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                                >
                                  <Star
                                    className={`h-3.5 w-3.5 ${
                                      isFav ? "fill-current text-[var(--pc-gold-ink)]" : ""
                                    }`}
                                  />
                                </button>
                                <p className="min-w-0 text-[12px] leading-snug text-foreground">
                                  <span className="font-semibold">{c.nome}</span>
                                  {c.nota && (
                                    <span className="text-muted-foreground"> — {c.nota}</span>
                                  )}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {variacoesRender.length > 0 && (
                      <div className="mt-2.5">
                        <p className={microLabel}>Variações</p>
                        <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                          {variacoesRender.map((v) => {
                            const vProts =
                              v.proteinas && v.proteinas.length > 0
                                ? v.proteinas
                                : (["boi"] as ProteinaId[]);
                            return (
                              <li
                                key={v.nome}
                                className="rounded-md border border-border/60 bg-background/60 px-2 py-1.5"
                              >
                                <p className="text-[12px] font-semibold leading-snug text-foreground">
                                  {v.nome}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                                  {vProts.map((pid) => PROTEINA_LABEL[pid]).join(" · ")}
                                  {` · ${v.tempo} · ${v.modo}`}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Conteúdo cedido por <strong className="text-foreground">Recanto da Carne</strong>. Reprodução
        apenas com autorização.
      </p>
    </section>
  );
}

