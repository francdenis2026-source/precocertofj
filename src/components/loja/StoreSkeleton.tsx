/**
 * Skeleton de carregamento para /loja/$id.
 * Renderiza durante o Suspense do loader para evitar qualquer flash de conteúdo.
 */
export function StoreSkeleton() {
  return (
    <div className="min-h-[100svh] bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="mb-3 h-3 w-16 animate-pulse rounded-full bg-muted" />

        {/* Header card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="h-20 animate-pulse bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
          <div className="px-4 pb-4">
            <div className="-mt-8 flex items-end gap-3">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl border-2 border-background bg-muted" />
              <div className="flex-1 space-y-2 pb-1">
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl border border-border bg-muted/50" />
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 h-11 animate-pulse rounded-full bg-muted/60" />

        {/* Chips */}
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-muted/60" />
          ))}
        </div>

        {/* Product grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
