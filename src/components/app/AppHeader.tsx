import { Link } from "@tanstack/react-router";
import { MapPin, ShoppingBag, Globe, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthNavToggle } from "@/components/nav/AuthNavToggle";
import { useMyProfile } from "@/hooks/useMyProfile";

export function AppHeader() {
  const { firstName, fullName, initials, avatarUrl, session, loading } = useMyProfile();
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur-xl md:h-14 md:px-6">
      <SidebarTrigger className="text-foreground" />
      <div className="hidden h-5 w-px bg-border md:block" />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[10.5px] font-semibold text-foreground md:inline-flex"
          aria-label="Localização atual"
        >
          <MapPin className="h-3 w-3 text-primary" strokeWidth={2.2} />
          Feijó · AC
        </span>
        {session && (
          <Link
            to="/perfil"
            aria-label={fullName ? `Meu perfil — ${fullName}` : "Meu perfil"}
            title={fullName ?? "Meu perfil"}
            className="inline-flex h-8 min-w-0 max-w-[180px] items-center gap-1.5 rounded-full border border-border bg-card pl-1 pr-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:max-w-[220px]"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {initials ?? <User className="h-3 w-3" />}
              </span>
            )}
            <span className="truncate">
              {loading ? "..." : firstName ?? "Perfil"}
            </span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <Link
          to="/"
          aria-label="Ir para a homepage"
          title="Ir para a homepage"
          className="hidden h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
        >
          <Globe className="h-3.5 w-3.5" />
          Site
        </Link>
        <Link
          to="/cesta"
          aria-label="Cesta"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
        <ThemeToggle size="sm" />
        <AuthNavToggle size="sm" className="hidden sm:inline-flex" />
      </div>
    </header>
  );
}
