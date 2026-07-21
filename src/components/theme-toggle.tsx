import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
}

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
];

export function ThemeToggle({ className, size = "md", ...props }: ThemeToggleProps) {
  const { theme, setTheme, isDark, mounted } = useTheme();
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const ActiveIcon = !mounted
    ? Monitor
    : theme === "system"
      ? Monitor
      : isDark
        ? Sun
        : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Selecionar tema"
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
            dim,
            className,
          )}
          {...props}
        >
          <ActiveIcon className={icon} strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </span>
            {theme === value && (
              <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
