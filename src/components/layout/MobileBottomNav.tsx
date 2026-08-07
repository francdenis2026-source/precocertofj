import { Link } from "@tanstack/react-router";
import { Home, Search, ShoppingBasket, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/buscar", label: "Search", Icon: Search },
  { to: "/cesta", label: "Basket", Icon: ShoppingBasket },
  { to: "/estabelecimentos", label: "Stores", Icon: Store },
  { to: "/perfil", label: "Account", Icon: User },
] as const;

/**
 * Mobile-first bottom navigation. Hidden from large viewports, where the
 * primary navigation lives in the header instead.
 */
export function MobileBottomNav() {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "border-t border-[var(--border-subtle)]",
        "bg-[color-mix(in_oklab,var(--bg-base)_86%,transparent)] backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ "data-active": "true" } as any}
              className={cn(
                "group flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2",
                "text-[var(--text-tertiary)] transition-colors duration-200",
                "data-[active=true]:text-[var(--brand-primary)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary)]",
              )}
            >
              <Icon className="h-5 w-5 transition-transform duration-200 group-active:scale-90" aria-hidden="true" />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}