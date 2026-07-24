import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-5 py-1.5 text-[11px] leading-tight text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Logo variant="dark" className="[&_img]:h-6 [&_img]:w-6 [&_span]:text-[15px]" />
          <span className="hidden sm:inline text-sidebar-foreground/70">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-3.5">
          <a className="transition-colors hover:text-accent" href="/comparador">Comparador</a>
          <a className="transition-colors hover:text-accent" href="/planos">Planos</a>
          <a className="transition-colors hover:text-accent" href="/colaborar">Colaborar</a>
        </nav>
        <p className="font-mono tracking-wide text-sidebar-foreground/70">
          &lt;FrancD&apos;nis&gt;
        </p>
      </div>
    </footer>
  );
}
