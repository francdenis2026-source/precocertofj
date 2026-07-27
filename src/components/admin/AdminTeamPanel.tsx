import { useState } from "react";
import { formatShortDate } from "@/components/product/TrustIndicator";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import {
  listAdminMembers,
  inviteAdminMember,
  removeAdminMember,
  setMemberRole,
  type AdminMember,
} from "@/lib/admin-team.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

const ROLE_PERMS: Record<"admin" | "moderator", string[]> = {
  admin: [
    "Acesso total ao console (/admin)",
    "Gerencia planos, integrações, preços e catálogo",
    "Convida e remove usuários do painel",
  ],
  moderator: [
    "Revisa preços e envios de colaboradores",
    "Sem acesso a integrações, cobrança ou gestão de usuários",
  ],
};

export function AdminTeamPanel() {
  const qc = useQueryClient();
  const fetchMembers = useServerFn(listAdminMembers);
  const invite = useServerFn(inviteAdminMember);
  const remove = useServerFn(removeAdminMember);
  const setRole = useServerFn(setMemberRole);

  const [email, setEmail] = useState("");
  const [role, setRole0] = useState<"admin" | "moderator">("moderator");
  const [inviting, setInviting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<AdminMember | null>(null);
  const [deleteAccount, setDeleteAccount] = useState(false);

  const membersQuery = useQuery<AdminMember[]>({
    queryKey: ["admin", "team"],
    queryFn: () => fetchMembers(),
  });
  const members = membersQuery.data ?? [];

  const reload = () => qc.invalidateQueries({ queryKey: ["admin", "team"] });

  const handleInvite = async () => {
    setInviting(true);
    try {
      const res = await invite({ data: { email: email.trim(), role } });
      toast.success(res.invited ? `Convite enviado para ${email}` : `Função atribuída a ${email}`);
      setEmail("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao convidar");
    } finally {
      setInviting(false);
    }
  };

  const handleToggle = async (m: AdminMember, r: "admin" | "moderator", enabled: boolean) => {
    setBusy(`${m.id}:${r}`);
    try {
      await setRole({ data: { userId: m.id, role: r, enabled } });
      toast.success(`${enabled ? "Concedido" : "Removido"} ${r} — ${m.email}`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar função");
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    setBusy(toRemove.id);
    try {
      await remove({ data: { userId: toRemove.id, deleteAccount } });
      toast.success(deleteAccount ? "Conta excluída" : "Acesso revogado");
      setToRemove(null);
      setDeleteAccount(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Equipe do painel
              </CardTitle>
              <CardDescription className={tc.meta}>
                Convide administradores e moderadores, ajuste funções e revogue acessos.
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => membersQuery.refetch()} aria-label="Atualizar equipe">
              <RefreshCw className={cn("h-3.5 w-3.5", membersQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Convite */}
          <div className="grid gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5 sm:grid-cols-[1fr_170px_auto] sm:items-end">
            <div>
              <Label htmlFor="invite-email" className={cn(tc.tag, "mb-1 block text-muted-foreground")}>
                E-mail do convidado
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pessoa@exemplo.com"
                className="h-9"
              />
            </div>
            <div>
              <Label className={cn(tc.tag, "mb-1 block text-muted-foreground")}>Função</Label>
              <Select value={role} onValueChange={(v) => setRole0(v as "admin" | "moderator")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={inviting || !email.trim()} className={cn(tc.control, "h-9")}>
              {inviting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
              Convidar
            </Button>
            <ul className={cn(tc.meta, "sm:col-span-3 flex flex-wrap gap-x-3 gap-y-0.5")}>
              {ROLE_PERMS[role].map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>

          {/* Membros */}
          {membersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando equipe…
            </div>
          ) : members.length === 0 ? (
            <p className={cn(tc.meta, "py-6 text-center")}>Nenhum membro com acesso ao painel.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tc.tableHead}>Membro</TableHead>
                  <TableHead className={tc.tableHead}>Situação</TableHead>
                  <TableHead className={cn(tc.tableHead, "text-center")}>Admin</TableHead>
                  <TableHead className={cn(tc.tableHead, "text-center")}>Moderador</TableHead>
                  <TableHead className={cn(tc.tableHead, "text-right")}>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className={cn(tc.cell, "font-medium text-foreground")}>
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {m.email ?? "—"}
                        {m.isOwner && (
                          <Badge variant="secondary" className={tc.tag}>
                            <ShieldCheck className="mr-1 h-3 w-3" /> Dono
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className={tc.meta}>
                      {m.invited ? "Convite pendente" : m.lastSignInAt
                        ? `Último acesso ${formatShortDate(m.lastSignInAt)}`
                        : "Nunca acessou"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={m.roles.includes("admin")}
                        disabled={m.isOwner || busy === `${m.id}:admin`}
                        onCheckedChange={(v) => handleToggle(m, "admin", v)}
                        aria-label={`Função admin de ${m.email}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={m.roles.includes("moderator")}
                        disabled={busy === `${m.id}:moderator`}
                        onCheckedChange={(v) => handleToggle(m, "moderator", v)}
                        aria-label={`Função moderador de ${m.email}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        disabled={m.isOwner || busy === m.id}
                        onClick={() => setToRemove(m)}
                        aria-label={`Remover ${m.email}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(toRemove)} onOpenChange={(o) => { if (!o) { setToRemove(null); setDeleteAccount(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover acesso</DialogTitle>
            <DialogDescription>
              {toRemove?.email} perderá todas as funções do painel. Esta ação fica registrada na auditoria.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5">
            <Switch checked={deleteAccount} onCheckedChange={setDeleteAccount} />
            <span className={tc.meta}>Excluir também a conta de usuário (irreversível)</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRemove(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={busy === toRemove?.id}>
              {busy === toRemove?.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
