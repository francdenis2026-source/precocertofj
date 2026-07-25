import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search, MailCheck, MailX, ClipboardList, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  listCollaboratorSubmissions,
  reviewCollaboratorSubmission,
  collabSubmissionMetrics,
  type AdminSubmission,
} from "@/lib/collab-admin.functions";
import { signCollabAttachments } from "@/lib/collab-submit.functions";

const STATUS_LABELS: Record<string, string> = {
  received: "Recebido",
  review: "Em análise",
  approved: "Aprovado",
  rejected: "Não aceito",
  all: "Todos",
};

const STATUS_TONE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  received: "secondary",
  review: "outline",
  approved: "default",
  rejected: "destructive",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export function CollaboratorsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCollaboratorSubmissions);
  const metricsFn = useServerFn(collabSubmissionMetrics);
  const [status, setStatus] = useState<
    "all" | "received" | "review" | "approved" | "rejected"
  >("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<AdminSubmission | null>(null);
  const [reviewMode, setReviewMode] = useState<"approve" | "reject" | null>(null);

  const { data: metrics } = useQuery({
    queryKey: ["collab-metrics"],
    queryFn: () => metricsFn(),
    refetchInterval: 60_000,
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["collab-list", status, search],
    queryFn: () => listFn({ data: { status, search, limit: 300 } }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { key: "total", label: "Total", value: metrics?.total ?? 0 },
          { key: "received", label: "Recebidos", value: metrics?.received ?? 0 },
          { key: "review", label: "Em análise", value: metrics?.review ?? 0 },
          { key: "approved", label: "Aprovados", value: metrics?.approved ?? 0 },
          { key: "rejected", label: "Não aceitos", value: metrics?.rejected ?? 0 },
        ].map((m) => (
          <Card key={m.key} className="p-3">
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className="text-2xl font-bold">{m.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <div className="flex-1 min-w-[200px]">
            <Label>Buscar (e-mail, nome ou mercado)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="colaborador@..."
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["all", "received", "review", "approved", "rejected"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin inline" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2 px-2">Data</th>
                  <th className="py-2 px-2">Colaborador</th>
                  <th className="py-2 px-2">Mercado / Compra</th>
                  <th className="py-2 px-2">Origem</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/40 align-top">
                    <td className="py-2 px-2 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="py-2 px-2">
                      <div className="font-medium">{r.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground break-all">{r.email}</div>
                      {!r.user_id && (
                        <div className="mt-0.5 text-[10.5px] text-amber-700 dark:text-amber-300">
                          sem conta vinculada
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      <div>{r.market_name ?? "—"}</div>
                      <div className="text-muted-foreground">
                        {r.city ?? "—"} • {fmtDate(r.purchase_date)} • {r.receipts_count} nota(s)
                      </div>
                    </td>
                    <td className="py-2 px-2 text-xs uppercase tracking-wide">
                      {r.source === "email" ? "e-mail" : r.source}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant={STATUS_TONE[r.status] ?? "secondary"}>
                        {STATUS_LABELS[r.status]}
                      </Badge>
                      {r.reward_granted && (
                        <Badge variant="outline" className="ml-1 gap-1">
                          <Gift className="w-3 h-3" />
                          {r.reward_days ? `${r.reward_days}d` : "brinde"}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActive(r)}
                          className="h-7"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </Button>
                        {r.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-emerald-700 dark:text-emerald-300"
                            onClick={() => {
                              setActive(r);
                              setReviewMode("approve");
                            }}
                          >
                            <MailCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {r.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-rose-700 dark:text-rose-300"
                            onClick={() => {
                              setActive(r);
                              setReviewMode("reject");
                            }}
                          >
                            <MailX className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      Nenhum envio encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ReviewDialog
        submission={active}
        mode={reviewMode}
        onClose={() => {
          setActive(null);
          setReviewMode(null);
        }}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["collab-list"] });
          qc.invalidateQueries({ queryKey: ["collab-metrics"] });
        }}
      />
    </div>
  );
}

function ReviewDialog({
  submission,
  mode,
  onClose,
  onDone,
}: {
  submission: AdminSubmission | null;
  mode: "approve" | "reject" | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const reviewFn = useServerFn(reviewCollaboratorSubmission);
  const signFn = useServerFn(signCollabAttachments);
  const { confirm } = useConfirm();
  const [rewardDays, setRewardDays] = useState(7);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: attachments } = useQuery({
    queryKey: ["collab-attachments", submission?.id],
    queryFn: () => signFn({ data: { id: submission!.id } }),
    enabled: !!submission?.id && (submission?.attachment_paths?.length ?? 0) > 0,
    staleTime: 25 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (payload: {
      status: "review" | "approved" | "rejected";
      reward_days?: number;
      rejection_reason?: string;
      admin_notes?: string;
    }) =>
      reviewFn({
        data: {
          id: submission!.id,
          status: payload.status,
          reward_days: payload.reward_days,
          rejection_reason: payload.rejection_reason,
          admin_notes: payload.admin_notes,
        },
      }),
    onSuccess: (r) => {
      const emailMsg = r.emailSent ? " · e-mail enviado" : "";
      toast.success("Envio atualizado" + emailMsg);
      onDone();
      onClose();
      setReason("");
      setNotes("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const open = !!submission;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "approve"
              ? "Aprovar envio"
              : mode === "reject"
                ? "Recusar envio"
                : "Detalhes do envio"}
          </DialogTitle>
          <DialogDescription>
            {submission?.full_name ?? "Colaborador"} · {submission?.email}
          </DialogDescription>
        </DialogHeader>

        {submission && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-xs">
              <div>
                <div className="text-muted-foreground">Mercado</div>
                <div className="font-medium">{submission.market_name ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cidade</div>
                <div className="font-medium">{submission.city ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Data da compra</div>
                <div className="font-medium">{fmtDate(submission.purchase_date)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Recibos</div>
                <div className="font-medium">{submission.receipts_count}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">Origem</div>
                <div className="font-medium">
                  {submission.source} {submission.external_ref ? `· ${submission.external_ref}` : ""}
                </div>
              </div>
            </div>

            {(submission.attachment_paths?.length ?? 0) > 0 && (
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    Anexos ({submission.attachment_paths.length})
                  </div>
                  <span className="text-[10px] text-muted-foreground">links expiram em 30 min</span>
                </div>
                {!attachments ? (
                  <div className="text-xs text-muted-foreground">Carregando anexos...</div>
                ) : attachments.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Não foi possível carregar.</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {attachments.map((a) => {
                      const isImg = /\.(png|jpe?g|webp|gif|heic|heif|avif)$/i.test(a.path);
                      return (
                        <a
                          key={a.path}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block overflow-hidden rounded-md border bg-muted/40"
                          title={a.path.split("/").pop() ?? a.path}
                        >
                          {isImg ? (
                            <img
                              src={a.url}
                              alt="Anexo"
                              className="h-24 w-full object-cover transition group-hover:opacity-90"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-24 items-center justify-center px-1 text-center text-[10px] font-medium text-muted-foreground">
                              {a.path.split("/").pop()}
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {submission.admin_notes && (
              <div className="rounded-lg bg-muted/50 p-2 text-xs">
                <strong>Notas anteriores:</strong> {submission.admin_notes}
              </div>
            )}

            {mode === "approve" && (
              <>
                <div>
                  <Label>Dias de brinde por esta nota (padrão: 7)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={rewardDays}
                    onChange={(e) => setRewardDays(Number(e.target.value) || 0)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Teto de 30 dias/mês por colaborador. Se o teto já foi atingido,
                    o sistema credita apenas o restante possível.
                  </p>
                  {!submission.user_id && (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                      Este envio não está vinculado a uma conta — o brinde não poderá
                      ser aplicado automaticamente. Peça o token do colaborador ou
                      vincule uma conta primeiro.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Observações internas (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex.: 2 notas validadas do Wanderley Supermercado"
                    rows={2}
                  />
                </div>
              </>
            )}

            {mode === "reject" && (
              <>
                <div>
                  <Label>Motivo da recusa (será exibido ao colaborador)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex.: Imagem ilegível, preços não visíveis"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Notas internas (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {mode === null && submission?.status === "received" && (
            <Button
              variant="outline"
              onClick={() =>
                mutation.mutate({ status: "review", admin_notes: notes || undefined })
              }
              disabled={mutation.isPending}
            >
              Marcar em análise
            </Button>
          )}
          {mode === "approve" && (
            <Button
              disabled={mutation.isPending}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Aprovar e liberar brinde?",
                    description: rewardDays
                      ? `Adiciona ${rewardDays} dia(s) ao paid_until e notifica por e-mail.`
                      : "Aprova sem alterar o paid_until.",
                    tone: "info",
                  }))
                )
                  return;
                mutation.mutate({
                  status: "approved",
                  reward_days: rewardDays || 0,
                  admin_notes: notes || undefined,
                });
              }}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aprovar"}
            </Button>
          )}
          {mode === "reject" && (
            <Button
              variant="destructive"
              disabled={mutation.isPending || !reason.trim()}
              onClick={() =>
                mutation.mutate({
                  status: "rejected",
                  rejection_reason: reason.trim(),
                  admin_notes: notes || undefined,
                })
              }
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recusar envio"}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
