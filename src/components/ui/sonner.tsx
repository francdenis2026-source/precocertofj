import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster padronizado do PreçoCerto.
 *
 * Sem ícones (nenhum SVG): a variante é comunicada pela faixa lateral de cor,
 * pelo título e pela descrição. Estilos em `styles.css` (bloco "Toasts
 * padronizados"), com contraste AA em tema claro e escuro.
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
        success: null,
        error: null,
        warning: null,
        info: null,
        loading: null,
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
