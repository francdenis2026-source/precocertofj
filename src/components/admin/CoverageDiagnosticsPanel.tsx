import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import { grantSelfAdmin } from "@/lib/admin-maintenance.functions";
import {
  getCoverageDiagnostics,
  parseCoverageError,
  type CoverageError,
  type CoverageErrorKind,
} from "@/lib/coverage.functions";

const KIND_LABEL: Record<CoverageErrorKind, string> = {
  forbidden: "Permissão negada",
  no_auth: "Sem autenticação",
  rpc_missing: "RPC indisponível",
  rpc_error: "Erro da RPC",
  unknown: "Erro desconhecido",
};

const KIND_HINT: Record<CoverageErrorKind, string> = {
  forbidden: "A RPC verificou o papel do usuário e recusou. Confirme se este usuário tem o papel 'admin' em user_roles.",
  no_auth: "O request chegou sem sessão válida. Refaça login e verifique se o bearer está sendo enviado.",
  rpc_missing: "A função Postgres não existe ou não está no schema esperado. Aplique a migration correspondente.",
  rpc_error: "A RPC executou e retornou erro do Postgres. Veja code/details/hint abaixo.",
  unknown: "Erro sem classificação. Envie o payload abaixo para o suporte.",
};

export function CoverageErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const parsed = parseCoverageError(error);
  if (!parsed) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden />
          <div>
            <p className="font-semibold text-destructive">
              {KIND_LABEL[parsed.kind]} <span className="ml-2 text-xs font-normal text-muted-foreground">({parsed.rpc})</span>
            </p>
            <p className="mt-1 text-muted-foreground">{KIND_HINT[parsed.kind]}</p>
          </div>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente
          </Button>
        )}
      </div>
      <dl className="mt-3 grid gap-1 rounded border bg-background/60 p-3 text-xs font-mono">
        <Row k="message" v={parsed.message} />
        {parsed.code && <Row k="code" v={parsed.code} />}
        {parsed.details && <Row k="details" v={parsed.details} />}
        {parsed.hint && <Row k="hint" v={parsed.hint} />}
      </dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-[60px] text-muted-foreground">{k}</dt>
      <dd className="break-all">{v}</dd>
    </div>
  );
}

export function CoverageDiagnosticsPanel() {
  const fn = useServerFn(getCoverageDiagnostics);
  const q = useQuery({
    queryKey: ["coverage-diagnostics"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Wrench className="h-4 w-4" aria-hidden /> Diagnóstico de cobertura
            </CardTitle>
            <CardDescription>
              Status das RPCs, permissões detectadas e últimos erros. Use para identificar por que os dados não aparecem.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            {q.isFetching ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Reexecutar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Executando diagnóstico…
          </div>
        ) : q.error ? (
          <CoverageErrorBanner error={q.error} onRetry={() => q.refetch()} />
        ) : q.data ? (
          <>
            <PermissionsBlock d={q.data} />
            {q.data.isAdmin === false && (
              <SelfHealAdminBlock
                userId={q.data.authUid}
                email={q.data.claimsSummary?.email ?? null}
                onGranted={() => q.refetch()}
              />
            )}
            <RpcBlock rpcs={q.data.rpcs} />
            <p className="text-[11px] text-muted-foreground">
              Última verificação: {new Date(q.data.checkedAt).toLocaleString("pt-BR")}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PermissionsBlock({
  d,
}: {
  d: {
    authUid: string | null;
    claimsSummary: { sub: string | null; role: string | null; email: string | null; aud: string | null; exp: number | null } | null;
    roles: string[];
    isAdmin: boolean | null;
    hasRoleError: CoverageError | null;
  };
}) {
  const hasUid = !!d.authUid;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded border p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessão</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            {hasUid ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className="font-mono break-all">auth.uid = {d.authUid ?? "null"}</span>
          </div>
          {d.claimsSummary && (
            <>
              <div className="font-mono text-muted-foreground">claim.role = {d.claimsSummary.role ?? "—"}</div>
              <div className="font-mono text-muted-foreground">claim.email = {d.claimsSummary.email ?? "—"}</div>
              {d.claimsSummary.exp != null && (
                <div className="font-mono text-muted-foreground">
                  claim.exp = {new Date(d.claimsSummary.exp * 1000).toLocaleString("pt-BR")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="rounded border p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Autorização</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {d.roles.length === 0 ? (
            <Badge variant="outline" className="text-xs">nenhum papel</Badge>
          ) : (
            d.roles.map((r) => (
              <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">
                {r}
              </Badge>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {d.isAdmin ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>has_role('admin') = true</span>
            </>
          ) : d.isAdmin === false ? (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
              <span>has_role('admin') = false</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>has_role indisponível</span>
            </>
          )}
        </div>
        {d.hasRoleError && (
          <div className="mt-2">
            <CoverageErrorBanner error={new Error(JSON.stringify(d.hasRoleError))} />
          </div>
        )}
      </div>
    </div>
  );
}

function RpcBlock({
  rpcs,
}: {
  rpcs: Array<{ name: string; ok: boolean; error: CoverageError | null; sampleCount: number | null }>;
}) {
  return (
    <div className="rounded border">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        RPCs
      </div>
      <ul className="divide-y">
        {rpcs.map((r) => (
          <li key={r.name} className="px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono break-all">{r.name}</span>
              {r.ok ? (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> ok
                  {r.sampleCount != null && ` · ${r.sampleCount} linha(s)`}
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" /> {r.error ? KIND_LABEL[r.error.kind] : "falha"}
                </Badge>
              )}
            </div>
            {!r.ok && r.error && (
              <div className="mt-2">
                <CoverageErrorBanner error={new Error(JSON.stringify(r.error))} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SelfHealAdminBlock({
  userId,
  email,
  onGranted,
}: {
  userId: string | null;
  email: string | null;
  onGranted: () => void;
}) {
  const call = useServerFn(grantSelfAdmin);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleGrant() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await call();
      setMsg(`Papel 'admin' concedido (motivo: ${r.reason}). Atualize a página se necessário.`);
      onGranted();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const sqlSnippet =
    userId
      ? `-- Executar como service_role (SQL Editor do banco):\ninsert into public.user_roles (user_id, role)\nvalues ('${userId}', 'admin')\non conflict (user_id, role) do nothing;`
      : `-- Faça login primeiro para obter seu auth.uid`;

  return (
    <div className="rounded border border-amber-500/50 bg-amber-500/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
        <Wrench className="h-4 w-4" /> Correção guiada: conceder papel de admin
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Detectamos que <code className="rounded bg-background px-1">has_role('admin')</code> retornou{" "}
        <strong>false</strong> para {email ? <code>{email}</code> : "este usuário"}. Isso significa que não há uma
        linha em <code>public.user_roles</code> associando <code className="break-all">{userId ?? "auth.uid"}</code>{" "}
        ao papel <code>admin</code>.
      </p>

      <div className="mb-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Opção 1 — Aplicar automaticamente
        </p>
        <Button size="sm" onClick={handleGrant} disabled={busy || !userId}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          Conceder admin ao meu usuário
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Só funciona se ainda não existir nenhum admin cadastrado ou se seu e-mail estiver na allowlist do sistema.
          Caso contrário, use a opção 2.
        </p>
        {msg && <p className="text-xs">{msg}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Opção 2 — Comando SQL para outro admin executar
        </p>
        <pre className="max-h-40 overflow-auto rounded bg-background p-2 text-[11px] leading-relaxed">
{sqlSnippet}
        </pre>
      </div>
    </div>
  );
}
