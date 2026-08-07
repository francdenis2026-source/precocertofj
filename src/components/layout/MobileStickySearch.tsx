import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Barra de busca sticky (mobile). Fica no topo, abaixo do SiteHeader, e envia
 * para /buscar?q=... . Se esconde ao rolar para baixo e reaparece ao rolar
 * para cima. Oculta em rotas onde já existe um campo principal (ex.: /buscar).
 */
const HIDE_ON_PREFIXES = ["/buscar", "/mapa", "/login", "/cadastro", "/onboarding", "/admin", "/checkout", "/auth", "/planos"];

export function MobileStickySearch() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastY.current + 4;
      const goingUp = y < lastY.current - 4;
      if (y < 40) setVisible(true);
      else if (goingDown && y > 120) setVisible(false);
      else if (goingUp) setVisible(true);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (HIDE_ON_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    navigate({ to: "/buscar", search: { q } as never });
  };

  return (
    <div
      className={cn(
        "sticky top-[52px] z-30 md:hidden",
        "border-b border-border bg-background/90 backdrop-blur",
        "transition-transform duration-200 will-change-transform",
        visible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <form
        role="search"
        aria-label="Pesquisar loja ou produto"
        onSubmit={submit}
        className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2"
      >
        <label htmlFor="mobile-sticky-search" className="sr-only">
          Pesquisar loja ou produto
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2.2}
            aria-hidden
          />
          <input
            id="mobile-sticky-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            inputMode="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Pesquisar loja ou produto…"
            className={cn(
              "h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[15px] text-foreground",
              "placeholder:text-muted-foreground outline-none",
              "focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:border-brand/50",
            )}
          />
        </div>
        <button
          type="submit"
          aria-label="Pesquisar"
          className={cn(
            "inline-flex h-10 min-w-11 items-center justify-center rounded-lg px-3",
            "bg-brand text-brand-foreground text-[13px] font-bold uppercase tracking-[0.08em]",
            "active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          Ir
        </button>
      </form>
    </div>
  );
}
