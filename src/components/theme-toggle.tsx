import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
  tone?: "light" | "dark";
}

const OPTIONS: { value: Theme; label: string; hint: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", hint: "Padrão", Icon: Sun },
  { value: "dark", label: "Escuro", hint: "Alto contraste noturno", Icon: Moon },
  { value: "system", label: "Seguir sistema", hint: "Acompanha o dispositivo", Icon: Monitor },
];

/**
 * Botão único de tema (Claro · Escuro · Seguir sistema).
 * - Clique curto: abre o menu e permite escolher.
 * - Padrão: modo claro.
 * - Preferência persiste em `localStorage` e sincroniza com o perfil do usuário.
 * - Uso restrito à homepage.
 */
export function ThemeToggle({
  className,
  size = "md",
  tone = "dark",
  ...props
}: ThemeToggleProps) {
  const { theme, setTheme, isDark, mounted } = useTheme();
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const ActiveIcon = !mounted
    ? Sun
    : theme === "system"
      ? Monitor
      : isDark
        ? Moon
        : Sun;

  const label = "Escolher tema (claro, escuro ou seguir sistema)";
  const toneClass =
    tone === "dark"
      ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
      : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "inline-flex items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            toneClass,
            dim,
            className,
          )}
          {...props}
        >
          <ActiveIcon className={icon} strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Aparência
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, label: itemLabel, hint, Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className="flex items-start justify-between gap-3 py-2 text-sm"
          >
            <span className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="flex flex-col leading-tight">
                <span className="font-medium">{itemLabel}</span>
                <span className="text-[11px] text-muted-foreground">{hint}</span>
              </span>
            </span>
            {theme === value && <Check className="mt-1 h-3.5 w-3.5 text-primary" strokeWidth={2} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
