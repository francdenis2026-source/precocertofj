import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyScan, type MyScan } from "@/lib/scans-history.functions";
import { useSession } from "@/hooks/useSession";
import { MobileNav } from "@/components/nav/MobileNav";
import { verdictLabel } from "@/lib/scan-utils";
import {
  ArrowLeft,
  ImageOff,
  MapPin,
  Barcode,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";

export const Route = createFileRoute("/historico/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do scan — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DetailPage,
});

function DetailPage() {
  const { id } = useParams({ from: "/historico/$id" });
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const fetchScan = useServerFn(getMyScan);
  const [scan, setScan] = useState<MyScan | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    fetchScan({ data: { id } })
      .then(setScan)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, [id, user, loading, navigate, fetchScan]);

  const diff = scan?.diffPct ?? null;
  const DiffIcon = diff === null ? Minus : diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus;
  const v = scan?.verdict ?? "unknown";
  const verdictBg =
    v === "barato"
      ? "bg-neon text-primary-foreground"
      : v === "caro"
      ? "bg-destructive text-destructive-foreground"
      : v === "justo"
      ? "bg-primary text-primary-foreground"
      : "bg-surface border border-border text-foreground";

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-md px-3 py-4 sm:px-4">
        <header className="mb-4 flex items-center gap-3">
          <Link
            to="/historico/scans"
            aria-label="Voltar"
            className="rounded-full border border-primary/20 p-1.5 text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Detalhe
          </span>
        </header>

        {err && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
            {err}
          </p>
        )}

        {scan === undefined && !err && (
          <p className="font-mono text-xs text-muted-foreground">Carregando…</p>
        )}

        {scan === null && (
          <p className="font-mono text-xs text-muted-foreground">Scan não encontrado.</p>
        )}

        {scan && (
          <div className="space-y-3">
            <ProductImage
              src={scan.imageUrl}
              alt={scan.productName ?? "scan"}
              width={640}
              height={640}
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 768px) 640px, 100vw"
              fit="contain"
              fallbackIcon={ImageOff}
              fallbackLabel={scan.productName ?? undefined}
              className="aspect-square w-full rounded-3xl border border-primary/20 bg-surface"
            />

            <div className={`rounded-3xl p-5 ${verdictBg}`}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-80">
                Veredito
              </p>
              <p className="mt-1 font-mono text-4xl font-extrabold leading-none">
                {verdictLabel[v as "barato" | "justo" | "caro" | "unknown"] ?? v}
              </p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-mono text-3xl font-bold">
                  {scan.priceCaptured
                    ? `R$ ${scan.priceCaptured.toFixed(2).replace(".", ",")}`
                    : "—"}
                </span>
                <span className="flex items-center gap-1 font-mono text-xs opacity-80">
                  <DiffIcon className="h-3 w-3" />
                  {diff === null
                    ? "sem média"
                    : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}% vs média`}
                </span>
              </div>
              {scan.averagePrice !== null && (
                <p className="mt-2 font-mono text-[10px] opacity-70">
                  Média histórica: R$ {scan.averagePrice.toFixed(2).replace(".", ",")}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Produto">{scan.productName ?? "—"}</Field>
              <Field label="Mercado">{scan.marketName ?? "—"}</Field>
              <Field label="Código de barras">
                {scan.barcode ? (
                  <span className="flex items-center gap-1">
                    <Barcode className="h-3 w-3" /> {scan.barcode}
                  </span>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Localização">
                {scan.latitude && scan.longitude ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${scan.latitude},${scan.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-neon"
                  >
                    <MapPin className="h-3 w-3" /> Ver no mapa
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Data">
                {new Date(scan.createdAt).toLocaleString("pt-BR")}
              </Field>
            </dl>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-surface p-3">
      <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 min-w-0 break-words font-mono text-xs text-foreground">{children}</dd>
    </div>
  );
}
