import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Ícones discretos, desenhados em traço (currentColor) para herdar o
 *  contraste da variante em qualquer tema. */
const IconCheck = () => (
  <svg viewBox="0 0 20 20" className="pc-toast-svg" aria-hidden focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
    <path d="M6.4 10.3l2.3 2.3 4.9-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconDanger = () => (
  <svg viewBox="0 0 20 20" className="pc-toast-svg" aria-hidden focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
    <path d="M10 5.9v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="10" cy="13.8" r="1" fill="currentColor" />
  </svg>
);

const IconWarning = () => (
  <svg viewBox="0 0 20 20" className="pc-toast-svg" aria-hidden focusable="false">
    <path d="M10 3.2l7 12.2H3L10 3.2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
    <path d="M10 7.8v3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="10" cy="13.4" r="0.9" fill="currentColor" />
  </svg>
);

const IconInfo = () => (
  <svg viewBox="0 0 20 20" className="pc-toast-svg" aria-hidden focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
    <path d="M10 9.2v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="10" cy="6.3" r="1" fill="currentColor" />
  </svg>
);

const IconLoading = () => (
  <svg viewBox="0 0 20 20" className="pc-toast-svg pc-toast-svg-spin" aria-hidden focusable="false">
    <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.25" />
    <path d="M17.2 10a7.2 7.2 0 0 0-7.2-7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * Toaster padronizado do PreçoCerto.
 *
 * Posição: canto inferior direito — fora do cabeçalho fixo e das ações
 * primárias do topo. No mobile o CSS eleva os toasts acima da BottomTabBar.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group pc-toaster"
      position="bottom-right"
      offset={24}
      mobileOffset={{ bottom: 88, left: 12, right: 12 }}
      gap={10}
      duration={4000}
      visibleToasts={2}
      expand={false}
      icons={{
        success: <IconCheck />,
        error: <IconDanger />,
        warning: <IconWarning />,
        info: <IconInfo />,
        loading: <IconLoading />,
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
