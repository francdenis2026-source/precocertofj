import { toast } from "sonner";

type NotifyOptions = {
  /** Texto de apoio (segunda linha). */
  description?: string;
  /** Identificador estável: evita toasts duplicados/flash ao repetir a ação. */
  id?: string;
  duration?: number;
};

type Variant = "success" | "error" | "warning" | "info" | "loading";

/* ------------------------------------------------------------------
   Fila de toasts
   - no máximo MAX_VISIBLE toasts simultâneos (os mais antigos saem);
   - intervalo mínimo entre entradas para a animação nunca "piscar";
   - deduplicação por conteúdo dentro de uma janela curta, o que evita
     toasts repetidos durante navegação rápida entre rotas.
------------------------------------------------------------------- */
const MAX_VISIBLE = 2;
const MIN_GAP_MS = 200;
const DEDUPE_MS = 1600;

type Job = { variant: Variant; title: string; opts: NotifyOptions; id: string | number };

const queue: Job[] = [];
const active: (string | number)[] = [];
const recent = new Map<string, number>();
let lastShownAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

const DURATIONS: Record<Variant, number> = {
  success: 3500,
  error: 6000,
  warning: 5000,
  info: 4000,
  loading: Infinity,
};

/**
 * Watchdog de fechamento.
 *
 * O sonner pausa o cronômetro do toast quando a aba perde foco ou quando a
 * árvore que disparou o toast desmonta no meio da navegação (é o caso do
 * logout: o painel some e a homepage entra). Nesses casos o toast ficava
 * preso na tela. Aqui garantimos o fechamento por tempo, sempre.
 */
const closers = new Map<string | number, ReturnType<typeof setTimeout>>();

function armCloser(id: string | number, duration: number) {
  const existing = closers.get(id);
  if (existing) clearTimeout(existing);
  if (!Number.isFinite(duration)) return;
  closers.set(
    id,
    setTimeout(() => {
      closers.delete(id);
      release(id);
      toast.dismiss(id);
    }, duration + 600),
  );
}

function present(job: Job) {
  const { variant, title, opts, id } = job;
  const duration = opts.duration ?? DURATIONS[variant];
  const payload = {
    ...opts,
    duration,
    id,
    onDismiss: () => release(id),
    onAutoClose: () => release(id),
  };

  if (!active.includes(id)) {
    active.push(id);
    while (active.length > MAX_VISIBLE) {
      const oldest = active.shift();
      if (oldest !== undefined && oldest !== id) toast.dismiss(oldest);
    }
  }

  lastShownAt = Date.now();
  armCloser(id, duration);
  return toast[variant](title, payload);
}

function release(id: string | number) {
  const i = active.indexOf(id);
  if (i >= 0) active.splice(i, 1);
  const t = closers.get(id);
  if (t) {
    clearTimeout(t);
    closers.delete(id);
  }
}


function drain() {
  timer = null;
  const job = queue.shift();
  if (!job) return;
  present(job);
  if (queue.length > 0) timer = setTimeout(drain, MIN_GAP_MS);
}

function enqueue(variant: Variant, title: string, opts: NotifyOptions) {
  const key = `${variant}|${title}|${opts.description ?? ""}`;
  const now = Date.now();

  // Deduplicação: mesma mensagem em sequência reaproveita o mesmo id, então o
  // sonner atualiza o toast existente em vez de empilhar outro.
  const seenAt = recent.get(key);
  const id = opts.id ?? (seenAt && now - seenAt < DEDUPE_MS ? key : `${key}#${now}`);
  recent.set(key, now);
  for (const [k, t] of recent) if (now - t > DEDUPE_MS * 4) recent.delete(k);

  // Já visível com esse id → atualiza na hora (sem enfileirar, sem flash).
  const isUpdate = active.includes(id) || queue.some((j) => j.id === id);
  if (isUpdate) {
    const pending = queue.find((j) => j.id === id);
    if (pending) {
      pending.variant = variant;
      pending.title = title;
      pending.opts = opts;
      return id;
    }
    present({ variant, title, opts, id });
    return id;
  }

  // Loading é imediato: ele acompanha uma ação em andamento.
  const elapsed = now - lastShownAt;
  if (variant === "loading" || (queue.length === 0 && elapsed >= MIN_GAP_MS)) {
    present({ variant, title, opts, id });
    return id;
  }

  queue.push({ variant, title, opts, id });
  if (!timer) timer = setTimeout(drain, Math.max(MIN_GAP_MS - elapsed, 0));
  return id;
}

/**
 * API única de notificações do app. Sempre use `notify.*` em vez de chamar o
 * sonner diretamente, para manter tamanhos, cores, ícones, durações e a fila
 * (limite simultâneo + deduplicação) iguais em todas as páginas.
 */
export const notify = {
  success: (title: string, opts: NotifyOptions = {}) => enqueue("success", title, opts),
  error: (title: string, opts: NotifyOptions = {}) => enqueue("error", title, opts),
  warning: (title: string, opts: NotifyOptions = {}) => enqueue("warning", title, opts),
  info: (title: string, opts: NotifyOptions = {}) => enqueue("info", title, opts),
  /** Estado de carregamento — feche com `notify.success/error` usando o mesmo id. */
  loading: (title: string, opts: NotifyOptions = {}) => enqueue("loading", title, opts),
  dismiss(id?: string | number) {
    if (id === undefined) {
      queue.length = 0;
      active.length = 0;
      for (const t of closers.values()) clearTimeout(t);
      closers.clear();
    } else {
      release(id);
      const i = queue.findIndex((j) => j.id === id);
      if (i >= 0) queue.splice(i, 1);
    }
    toast.dismiss(id);
  },
};

export type { NotifyOptions };
