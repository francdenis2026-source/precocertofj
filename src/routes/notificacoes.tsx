import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Bell, CheckCheck, Circle, Inbox } from "lucide-react";
import {
  listMyAppNotifications,
  markAppNotificationRead,
  type AppNotification,
} from "@/lib/app-notifications.functions";
import { Button } from "@/components/ui/button";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Minhas notificações — PreçoCerto" },
      {
        name: "description",
        content: "Acompanhe o status dos seus comprovantes e alertas do app.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificacoesPage,
});

type FilterKey = "all" | "approved" | "rejected" | "review" | "other";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "review", label: "Em análise" },
  { key: "approved", label: "Aprovadas" },
  { key: "rejected", label: "Recusadas" },
  { key: "other", label: "Outras" },
];

function classifyKind(kind: string): Exclude<FilterKey, "all"> {
  const k = kind.toLowerCase();
  if (k.includes("approved") || k.includes("aprov")) return "approved";
  if (k.includes("rejected") || k.includes("recus") || k.includes("reject"))
    return "rejected";
  if (k.includes("review") || k.includes("received") || k.includes("analise"))
    return "review";
  return "other";
}

function toneStyles(cat: Exclude<FilterKey, "all">) {
  switch (cat) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "rejected":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "review":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function toneLabel(cat: Exclude<FilterKey, "all">) {
  return cat === "approved"
    ? "Aprovada"
    : cat === "rejected"
      ? "Recusada"
      : cat === "review"
        ? "Em análise"
        : "Info";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificacoesPage() {
  const { session, loading: authLoading } = useMyProfile();
  const list = useServerFn(listMyAppNotifications);
  const mark = useServerFn(markAppNotificationRead);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");

  useNotificationsRealtime(session?.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ["my-app-notifications", "page"],
    queryFn: () => list({ data: { onlyUnread: false, limit: 100 } }),
    enabled: !!session?.user?.id,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const items: AppNotification[] = data ?? [];

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: items.length,
      approved: 0,
      rejected: 0,
      review: 0,
      other: 0,
    };
    for (const n of items) c[classifyKind(n.kind)] += 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((n) => classifyKind(n.kind) === filter);
  }, [items, filter]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markMutation = useMutation({
    mutationFn: async (id?: string) =>
      mark({ data: id ? { id, all: false } : { all: true } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-app-notifications"] });
    },
  });

  if (!authLoading && !session?.user?.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-bold text-foreground">Entre para ver suas notificações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você precisa estar autenticado para acompanhar seus alertas.
        </p>
        <Button asChild className="mt-4">
          <Link to="/login">Fazer login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 md:px-6 md:py-8">
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/perfil">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`
              : "Tudo em dia"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => markMutation.mutate(undefined)}
            disabled={markMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Filtrar notificações"
        className="mb-4 flex flex-wrap gap-1.5"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {f.label}
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold text-foreground">
            Nenhuma notificação {filter !== "all" ? "neste filtro" : "por enquanto"}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Você verá aqui atualizações sobre seus comprovantes e alertas.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => {
            const cat = classifyKind(n.kind);
            const unread = !n.read_at;
            return (
              <li
                key={n.id}
                className={`rounded-2xl border bg-card p-4 shadow-sm transition-colors ${
                  unread ? "border-primary/30" : "border-border opacity-80"
                }`}
              >
                <div className="flex items-start gap-3">
                  {unread ? (
                    <Circle
                      className="mt-1.5 h-2.5 w-2.5 flex-none fill-primary text-primary"
                      strokeWidth={0}
                      aria-label="Não lida"
                    />
                  ) : (
                    <span className="mt-1.5 h-2.5 w-2.5 flex-none" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneStyles(cat)}`}
                      >
                        {toneLabel(cat)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDate(n.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-sm font-bold text-foreground">{n.title}</h2>
                    {n.body && (
                      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {n.link && (
                        <a
                          href={n.link}
                          onClick={() => {
                            if (unread) markMutation.mutate(n.id);
                          }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Abrir detalhes →
                        </a>
                      )}
                      {unread && (
                        <button
                          type="button"
                          onClick={() => markMutation.mutate(n.id)}
                          disabled={markMutation.isPending}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
