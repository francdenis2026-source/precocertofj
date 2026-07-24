import { Sparkles } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-5 py-1.5 text-[11px] leading-tight text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <IconTile icon={Sparkles} size="xs" tone="accent" density="compact" label="PreçoCerto" />
          <Logo variant="dark" className="[&_img]:h-7 [&_img]:w-7 [&_span]:text-[16px]" />
          <span className="hidden sm:inline text-sidebar-foreground/80">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex items-center gap-3.5">
          <a className="transition-colors hover:text-accent" href="/comparador">Comparador</a>
          <a className="transition-colors hover:text-accent" href="/planos">Planos</a>
          <a className="transition-colors hover:text-accent" href="/colaborar">Colaborar</a>
        </nav>
        <p className="font-mono tracking-wide text-sidebar-foreground/80">
          &lt;FrancD&apos;nis&gt;
        </p>
      </div>
    </footer>
  );
}
