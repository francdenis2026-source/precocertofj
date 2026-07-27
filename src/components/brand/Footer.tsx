import { useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";

const items: Array<{ to: string; label: string }> = [
  { to: "/comparador", label: "Comparador" },
  { to: "/planos", label: "Planos" },
  { to: "/colaborar", label: "Colaborar" },
];

export function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-border/60 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-5 py-1.5 text-[11px] leading-tight text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Logo variant="dark" className="[&_img]:h-6 [&_img]:w-6 [&_span]:text-[15px]" />
          <span className="hidden sm:inline text-sidebar-foreground/70">© {new Date().getFullYear()}</span>
        </div>
        <nav aria-label="Institucional" className="flex items-center gap-3.5">
          {items.map((i) => (
            <button
              key={i.to}
              type="button"
              onClick={() => navigate({ to: i.to })}
              className="rounded-sm transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {i.label}
            </button>
          ))}
        </nav>
        <p className="font-mono tracking-wide text-sidebar-foreground/70">
          &lt;FrancD&apos;nis&gt;
        </p>
      </div>
    </footer>
  );
}
