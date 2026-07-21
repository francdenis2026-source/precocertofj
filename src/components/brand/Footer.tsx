import { Sparkles } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3 text-xs text-sidebar-foreground">
        <div className="flex items-center gap-2.5">
          <IconTile icon={Sparkles} size="xs" tone="accent" density="compact" label="PreçoCerto" />
          <Logo variant="dark" />
          <span className="hidden sm:inline text-sidebar-foreground/85">© {new Date().getFullYear()} PreçoCerto</span>
        </div>
        <nav className="flex items-center gap-4">
          <a className="transition-colors hover:text-accent" href="/comparador">Comparador</a>
          <a className="transition-colors hover:text-accent" href="/planos">Planos</a>
          <a className="transition-colors hover:text-accent" href="/colaborar">Colaborar</a>
        </nav>
        <p className="font-mono tracking-wide text-sidebar-foreground/85">
          &lt;FrancD&apos;nis&gt;
        </p>

      </div>
    </footer>
  );
}
