import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Global professional confirm / prompt dialog system.
 *
 * Replaces native `window.confirm` / `window.alert` / `window.prompt`
 * with an accessible, branded dialog rendered with SVG icons.
 *
 * Usage:
 *   const { confirm, prompt, alert } = useConfirm();
 *   if (await confirm({ title: "Excluir?", description: "..." })) { ... }
 *   const value = await prompt({ title: "...", placeholder: "..." });
 *   await alert({ title: "Pronto!", description: "..." });
 */

type Tone = "default" | "danger" | "warning" | "info" | "success";

interface BaseOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

interface ConfirmOptions extends BaseOptions {
  destructive?: boolean;
}

interface PromptOptions extends BaseOptions {
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "number" | "url" | "email";
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
  validate?: (value: string) => string | null;
}

interface AlertOptions extends Omit<BaseOptions, "cancelLabel"> {}

interface DialogState {
  kind: "confirm" | "prompt" | "alert";
  options: ConfirmOptions & PromptOptions & AlertOptions;
  resolve: (v: unknown) => void;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const toneClasses: Record<Tone, { ring: string; icon: string; iconBg: string; button: string }> = {
  default: {
    ring: "ring-primary/25",
    icon: "text-primary",
    iconBg: "bg-primary/10",
    button:
      "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50",
  },
  danger: {
    ring: "ring-destructive/25",
    icon: "text-destructive",
    iconBg: "bg-destructive/10",
    button:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/50",
  },
  warning: {
    ring: "ring-amber-400/25",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
    button:
      "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500/50",
  },
  info: {
    ring: "ring-sky-400/25",
    icon: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-500/10",
    button:
      "bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-500/50",
  },
  success: {
    ring: "ring-emerald-400/25",
    icon: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
    button:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/50",
  },
};

function ToneIcon({ tone }: { tone: Tone }) {
  // Distinct SVG per tone. Kept inline for zero-dependency, crisp scaling.
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (tone) {
    case "danger":
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1.2 13.1A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.9L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01" />
          <path d="M11 12h1v5h1" />
        </svg>
      );
    case "success":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 5-5.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M9 12h6" />
        </svg>
      );
  }
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback((value: unknown) => {
    setState((prev) => {
      prev?.resolve(value);
      return null;
    });
    setInputValue("");
    setInputError(null);
    // Restore focus to the element that opened the dialog.
    const el = previouslyFocused.current;
    previouslyFocused.current = null;
    if (el && typeof el.focus === "function") {
      requestAnimationFrame(() => el.focus());
    }
  }, []);

  const open = useCallback(
    <T,>(
      kind: DialogState["kind"],
      options: DialogState["options"],
    ): Promise<T> => {
      if (typeof document !== "undefined") {
        previouslyFocused.current = document.activeElement as HTMLElement | null;
      }
      setInputValue(options.defaultValue ?? "");
      setInputError(null);
      return new Promise<T>((resolve) => {
        setState({ kind, options, resolve: resolve as (v: unknown) => void });
      });
    },
    [],
  );

  const api = useMemo<ConfirmContextValue>(
    () => ({
      confirm: (opts) =>
        open<boolean>("confirm", {
          ...opts,
          tone: opts.tone ?? (opts.destructive ? "danger" : "default"),
        }),
      prompt: (opts) => open<string | null>("prompt", opts),
      alert: (opts) => open<void>("alert", opts),
    }),
    [open],
  );

  function handleConfirm() {
    if (!state) return;
    if (state.kind === "prompt") {
      const value = inputValue.trim();
      const opts = state.options;
      if (opts.minLength != null && value.length < opts.minLength) {
        setInputError(`Mínimo ${opts.minLength} caracteres.`);
        return;
      }
      if (opts.maxLength != null && value.length > opts.maxLength) {
        setInputError(`Máximo ${opts.maxLength} caracteres.`);
        return;
      }
      if (opts.validate) {
        const err = opts.validate(value);
        if (err) {
          setInputError(err);
          return;
        }
      }
      close(value);
      return;
    }
    close(state.kind === "confirm" ? true : undefined);
  }

  function handleCancel() {
    if (!state) return;
    close(state.kind === "confirm" ? false : state.kind === "prompt" ? null : undefined);
  }

  const tone: Tone = state?.options.tone ?? "default";
  const tc = toneClasses[tone];

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleCancel();
            }}
            role="presentation"
          >
            <motion.div
              key="confirm-panel"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              role={state.kind === "alert" ? "alertdialog" : "dialog"}
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby={state.options.description ? "confirm-desc" : undefined}
              className={`relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 ${tc.ring}`}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancel();
                } else if (
                  e.key === "Enter" &&
                  state.kind !== "prompt" &&
                  !(e.target instanceof HTMLTextAreaElement)
                ) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${tc.iconBg}`}
                aria-hidden
              />
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tc.iconBg} ${tc.icon}`}
                >
                  <ToneIcon tone={tone} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2
                    id="confirm-title"
                    className="text-[16px] font-semibold leading-snug tracking-[-0.005em] text-foreground"
                  >
                    {state.options.title}
                  </h2>
                  {state.options.description && (
                    <div
                      id="confirm-desc"
                      className="mt-2 text-[13.5px] leading-relaxed text-foreground/85"
                    >
                      {state.options.description}
                    </div>
                  )}

                  {state.kind === "prompt" && (
                    <div className="mt-4">
                      {state.options.multiline ? (
                        <textarea
                          autoFocus
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            if (inputError) setInputError(null);
                          }}
                          placeholder={state.options.placeholder}
                          className="w-full min-h-24 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      ) : (
                        <input
                          autoFocus
                          type={state.options.inputType ?? "text"}
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            if (inputError) setInputError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleConfirm();
                            }
                          }}
                          placeholder={state.options.placeholder}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      )}
                      {inputError && (
                        <p className="mt-1.5 text-xs font-medium text-destructive">
                          {inputError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-border bg-background/50 px-4 py-2.5 sm:flex-row sm:justify-end sm:px-5">
                {state.kind !== "alert" && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {state.options.cancelLabel ?? "Cancelar"}
                  </button>
                )}
                <button
                  type="button"
                  autoFocus={state.kind !== "prompt"}
                  onClick={handleConfirm}
                  className={`inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 ${tc.button}`}
                >
                  {state.options.confirmLabel ??
                    (state.kind === "alert" ? "OK" : "Confirmar")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider />");
  }
  return ctx;
}
