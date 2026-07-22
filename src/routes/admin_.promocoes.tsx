import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  listPromoCoupons,
  upsertPromoCoupon,
  deletePromoCoupon,
  type PromoCoupon,
} from "@/lib/checkout.functions";

export const Route = createFileRoute("/admin_/promocoes")({
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Cupons promocionais — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromocoesPage,
});

function PromocoesPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listPromoCoupons);
  const upsert = useServerFn(upsertPromoCoupon);
  const remove = useServerFn(deletePromoCoupon);

  const [form, setForm] = useState({
    id: undefined as string | undefined,
    code: "",
    percent_off: 10,
    active: true,
    description: "",
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["promo-coupons"],
    queryFn: () => fetchList(),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: form.id,
          code: form.code,
          percent_off: form.percent_off,
          active: form.active,
          description: form.description || null,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Cupom atualizado" : "Cupom criado");
      setForm({ id: undefined, code: "", percent_off: 10, active: true, description: "" });
      qc.invalidateQueries({ queryKey: ["promo-coupons"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Cupom removido");
      qc.invalidateQueries({ queryKey: ["promo-coupons"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover"),
  });

  function edit(c: PromoCoupon) {
    setForm({
      id: c.id,
      code: c.code,
      percent_off: c.percent_off,
      active: c.active,
      description: c.description ?? "",
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="Cupons promocionais"
        description="Códigos de desconto percentual aplicáveis no checkout."
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Cupons" }]}
        icon={<Ticket className="h-5 w-5" />}
      />
      <div className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{form.id ? "Editar cupom" : "Novo cupom"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Código</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="FEIJO20"
                maxLength={32}
              />
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.percent_off}
                onChange={(e) => setForm({ ...form, percent_off: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Campanha lançamento"
                maxLength={200}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <Label htmlFor="active" className="cursor-pointer">Ativo</Label>
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="executive"
                className="flex-1"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.code || form.percent_off < 1}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                {form.id ? "Salvar" : "Criar"}
              </Button>
              {form.id && (
                <Button
                  variant="ghost-navy"
                  onClick={() =>
                    setForm({ id: undefined, code: "", percent_off: 10, active: true, description: "" })
                  }
                >
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cupons ({coupons.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : coupons.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Nenhum cupom cadastrado.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.code}</TableCell>
                      <TableCell>{c.percent_off}%</TableCell>
                      <TableCell>{c.redemptions}</TableCell>
                      <TableCell>
                        <Badge variant={c.active ? "default" : "outline"}>
                          {c.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button size="sm" variant="ghost-navy" onClick={() => edit(c)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost-navy"
                          onClick={() => {
                            if (confirm(`Remover ${c.code}?`)) deleteMutation.mutate(c.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
