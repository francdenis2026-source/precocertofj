import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Search = { from?: string };

export const Route = createFileRoute("/sem-permissao")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sem permissão — Preço Certo" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Esta área é restrita a administradores autorizados.",
      },
    ],
  }),
  component: SemPermissaoPage,
});

function SemPermissaoPage() {
  const { from } = useSearch({ from: "/sem-permissao" });
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" aria-hidden />
          </div>
          <CardTitle>Sem permissão</CardTitle>
          <CardDescription>
            Esta página é exclusiva para administradores autorizados.
            {from ? (
              <>
                <br />
                <span className="text-xs text-muted-foreground/80 break-all">
                  Rota bloqueada: {from}
                </span>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild>
            <Link to="/app">Voltar ao painel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Ir para a página inicial</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
