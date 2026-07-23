import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Clock, Download, Flame, Star, Trash2 } from "lucide-react";
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
import { PREPARO_DICAS, favoriteKey, type Dica } from "@/lib/preparo-dicas-data";
import { gerarGuiaPreparoPDF } from "@/lib/preparo-dicas-pdf";

const FOTOS: Record<string, string> = {
  cozidao: imgCozidao,
  assado: imgAssado,
  churrasco: imgChurrasco,
  strogonoff: imgStrogonoff,
  ensopado: imgEnsopado,
  grelhado: imgGrelhado,
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, ReactNode> = {
  cozidao: (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
      <path {...stroke} d="M9 20h30l-3 18a3 3 0 0 1-3 2.5H15a3 3 0 0 1-3-2.5L9 20Z" />
      <path {...stroke} d="M6 20h36" />
      <path {...stroke} d="M14 20V16a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4" />
      <path {...stroke} d="M20 9c1.5-1.5 1.5-3 0-4.5" />
      <path {...stroke} d="M28 9c1.5-1.5 1.5-3 0-4.5" />
    </svg>
  ),
  assado: (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
      <ellipse {...stroke} cx="24" cy="30" rx="18" ry="7" />
      <path {...stroke} d="M6 30v3a3 3 0 0 0 3 3h30a3 3 0 0 0 3-3v-3" />
      <path {...stroke} d="M14 27c2-4 6-6 10-6s8 2 10 6" />
      <path {...stroke} d="M18 24l2-2M24 22v-2M30 24l-2-2" />
    </svg>
  ),
  churrasco: (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
      <path {...stroke} d="M6 14h36" />
      <path {...stroke} d="M42 14l3-2M42 14l3 2" />
      <rect {...stroke} x="10" y="10" width="7" height="8" rx="1.5" />
      <rect {...stroke} x="20" y="10" width="7" height="8" rx="1.5" />
      <rect {...stroke} x="30" y="10" width="7" height="8" rx="1.5" />
      <path {...stroke} d="M12 40c-2-3 0-5 2-7-1 4 3 4 3 8" />
      <path {...stroke} d="M23 42c-2-3 0-6 2-8-1 4 3 5 3 9" />
      <path {...stroke} d="M34 40c-2-3 0-5 2-7-1 4 3 4 3 8" />
    </svg>
  ),
  strogonoff: (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
      <path {...stroke} d="M8 22h28a4 4 0 0 1 0 8H14a6 6 0 0 1-6-6v-2Z" />
      <path {...stroke} d="M36 26h6" />
      <path {...stroke} d="M14 20c2-2 5-2 7 0" />
      <path {...stroke} d="M22 18c2-2 5-2 7 0" />
      <path {...stroke} d="M18 15c2-2 5-2 7 0" />
    </svg>
  ),
  ensopado: (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
      <path {...stroke} d="M6 24h36a0 0 0 0 1 0 0 18 18 0 0 1-36 0Z" />
      <path {...stroke} d="M4 24h40" />
      <path {...stroke} d="M36 8l4 4-12 12-4-4Z" />
      <circle {...stroke} cx="16" cy="32" r="2" />
      <circle {...stroke} cx="24" cy="36" r="2" />
      <circle {...stroke} cx="32" cy="32" r="2" />
    </svg>
  ),
  grelhado: (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
      <rect {...stroke} x="6" y="14" width="36" height="20" rx="2" />
      <path {...stroke} d="M6 20h36M6 26h36M6 32h36" />
      <path {...stroke} d="M14 34v4M34 34v4" />
      <path {...stroke} d="M18 23c3-3 9-3 12 0s3 5 0 6H18c-3-1-3-3 0-6Z" />
    </svg>
  ),
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

export function PreparoDicas() {
  const { favs, toggle, clear } = useFavoritos();
  const [baixando, setBaixando] = useState(false);

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
      className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-7"
    >
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Na dúvida?
          </p>
          <h2
            id="preparo-dicas-title"
            className="mt-1 text-xl font-semibold sm:text-2xl"
          >
            Guia de preparo — qual corte usar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Toque em um preparo para ver os cortes recomendados. Marque suas
            estrelas ★ e baixe um PDF compacto para consultar offline.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleBaixarPDF}
            disabled={baixando}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            {baixando ? "Gerando…" : "Baixar PDF"}
          </Button>
        </div>
      </header>

      {favs.size > 0 && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Star className="h-4 w-4 fill-primary text-primary" />
                Meus cortes favoritos ({favs.size})
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Salvos neste dispositivo. Aparecem em destaque no PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" /> Limpar
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {[...favoritosPorDica.entries()].map(([dicaKey, nomes]) => {
              const dica = PREPARO_DICAS.find((d) => d.key === dicaKey);
              return (
                <li key={dicaKey} className="text-[12px]">
                  <span className="font-semibold text-foreground">
                    {dica?.titulo}:
                  </span>{" "}
                  <span className="text-muted-foreground">{nomes.join(", ")}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Accordion type="single" collapsible className="w-full">
        {PREPARO_DICAS.map((d: Dica) => {
          const favCount = favoritosPorDica.get(d.key)?.length ?? 0;
          return (
            <AccordionItem key={d.key} value={d.key} className="border-border/70">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center gap-3 pr-3 text-left">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted">
                    <img
                      src={FOTOS[d.key]}
                      alt={`Exemplo de ${d.titulo.toLowerCase()}`}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="h-full w-full object-cover"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
                    >
                      {ICONS[d.key]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-tight">
                      {d.titulo}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {d.cortes.length} cortes recomendados
                      {d.variacoes?.length ? ` · ${d.variacoes.length} variações` : ""}
                      {favCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                          ★ {favCount}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-[60px] pr-1">
                  <p className="text-sm text-muted-foreground">{d.descricao}</p>

                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                      Cortes recomendados
                    </p>
                    <ul className="space-y-1.5">
                      {d.cortes.map((c) => {
                        const fkey = favoriteKey(d.key, c.nome);
                        const isFav = favs.has(fkey);
                        return (
                          <li
                            key={c.nome}
                            className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 transition-colors ${
                              isFav
                                ? "border-primary/40 bg-primary/5"
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
                              className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  isFav ? "fill-primary text-primary" : ""
                                }`}
                              />
                            </button>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground">
                                {c.nome}
                              </span>
                              {c.nota && (
                                <span className="ml-1.5 text-[12px] text-muted-foreground">
                                  — {c.nota}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {d.variacoes && d.variacoes.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                        Variações e opções especiais
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.variacoes.map((v) => (
                          <span
                            key={v}
                            className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
        Conteúdo cedido por <strong className="text-foreground">Recanto da Carne</strong>.
        Todos os direitos sobre as sugestões de preparo, marca e identidade
        visual pertencem ao estabelecimento. Reprodução apenas com autorização.
      </p>
    </section>
  );
}
