import { Plus } from "lucide-react";
import { useState } from "react";

interface AddToListButtonProps {
  catalogId: string;
  lists: Array<{ id: string; name: string }>;
  onAdd: (listId: string) => void;
}

/**
 * Small popover button that lets the user add a catalog item to one of
 * their shopping lists. Hidden when the user has no lists yet.
 */
export function AddToListButton({ catalogId, lists, onAdd }: AddToListButtonProps) {
  const [open, setOpen] = useState(false);
  if (lists.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Adicionar a uma lista"
        title="Adicionar a uma lista"
      >
        <Plus className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-card p-1 shadow-lg">
            <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              Adicionar em
            </p>
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  onAdd(l.id);
                  setOpen(false);
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
