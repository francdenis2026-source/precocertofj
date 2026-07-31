import { toast } from "sonner";

type NotifyOptions = {
  /** Texto de apoio (segunda linha). */
  description?: string;
  /** Identificador estável: evita toasts duplicados/flash ao repetir a ação. */
  id?: string;
  duration?: number;
};

/**
 * API única de notificações do app. Sempre use `notify.*` em vez de chamar o
 * sonner diretamente, para manter tamanhos, cores, ícones e durações iguais
 * em todas as páginas.
 */
export const notify = {
  success(title: string, opts: NotifyOptions = {}) {
    return toast.success(title, { duration: 3500, ...opts });
  },
  error(title: string, opts: NotifyOptions = {}) {
    return toast.error(title, { duration: 6000, ...opts });
  },
  warning(title: string, opts: NotifyOptions = {}) {
    return toast.warning(title, { duration: 5000, ...opts });
  },
  info(title: string, opts: NotifyOptions = {}) {
    return toast.info(title, { duration: 4000, ...opts });
  },
  /** Estado de carregamento — feche com `notify.success/error` usando o mesmo id. */
  loading(title: string, opts: NotifyOptions = {}) {
    return toast.loading(title, { duration: Infinity, ...opts });
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};

export type { NotifyOptions };
