import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AddToListButtonProps {
  catalogId: string;
  lists: Array<{ id: string; name: string }>;
  onAdd: (listId: string) => void;
}

/**
 * Botão-menu que adiciona um item do catálogo a uma das listas do usuário.
 *
 * Acessibilidade: menu ARIA completo por teclado — Enter/Espaço abre e foca
 * o primeiro item, setas navegam, Home/End vão às pontas, Esc fecha e devolve
 * o foco ao gatilho. Oculto quando o usuário ainda não tem listas.
 */
export function AddToListButton({ catalogId, lists, onAdd }: AddToListButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  if (lists.length === 0) return null;

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const focusItem = (i: number) => {
    const n = lists.length;
    itemRefs.current[(i + n) % n]?.focus();
  };

  const onItemKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(i - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(lists.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Adicionar a uma lista"
        title="Adicionar a uma lista"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => close(false)}
          />
          <div
            role="menu"
            aria-label="Adicionar em"
            className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-1 shadow-lg"
          >
            <p className="px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              Adicionar em
            </p>
            {lists.map((l, i) => (
              <button
                key={l.id}
                type="button"
                role="menuitem"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onKeyDown={(e) => onItemKeyDown(e, i)}
                onClick={() => {
                  onAdd(l.id);
                  close();
                  void catalogId;
                }}
                className="block w-full rounded px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted"
              >
                {l.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
