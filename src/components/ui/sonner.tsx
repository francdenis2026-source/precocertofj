import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster padronizado do PreçoCerto.
 *
 * - Cores/ícones/animações consistentes entre temas (claro/escuro).
 * - Não usa `richColors` do sonner: as variantes são estilizadas no
 *   `styles.css` (bloco "Toasts padronizados") com tokens semânticos,
 *   garantindo contraste AA e nunca deixando texto invisível.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group pc-toaster"
      position="top-right"
      offset={76}
      gap={10}
      duration={4000}
      visibleToasts={3}
      icons={{
        success: <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden />,
        error: <XCircle className="h-[18px] w-[18px]" aria-hidden />,
        warning: <AlertTriangle className="h-[18px] w-[18px]" aria-hidden />,
        info: <Info className="h-[18px] w-[18px]" aria-hidden />,
        loading: <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: "pc-toast",
          title: "pc-toast-title",
          description: "pc-toast-description",
          icon: "pc-toast-icon",
          actionButton: "pc-toast-action",
          cancelButton: "pc-toast-cancel",
          closeButton: "pc-toast-close",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
