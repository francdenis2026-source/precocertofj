import { forwardRef, useState, type ComponentPropsWithoutRef, type FormEvent, type ReactNode } from "react";
import { Search, Sparkles, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SearchHeroProps extends Omit<ComponentPropsWithoutRef<"section">, "onSubmit" | "title"> {
  /** Título principal em destaque. */
  title?: ReactNode;
  /** Subtítulo de apoio abaixo do título. */
  subtitle?: ReactNode;
  /** Placeholder do input de busca. */
  placeholder?: string;
  /** Valor controlado (opcional). */
  value?: string;
  /** Callback de mudança do input. */
  onQueryChange?: (value: string) => void;
  /** Callback ao submeter (Enter ou clique no botão). */
  onSearch?: (value: string) => void;
  /** Sugestões rápidas exibidas como chips abaixo do input. */
  suggestions?: string[];
  /** Handler de clique em sugestão. */
  onSuggestion?: (value: string) => void;
  /** Slot opcional acima do input (badges, filtros). */
  slotAbove?: ReactNode;
  /** Slot opcional abaixo dos chips (stats, CTAs). */
  slotBelow?: ReactNode;
  /** Se fornecido, substitui o input interno (útil para combobox/live search customizados). */
  customInput?: ReactNode;
}

/**
 * SearchHero — hero de busca full-width, foco absoluto no input.
 * Fundo off-white com mesh gradients sutis (azul + verde).
 */
export const SearchHero = forwardRef<HTMLElement, SearchHeroProps>(function SearchHero(
  {
    className,
    title = (
      <>
        Encontre o <span className="text-signal-gradient">menor preço</span> perto de você
      </>
    ),
    subtitle = "Compare mercados, monte listas e economize de verdade.",
    placeholder = "Buscar produto, marca ou mercado…",
    value,
    onQueryChange,
    onSearch,
    suggestions = [],
    onSuggestion,
    slotAbove,
    slotBelow,
    customInput,
    ...rest
  },
  ref,
) {
  const [internal, setInternal] = useState("");
  const controlled = value !== undefined;
  const query = controlled ? (value ?? "") : internal;

  function handleChange(next: string) {
    if (!controlled) setInternal(next);
    onQueryChange?.(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch?.(query.trim());
  }

  return (
    <section
      ref={ref}
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)]/60 bg-[var(--bg-surface)] px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-7",
        className,
      )}
      {...rest}
    >
      {/* Mesh backgrounds */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 55% at 15% 10%, oklch(0.92 0.08 250 / 0.55), transparent 60%), radial-gradient(50% 50% at 90% 90%, oklch(0.92 0.10 160 / 0.45), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {slotAbove ? <div className="mb-1.5">{slotAbove}</div> : null}

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {title}
        </motion.h1>

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 }}
            className="mt-1 max-w-xl text-xs text-muted-foreground"
          >
            {subtitle}
          </motion.p>
        ) : null}

        {customInput ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-2 w-full"
          >
            {customInput}
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-border bg-background/80 p-1 shadow-elev-1 backdrop-blur focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15"
            role="search"
          >
            <div className="flex flex-1 items-center gap-1.5 pl-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                aria-label="Buscar"
                className="w-full bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-elev-1 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </motion.form>
        )}

        {suggestions.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5" aria-hidden />
              Populares:
            </span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  handleChange(s);
                  onSuggestion?.(s);
                }}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {slotBelow ? <div className="mt-2 w-full">{slotBelow}</div> : null}
      </div>
    </section>
  );
});
