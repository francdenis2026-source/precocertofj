import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { toast } from "sonner";
import {
  listMyAppNotifications,
  markAppNotificationRead,
  type AppNotification,
} from "@/lib/app-notifications.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NotificationsBell() {
  const { session } = useMyProfile();
  const userId = session?.user?.id ?? null;
  const list = useServerFn(listMyAppNotifications);
  const mark = useServerFn(markAppNotificationRead);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const toastedRef = useRef<Set<string>>(new Set());

  useNotificationsRealtime(userId);

  const { data } = useQuery({
    queryKey: ["my-app-notifications"],
    queryFn: () => list({ data: { onlyUnread: false, limit: 20 } }),
    enabled: !!userId,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const items: AppNotification[] = data ?? [];
  const unread = items.filter((n) => !n.read_at);

  // Toast new unread notifications on load
  useEffect(() => {
    for (const n of unread) {
      if (toastedRef.current.has(n.id)) continue;
      toastedRef.current.add(n.id);
      const tone = n.kind.includes("approved")
        ? "success"
        : n.kind.includes("rejected")
          ? "error"
          : "info";
      const opts = { description: n.body ?? undefined, duration: 8000 };
      if (tone === "success") toast.success(n.title, opts);
      else if (tone === "error") toast.error(n.title, opts);
      else toast(n.title, opts);
    }
  }, [unread]);

  const markMutation = useMutation({
    mutationFn: async (id?: string) => mark({ data: id ? { id, all: false } : { all: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-app-notifications"] }),
  });

  if (!userId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notificações${unread.length ? ` (${unread.length} não lidas)` : ""}`}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Bell className="h-4 w-4" strokeWidth={2.4} />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h3 className="text-sm font-bold text-foreground">Notificações</h3>
          {unread.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => markMutation.mutate(undefined)}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem notificações por enquanto.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`p-3 ${n.read_at ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <Circle
                        className="mt-1.5 h-2 w-2 flex-none fill-primary text-primary"
                        strokeWidth={0}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[13px] font-semibold text-foreground">{n.title}</p>
                        <span className="flex-none text-[11px] text-muted-foreground">
                          {fmtRelative(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-3">
                        {n.link && (
                          <a
                            href={n.link}
                            onClick={() => {
                              if (!n.read_at) markMutation.mutate(n.id);
                              setOpen(false);
                            }}
                            className="pc-nav-link pc-nav-link--row rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary outline-none"
                          >
                            Abrir
                          </a>
                        )}
                        {!n.read_at && (
                          <button
                            type="button"
                            onClick={() => markMutation.mutate(n.id)}
                            className="pc-nav-link pc-nav-link--row rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground outline-none"
                          >
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-2">
          <Link
            to="/notificacoes"
            onClick={() => setOpen(false)}
            className="block w-full rounded-md py-1.5 text-center text-xs font-semibold text-primary hover:bg-muted"
          >
            Ver todas as notificações
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
