import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  listAllSynonymGroups,
  upsertSynonymGroup,
  deleteSynonymGroup,
  type SynonymGroupRow,
} from "@/lib/search-synonyms.functions";
import { useMyRoles } from "@/hooks/useMyRoles";
import { AppShell } from "@/components/brand/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-provider";
import { ArrowLeft, Loader2, Plus, Trash2, Pencil, Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/admin_/sinonimos")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Sinônimos da busca — Admin" },
      { name: "description", content: "Gerencie grupos canônicos, sinônimos e listas de exclusão da busca." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SynonymsGate,
});

function SynonymsGate() {
  const { user, loading, isAdmin } = useMyRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sem permissão</CardTitle>
            <CardDescription>Esta página é exclusiva para administradores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link to="/admin">Voltar ao painel</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <SynonymsPage />;
}

function SynonymsPage() {
  const listFn = useServerFn(listAllSynonymGroups);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "synonym-groups"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = data ?? [];
    if (!q) return rows;
    return rows.filter((g) =>
      g.canonical.toLowerCase().includes(q)
      || g.synonyms.some((s) => s.toLowerCase().includes(q))
      || g.excludeTokens.some((s) => s.toLowerCase().includes(q))
    );
  }, [data, filter]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "synonym-groups"] });

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Painel
            </Link>
            <h1 className="font-serif text-3xl">Sinônimos & exclusões da busca</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Gerencie os grupos canônicos usados pela busca. <b>Sinônimos</b> ampliam o match (ex.:
              "sal refinado" também casa com "sal"). <b>Exclusões</b> filtram itens que apenas
              contêm o termo (ex.: remover "margarina c/sal" ao buscar "sal") quando o usuário
              ativa "Somente item puro".
            </p>
          </div>
          <GroupDialog onSaved={invalidate}>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo grupo</Button>
          </GroupDialog>
        </header>

        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por canônico, sinônimo ou exclusão…"
              className="pl-8"
            />
          </div>
          <Badge variant="outline">{filtered.length} de {data?.length ?? 0}</Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card><CardContent className="py-6 text-sm text-destructive">
            Erro ao carregar: {error instanceof Error ? error.message : String(error)}
          </CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum grupo encontrado. Crie o primeiro para começar.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((g) => (
              <GroupCard key={g.id} group={g} onChanged={invalidate} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function GroupCard({ group, onChanged }: { group: SynonymGroupRow; onChanged: () => void }) {
  const { confirm } = useConfirm();
  const upsertFn = useServerFn(upsertSynonymGroup);
  const deleteFn = useServerFn(deleteSynonymGroup);


  const toggleActive = useMutation({
    mutationFn: () => upsertFn({ data: {
      id: group.id,
      canonical: group.canonical,
      synonyms: group.synonyms,
      excludeTokens: group.excludeTokens,
      active: !group.active,
    } }),
    onSuccess: () => { onChanged(); toast.success(group.active ? "Grupo desativado" : "Grupo ativado"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
  });

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: group.id } }),
    onSuccess: () => { onChanged(); toast.success("Grupo removido"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover"),
  });

  return (
    <Card className={group.active ? "" : "opacity-60"}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-mono text-lg uppercase tracking-wide">{group.canonical}</CardTitle>
              {!group.active && <Badge variant="outline">Inativo</Badge>}
            </div>
            <CardDescription className="text-xs">
              {group.synonyms.length} sinônimos · {group.excludeTokens.length} exclusões · atualizado {new Date(group.updatedAt).toLocaleString("pt-BR")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Switch checked={group.active} onCheckedChange={() => toggleActive.mutate()} disabled={toggleActive.isPending} />
              Ativo
            </div>
            <GroupDialog group={group} onSaved={onChanged}>
              <Button variant="outline" size="sm"><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
            </GroupDialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                const ok = await confirm({
                  title: `Remover grupo "${group.canonical}"?`,
                  description: "Esta ação é permanente.",
                  confirmLabel: "Remover",
                  destructive: true,
                });
                if (ok) remove.mutate();
              }}
              disabled={remove.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <TokenLine label="Sinônimos" tokens={group.synonyms} tone="primary" />
        <TokenLine label="Exclusões" tokens={group.excludeTokens} tone="destructive" />
      </CardContent>
    </Card>
  );
}

function TokenLine({ label, tokens, tone }: { label: string; tokens: string[]; tone: "primary" | "destructive" }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {tokens.length === 0 ? (
        <span className="text-xs italic text-muted-foreground">nenhum</span>
      ) : (
        tokens.map((t) => (
          <span
            key={t}
            className={
              "rounded-full border px-2 py-0.5 text-[11px] " +
              (tone === "primary"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-destructive/30 bg-destructive/10 text-destructive")
            }
          >
            {t}
          </span>
        ))
      )}
    </div>
  );
}

function GroupDialog({
  group,
  onSaved,
  children,
}: {
  group?: SynonymGroupRow;
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const upsertFn = useServerFn(upsertSynonymGroup);
  const [open, setOpen] = useState(false);
  const [canonical, setCanonical] = useState(group?.canonical ?? "");
  const [synonymsText, setSynonymsText] = useState((group?.synonyms ?? []).join("\n"));
  const [excludeText, setExcludeText] = useState((group?.excludeTokens ?? []).join("\n"));
  const [active, setActive] = useState(group?.active ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCanonical(group?.canonical ?? "");
      setSynonymsText((group?.synonyms ?? []).join("\n"));
      setExcludeText((group?.excludeTokens ?? []).join("\n"));
      setActive(group?.active ?? true);
    }
  }, [open, group]);

  const parseLines = (t: string) =>
    t.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

  const save = async () => {
    setSaving(true);
    try {
      await upsertFn({ data: {
        id: group?.id,
        canonical: canonical.trim(),
        synonyms: parseLines(synonymsText),
        excludeTokens: parseLines(excludeText),
        active,
      } });
      toast.success(group ? "Grupo atualizado" : "Grupo criado");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{group ? "Editar grupo" : "Novo grupo canônico"}</DialogTitle>
          <DialogDescription>
            Um item por linha (ou separados por vírgula). Termos são normalizados sem acento
            automaticamente na busca.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Termo canônico</Label>
            <Input
              value={canonical}
              onChange={(e) => setCanonical(e.target.value)}
              placeholder="ex.: sal"
              autoFocus={!group}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Palavra base que o usuário provavelmente digita.
            </p>
          </div>
          <div>
            <Label>Sinônimos</Label>
            <Textarea
              rows={5}
              value={synonymsText}
              onChange={(e) => setSynonymsText(e.target.value)}
              placeholder={"sal\nsal refinado\nsal grosso"}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Expressões equivalentes que também devem casar (inclua o próprio canônico).
            </p>
          </div>
          <div>
            <Label>Exclusões (para "Somente item puro")</Label>
            <Textarea
              rows={5}
              value={excludeText}
              onChange={(e) => setExcludeText(e.target.value)}
              placeholder={"margarina\nbiscoito\nsalsicha"}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Se o nome do produto contiver qualquer uma dessas palavras, o item é filtrado
              quando o usuário liga "Somente item puro".
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label>Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !canonical.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
