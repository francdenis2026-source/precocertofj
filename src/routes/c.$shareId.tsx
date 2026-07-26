import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getSharedComparison,
  type SharedComparisonResult,
  type SharedItem,
} from "@/lib/shares.functions";
import { exportComparisonPdf } from "@/lib/pdf-export";
import { verdictLabel, type Verdict } from "@/lib/scan-utils";
import { Download, ImageOff, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$shareId")({
  head: ({ params }) => ({
    meta: [
      { title: "Comparação de preços — PreçoCerto" },
      {
        name: "description",
        content: "Veja a comparação de preços compartilhada no PreçoCerto.",
      },
      { property: "og:title", content: "Comparação PreçoCerto" },
      { property: "og:type", content: "article" },
      {
        property: "og:url",
        content: `https://precocerto-fj.lovable.app/c/${params.shareId}`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `https://precocerto-fj.lovable.app/c/${params.shareId}`,
      },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { shareId } = useParams({ from: "/c/$shareId" });
  const [result, setResult] = useState<SharedComparisonResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSharedComparison({ data: { id: shareId } })
      .then(setResult)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [shareId]);

  const fmt = (n: number | null | undefined) =>
    typeof n === "number" ? `R$ ${n.toFixed(2).replace(".", ",")}` : "—";

  const data = result?.status === "ok" ? result.share : null;

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <header className="border-b border-primary/20 bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon" strokeWidth={1.5} />
            <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
              PreçoCerto · Comparação
            </span>
          </div>
          <a
            href="/"
            className="rounded-full border border-primary/30 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10"
          >
            Abrir app
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {err && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
            {err}
          </p>
        )}
        {!result && !err && (
          <p className="font-mono text-xs text-muted-foreground">Carregando…</p>
        )}
        {result?.status === "expired" && (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-warning">
              Link expirado
            </p>
            <p className="mt-2 text-sm text-foreground">
              Esta comparação era válida por 30 dias e expirou em{" "}
              {new Date(result.expiresAt).toLocaleDateString("pt-BR")}.
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Peça a quem compartilhou para gerar um novo link.
            </p>
            <a
              href="/"
              className="mt-4 inline-block rounded-full bg-neon px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
            >
              Abrir PreçoCerto
            </a>
          </div>
        )}
        {result?.status === "not_found" && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="font-mono text-xs text-muted-foreground">
              Este link não existe mais.
            </p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-surface p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded-2xl bg-background sm:w-56">
                  {data.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.imageUrl}
                      alt="Foto da comparação"
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width={224}
                      height={224}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {data.marketName && (
                    <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                      <ShoppingBag className="h-3 w-3" /> {data.marketName}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Gerado em {new Date(data.createdAt).toLocaleString("pt-BR")} · Expira em{" "}
                    {new Date(data.expiresAt).toLocaleDateString("pt-BR")}
                  </p>

                  <button
                    type="button"
                    onClick={async () => {
                      toast.info("Gerando PDF…");
                      try {
                        await exportComparisonPdf({
                          marketName: data.marketName,
                          imageUrl: data.imageUrl,
                          items: data.products,
                        });
                        toast.success("PDF exportado ✓");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha no PDF");
                      }
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-neon px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:brightness-110"
                  >
                    <Download className="h-3 w-3" /> Exportar PDF
                  </button>
                </div>
              </div>
            </div>

            <ul className="space-y-2">
              {data.products.map((it: SharedItem, i: number) => (
                <li
                  key={i}
                  className="rounded-2xl border border-primary/10 bg-surface p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm text-foreground">{it.productName}</p>
                    <p className="shrink-0 font-mono text-sm font-bold text-neon">
                      {fmt(it.price)}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Meta label="Média">{fmt(it.average ?? null)}</Meta>
                    <Meta label="Veredito">
                      {it.verdict
                        ? verdictLabel[it.verdict as Verdict] ?? it.verdict
                        : "—"}
                    </Meta>
                    {it.cheaperElsewhere && (
                      <Meta label="+ barato em">
                        {it.cheaperElsewhere.marketName} · {fmt(it.cheaperElsewhere.price)}
                      </Meta>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background px-2 py-1">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-xs">{children}</p>
    </div>
  );
}
