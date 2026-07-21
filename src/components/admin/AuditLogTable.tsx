import { useState } from "react";
import type { AuditEntry, AuditAction } from "@/lib/admin-price.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const ACTION_LABEL: Record<AuditAction, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  price_update: { label: "Preço atualizado", variant: "default" },
  scan_delete: { label: "Leitura excluída", variant: "destructive" },
  price_verify: { label: "Verificado", variant: "secondary" },
  price_unverify: { label: "Desverificado", variant: "outline" },
  cache_invalidate_global: { label: "Cache global", variant: "outline" },
  cache_invalidate_product: { label: "Cache produto", variant: "outline" },
  cache_invalidate_store: { label: "Cache loja", variant: "outline" },
};

export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Alvo</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Antes / Depois</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => {
            const meta = ACTION_LABEL[e.action] ?? { label: e.action, variant: "outline" as const };
            return (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">
                  {e.admin_email ?? e.admin_user_id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">
                  <span className="text-muted-foreground">{e.target_type}</span>
                  {e.target_id && (
                    <div className="truncate font-mono text-[10px]">{e.target_id}</div>
                  )}
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                  {e.notes ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <JsonPopover before={e.before} after={e.after} />
                </TableCell>
              </TableRow>
            );
          })}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma ação registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function JsonPopover({ before, after }: { before: unknown; after: unknown }) {
  const [open, setOpen] = useState(false);
  if (before == null && after == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <FileText className="h-3 w-3" /> Ver
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="space-y-3 text-xs">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Antes
            </div>
            <pre className="max-h-40 overflow-auto rounded bg-muted/60 p-2 text-[11px]">
              {before == null ? "—" : JSON.stringify(before, null, 2)}
            </pre>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Depois
            </div>
            <pre className="max-h-40 overflow-auto rounded bg-muted/60 p-2 text-[11px]">
              {after == null ? "—" : JSON.stringify(after, null, 2)}
            </pre>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
