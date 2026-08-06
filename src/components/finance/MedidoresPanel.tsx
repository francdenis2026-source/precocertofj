import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Plus, Trash2, Pencil, Calendar, Clock, Gauge, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Zap, Droplets, Flame, Fuel,
  AlertTriangle, FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { PanelCard } from "@/components/dashboard/PanelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listTransactions, upsertTransaction, deleteTransaction,
  type FinanceCategory, type FinanceTransaction, type FinanceMeta, type PaymentMethod,
} from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

/* ================= META CONFIG ================= */

type UtilKey = "energia" | "agua" | "gas" | "combustivel";

type UtilConfig = {
  key: UtilKey;
  categorySlug: string;
  label: string;
  unit: string;
  accent: string; // css color
  accentSoft: string;
  Icon: typeof Zap;
  fields: {
    hasReading?: boolean;      // prev/current
    hasLiters?: boolean;       // combustível
    hasWeight?: boolean;       // gás botijão
    hasOdometer?: boolean;
    hasType?: boolean;
  };
  typeOptions?: Array<{ value: string; label: string }>;
  weightOptions?: Array<{ value: string; label: string; kg: number }>;
};

const UTILS: Record<UtilKey, UtilConfig> = {
  energia: {
    key: "energia",
    categorySlug: "energia",
    label: "Energia",
    unit: "kWh",
    accent: "#F59E0B",
    accentSoft: "rgba(245, 158, 11, 0.14)",
    Icon: Zap,
    fields: { hasReading: true },
  },
  agua: {
    key: "agua",
    categorySlug: "agua",
    label: "Água",
    unit: "m³",
    accent: "#0EA5E9",
    accentSoft: "rgba(14, 165, 233, 0.14)",
    Icon: Droplets,
    fields: { hasReading: true },
  },
  gas: {
    key: "gas",
    categorySlug: "gas",
    label: "Gás",
    unit: "kg",
    accent: "#EF4444",
    accentSoft: "rgba(239, 68, 68, 0.14)",
    Icon: Flame,
    fields: { hasWeight: true, hasType: true },
    typeOptions: [
      { value: "botijao", label: "Botijão" },
      { value: "encanado", label: "Encanado" },
    ],
    weightOptions: [
      { value: "13kg", label: "13 kg (P13)", kg: 13 },
      { value: "20kg", label: "20 kg (P20)", kg: 20 },
      { value: "45kg", label: "45 kg (P45)", kg: 45 },
    ],
  },
  combustivel: {
    key: "combustivel",
    categorySlug: "combustivel",
    label: "Combustível",
    unit: "L",
    accent: "#10B981",
    accentSoft: "rgba(16, 185, 129, 0.14)",
    Icon: Fuel,
    fields: { hasLiters: true, hasOdometer: true, hasType: true },
    typeOptions: [
      { value: "gasolina", label: "Gasolina" },
      { value: "etanol", label: "Etanol" },
      { value: "diesel", label: "Diesel" },
      { value: "gnv", label: "GNV" },
    ],
  },
};

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numFmt = (n: number, digits = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const currentMonthISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

/* Number/consumption derivation */
function deriveConsumption(meta: FinanceMeta): number | null {
  const c = Number(meta.consumption ?? 0);
  if (c > 0) return c;
  const prev = Number(meta.previous_reading ?? 0);
  const cur = Number(meta.current_reading ?? 0);
  if (cur > prev && prev >= 0) return cur - prev;
  const liters = Number(meta.liters ?? 0);
  if (liters > 0) return liters;
  const wk = meta.weight ? Number(String(meta.weight).replace(/[^\d.]/g, "")) : 0;
  if (wk > 0) return wk;
  return null;
}

/* ================= SVG COMPONENTS ================= */

function GaugeRing({
  value, max, color, label, unit,
}: { value: number; max: number; color: string; label: string; unit: string }) {
  const size = 128;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const dash = circ * pct;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} opacity={0.35} />
      <motion.circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#grad-${label})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <text x="50%" y="46%" textAnchor="middle" className="fill-foreground" style={{ fontSize: 20, fontWeight: 700 }}>
        {numFmt(value, value >= 100 ? 0 : 1)}
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
        {unit}
      </text>
    </svg>
  );
}

function HeaderPattern({ color }: { color: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id={`hp-${color.replace("#", "")}`} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 0 12 L 12 0 L 24 12 L 12 24 Z" fill="none" stroke={color} strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="400" height="120" fill={`url(#hp-${color.replace("#", "")})`} />
    </svg>
  );
}

/* ================= MAIN PANEL ================= */

export function MedidoresPanel({ month, categories }: { month: string; categories: FinanceCategory[] }) {
  const qc = useQueryClient();
  const fetchTx = useServerFn(listTransactions);
  const delFn = useServerFn(deleteTransaction);

  // 6 meses de histórico
  const monthList = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(y, m - 1 - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    }).reverse();
  }, [month]);

  const historyQ = useQuery({
    queryKey: ["fin-med-history", month],
    queryFn: async () => {
      const results = await Promise.all(monthList.map((mm) => fetchTx({ data: { month: mm, limit: 200 } })));
      return monthList.map((mm, i) => ({ month: mm, transactions: results[i] }));
    },
  });

  const [editing, setEditing] = useState<{ util: UtilKey; tx: FinanceTransaction | null } | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Leitura removida");
      qc.invalidateQueries({ queryKey: ["fin-med-history"] });
      qc.invalidateQueries({ queryKey: ["fin-tx"] });
      qc.invalidateQueries({ queryKey: ["fin-sum"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byUtil = useMemo(() => {
    const history = historyQ.data ?? [];
    const map: Record<UtilKey, Array<{ month: string; total: number; consumption: number; entries: FinanceTransaction[] }>> = {
      energia: [], agua: [], gas: [], combustivel: [],
    };
    for (const cfg of Object.values(UTILS)) {
      const cat = categories.find((c) => c.slug === cfg.categorySlug);
      for (const { month: mm, transactions } of history) {
        const items = transactions.filter((t) => t.categoryId && cat && t.categoryId === cat.id);
        const total = items.reduce((a, t) => a + t.amount, 0);
        const consumption = items.reduce((a, t) => a + (deriveConsumption(t.metadata) ?? 0), 0);
        map[cfg.key].push({ month: mm, total, consumption, entries: items });
      }
    }
    return map;
  }, [historyQ.data, categories]);

  // Configurações persistentes de alerta
  const [alertThresholdPct, setAlertThresholdPct] = useState<number>(() => {
    if (typeof window === "undefined") return 10;
    const v = Number(window.localStorage.getItem("medidores.alertThresholdPct"));
    return Number.isFinite(v) && v > 0 ? v : 10;
  });
  const [alertWindow, setAlertWindow] = useState<number>(() => {
    if (typeof window === "undefined") return 5;
    const v = Number(window.localStorage.getItem("medidores.alertWindow"));
    return Number.isFinite(v) && v >= 1 ? v : 5;
  });
  const updateThreshold = (v: number) => {
    const clamped = Math.max(1, Math.min(200, Math.round(v)));
    setAlertThresholdPct(clamped);
    if (typeof window !== "undefined") window.localStorage.setItem("medidores.alertThresholdPct", String(clamped));
  };
  const updateWindow = (v: number) => {
    const clamped = Math.max(1, Math.min(24, Math.round(v)));
    setAlertWindow(clamped);
    if (typeof window !== "undefined") window.localStorage.setItem("medidores.alertWindow", String(clamped));
  };

  // Alertas: consumo atual > média histórica (janela configurável)
  const alerts = useMemo(() => {
    const out: Array<{ key: UtilKey; cfg: UtilConfig; current: number; avg: number; pctOver: number }> = [];
    const multiplier = 1 + alertThresholdPct / 100;
    for (const cfg of Object.values(UTILS)) {
      const series = byUtil[cfg.key];
      if (!series || series.length < 2) continue;
      const current = series[series.length - 1]?.consumption ?? 0;
      const prior = series.slice(0, -1).slice(-alertWindow).map((s) => s.consumption).filter((v) => v > 0);
      if (prior.length === 0 || current <= 0) continue;
      const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
      if (avg > 0 && current > avg * multiplier) {
        out.push({ key: cfg.key, cfg, current, avg, pctOver: ((current - avg) / avg) * 100 });
      }
    }
    return out;
  }, [byUtil, alertThresholdPct, alertWindow]);

  const handleExportPdf = async () => {
    try {
      const { exportMedidoresPdf } = await import("@/lib/medidores-pdf");
      await exportMedidoresPdf({ month, monthList, byUtil, utils: UTILS });
      toast.success("Relatório PDF gerado");
    } catch (e) {
      toast.error((e as Error).message || "Falha ao gerar PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Medidores</h3>
          <p className="text-sm text-muted-foreground">Energia, água, gás e combustível — leituras, consumo e tendência</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <label className="text-muted-foreground">Alerta &gt;</label>
            <input
              type="number"
              min={1}
              max={200}
              value={alertThresholdPct}
              onChange={(e) => updateThreshold(Number(e.target.value))}
              className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-right tabular-nums"
            />
            <span className="text-muted-foreground">% vs média</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <label className="text-muted-foreground">janela</label>
            <input
              type="number"
              min={1}
              max={24}
              value={alertWindow}
              onChange={(e) => updateWindow(Number(e.target.value))}
              className="w-12 rounded border border-border bg-background px-1.5 py-0.5 text-right tabular-nums"
            />
            <span className="text-muted-foreground">meses</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileDown className="mr-1.5 h-4 w-4" /> Exportar PDF do mês
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Consumo acima da média histórica
          </div>
          <ul className="grid gap-1.5 text-sm md:grid-cols-2">
            {alerts.map((a) => (
              <li key={a.key} className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <a.cfg.Icon className="h-4 w-4" style={{ color: a.cfg.accent }} />
                  <span className="font-medium">{a.cfg.label}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {numFmt(a.current, 1)} {a.cfg.unit} · <span className="font-semibold text-amber-700 dark:text-amber-400">+{a.pctOver.toFixed(0)}%</span> vs média {numFmt(a.avg, 1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {(Object.values(UTILS)).map((cfg) => {
          const series = byUtil[cfg.key];
          const cur = series[series.length - 1];
          const prev = series[series.length - 2];
          const curTotal = cur?.total ?? 0;
          const prevTotal = prev?.total ?? 0;
          const delta = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : 0;
          const consumption = cur?.consumption ?? 0;
          const maxSeries = Math.max(...series.map((s) => s.consumption), 1);
          return (
            <motion.div
              key={cfg.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4"
              style={{ boxShadow: `0 12px 32px -22px ${cfg.accent}` }}
            >
              <HeaderPattern color={cfg.accent} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-lg"
                      style={{ background: cfg.accentSoft, color: cfg.accent }}
                    >
                      <cfg.Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cfg.label}</p>
                      <p className="text-lg font-semibold tabular-nums">{BRL(curTotal)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={cn("gap-1 border-transparent tabular-nums", delta > 0 ? "bg-destructive/10 text-destructive" : delta < 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted")}
                    >
                      {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : delta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                      {prevTotal > 0 ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%` : "—"}
                    </Badge>
                    <span className="text-muted-foreground">vs mês anterior</span>
                  </div>
                </div>
                <GaugeRing value={consumption} max={maxSeries} color={cfg.accent} label={cfg.key} unit={cfg.unit} />
              </div>

              <div className="relative mt-2">
                <MiniSpark data={series.map((s) => s.consumption)} color={cfg.accent} />
              </div>

              <div className="relative mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{cur?.entries.length ?? 0} lançamento(s) no mês</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setEditing({ util: cfg.key, tx: null })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Registrar
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Consumption trend */}
      <PanelCard
        title="Consumo por medidor"
        description="Últimos 6 meses — quantidade consumida por utilidade"
        eyebrow="Tendência"
      >
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart
              data={monthList.map((mm, i) => ({
                m: mm.slice(5, 7) + "/" + mm.slice(2, 4),
                Energia: byUtil.energia[i]?.consumption ?? 0,
                Água: byUtil.agua[i]?.consumption ?? 0,
                Gás: byUtil.gas[i]?.consumption ?? 0,
                Combustível: byUtil.combustivel[i]?.consumption ?? 0,
              }))}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                {Object.values(UTILS).map((u) => (
                  <linearGradient key={u.key} id={`ga-${u.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={u.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={u.accent} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, name: any) => [`${numFmt(Number(v), 1)} ${UTILS[nameToKey(name as string)]?.unit ?? ""}`, name] as any}
              />
              <Area type="monotone" dataKey="Energia" stroke={UTILS.energia.accent} fill="url(#ga-energia)" strokeWidth={2} />
              <Area type="monotone" dataKey="Água" stroke={UTILS.agua.accent} fill="url(#ga-agua)" strokeWidth={2} />
              <Area type="monotone" dataKey="Gás" stroke={UTILS.gas.accent} fill="url(#ga-gas)" strokeWidth={2} />
              <Area type="monotone" dataKey="Combustível" stroke={UTILS.combustivel.accent} fill="url(#ga-combustivel)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>

      {/* History tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.values(UTILS)).map((cfg) => {
          const entries = byUtil[cfg.key][byUtil[cfg.key].length - 1]?.entries ?? [];
          return (
            <PanelCard
              key={cfg.key}
              title={
                <span className="flex items-center gap-2">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-md"
                    style={{ background: cfg.accentSoft, color: cfg.accent }}
                  >
                    <cfg.Icon className="h-4 w-4" />
                  </span>
                  {cfg.label}
                </span>
              }
              description={`${entries.length} registro(s) no mês`}
              actions={
                <Button size="sm" variant="outline" onClick={() => setEditing({ util: cfg.key, tx: null })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Novo
                </Button>
              }
            >
              {entries.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                  <Gauge className="h-8 w-8 opacity-40" />
                  <p>Nenhuma leitura registrada.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {entries.map((t) => {
                    const c = deriveConsumption(t.metadata);
                    const time = (t.metadata.time as string) ?? "";
                    const unitPrice = c && c > 0 ? t.amount / c : null;
                    return (
                      <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {t.description || `Leitura de ${cfg.label.toLowerCase()}`}
                          </p>
                          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{t.occurredOn.slice(-2)}/{t.occurredOn.slice(5, 7)}</span>
                            {time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{time}</span>}
                            {c != null && <span>{numFmt(c, c >= 100 ? 0 : 2)} {cfg.unit}</span>}
                            {unitPrice != null && <span>{BRL(unitPrice)}/{cfg.unit}</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">{BRL(t.amount)}</p>
                        </div>
                        <div className="flex">
                          <Button size="icon" variant="ghost" onClick={() => setEditing({ util: cfg.key, tx: t })} aria-label={`Editar leitura de ${cfg.label}`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => del.mutate(t.id)} disabled={del.isPending} aria-label={`Excluir leitura de ${cfg.label}`}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PanelCard>
          );
        })}
      </div>

      {/* Shopping list CTA */}
      <PanelCard
        title="Lista de compras integrada"
        description="Monte sua lista, compare preços entre mercados e exporte a rota mais econômica"
        eyebrow="Alimentação"
        className="overflow-hidden"
      >
        <div className="relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <svg
            className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 opacity-[0.08]"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <path d="M20 30 L80 30 L72 78 L28 78 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="38" cy="86" r="4" fill="currentColor" />
            <circle cx="62" cy="86" r="4" fill="currentColor" />
            <path d="M28 30 L34 12 L66 12 L72 30" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <div className="max-w-xl">
            <p className="text-sm text-muted-foreground">
              Cada item da sua lista é sincronizado com o banco de dados: preço médio, mercado mais barato e histórico de compras vinculado ao seu módulo financeiro.
            </p>
          </div>
          <Button asChild className="btn-signal">
            <Link to="/lista">
              <ShoppingCart className="mr-1.5 h-4 w-4" /> Abrir minha lista
            </Link>
          </Button>
        </div>
      </PanelCard>

      {editing && (
        <ReadingDialog
          util={UTILS[editing.util]}
          category={categories.find((c) => c.slug === UTILS[editing.util].categorySlug) ?? null}
          editing={editing.tx}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["fin-med-history"] });
            qc.invalidateQueries({ queryKey: ["fin-tx"] });
            qc.invalidateQueries({ queryKey: ["fin-sum"] });
            qc.invalidateQueries({ queryKey: ["fin-cats"] });
          }}
        />
      )}
    </div>
  );
}

function nameToKey(name: string): UtilKey {
  if (name === "Energia") return "energia";
  if (name === "Água") return "agua";
  if (name === "Gás") return "gas";
  return "combustivel";
}

/* ================= MINI SPARK ================= */

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const W = 220, H = 34, P = 2;
  const max = Math.max(...data, 1);
  const stepX = data.length > 1 ? (W - P * 2) / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = P + i * stepX;
    const y = H - P - ((v / max) * (H - P * 2));
    return `${x},${y}`;
  }).join(" ");
  const area = `M ${P},${H - P} L ${points.split(" ").join(" L ")} L ${W - P},${H - P} Z`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color} opacity="0.14" />
      <polyline fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}

/* ================= DIALOG ================= */

function ReadingDialog({
  util, category, editing, open, onOpenChange, onSaved,
}: {
  util: UtilConfig;
  category: FinanceCategory | null;
  editing: FinanceTransaction | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const saveFn = useServerFn(upsertTransaction);
  const [amount, setAmount] = useState(editing?.amount ? String(editing.amount) : "");
  const [occurredOn, setOccurredOn] = useState(editing?.occurredOn ?? todayISO());
  const [time, setTime] = useState<string>(
    (editing?.metadata.time as string) ?? nowHHMM()
  );
  const [description, setDescription] = useState(editing?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(editing?.paymentMethod ?? "");
  const [meta, setMeta] = useState<FinanceMeta>((editing?.metadata as FinanceMeta) ?? {});

  const consumption = deriveConsumption(meta);
  const unitPrice =
    Number(amount) > 0 && consumption && consumption > 0
      ? Number(amount) / consumption
      : null;

  const save = useMutation({
    mutationFn: () => {
      const fullMeta: FinanceMeta = {
        ...meta,
        time,
        recorded_at: new Date().toISOString(),
      };
      if (consumption != null) fullMeta.consumption = consumption;
      if (unitPrice != null) fullMeta.unit_price = Number(unitPrice.toFixed(4));

      return saveFn({
        data: {
          id: editing?.id,
          categoryId: category?.id ?? null,
          occurredOn,
          amount: Number(amount),
          description: description || null,
          paymentMethod: paymentMethod || null,
          metadata: fullMeta,
        },
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Leitura atualizada" : "Leitura registrada");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={{ background: util.accentSoft, color: util.accent }}
            >
              <util.Icon className="h-4 w-4" />
            </span>
            {editing ? "Editar" : "Registrar"} leitura de {util.label.toLowerCase()}
          </DialogTitle>
        </DialogHeader>

        {!category && (
          <p className="rounded-lg border border-dashed border-warning/40 bg-warning/5 p-3 text-xs text-warning-foreground">
            Categoria &quot;{util.label}&quot; não encontrada. Crie-a em <em>Finanças &gt; Categorias</em> primeiro.
          </p>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hora</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          {util.fields.hasReading && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="col-span-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Leituras do medidor ({util.unit})</span>
                {consumption != null && (
                  <span style={{ color: util.accent }}>Consumo: {numFmt(consumption, 2)} {util.unit}</span>
                )}
              </div>
              <div>
                <Label className="text-xs">Leitura anterior</Label>
                <Input
                  type="number" step="0.01"
                  value={(meta.previous_reading as number) ?? ""}
                  onChange={(e) => setMeta({ ...meta, previous_reading: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">Leitura atual</Label>
                <Input
                  type="number" step="0.01"
                  value={(meta.current_reading as number) ?? ""}
                  onChange={(e) => setMeta({ ...meta, current_reading: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Mês de referência</Label>
                <Input
                  type="month"
                  value={(meta.reference_month as string) ?? currentMonthISO().slice(0, 7)}
                  onChange={(e) => setMeta({ ...meta, reference_month: e.target.value })}
                />
              </div>
            </div>
          )}

          {util.fields.hasLiters && (
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="col-span-3 text-xs font-medium text-muted-foreground">Abastecimento</div>
              <div>
                <Label className="text-xs">Combustível</Label>
                <Select value={(meta.type as string) || ""} onValueChange={(v) => setMeta({ ...meta, type: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {util.typeOptions?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Litros</Label>
                <Input
                  className="h-9" type="number" step="0.01"
                  value={(meta.liters as number) ?? ""}
                  onChange={(e) => setMeta({ ...meta, liters: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label className="text-xs">Odômetro (km)</Label>
                <Input
                  className="h-9" type="number"
                  value={(meta.odometer as number) ?? ""}
                  onChange={(e) => setMeta({ ...meta, odometer: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              {unitPrice != null && (
                <p className="col-span-3 text-xs text-muted-foreground">
                  Preço médio: <span className="font-medium" style={{ color: util.accent }}>{BRL(unitPrice)}/L</span>
                </p>
              )}
            </div>
          )}

          {util.fields.hasWeight && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="col-span-2 text-xs font-medium text-muted-foreground">Botijão / fornecimento</div>
              {util.fields.hasType && (
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={(meta.type as string) || ""} onValueChange={(v) => setMeta({ ...meta, type: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {util.typeOptions?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Peso</Label>
                <Select
                  value={(meta.weight as string) || ""}
                  onValueChange={(v) => {
                    const opt = util.weightOptions?.find((w) => w.value === v);
                    setMeta({ ...meta, weight: v, weight_kg: opt?.kg ?? null });
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {util.weightOptions?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Fornecedor</Label>
                <Input
                  className="h-9"
                  value={(meta.supplier as string) ?? ""}
                  onChange={(e) => setMeta({ ...meta, supplier: e.target.value })}
                  placeholder="Ex: Ultragaz, Copagaz…"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Observação</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Ex: fatura ${util.label.toLowerCase()} — mês de referência`}
            />
          </div>

          <div>
            <Label className="text-xs">Forma de pagamento</Label>
            <Select value={paymentMethod || undefined} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="voucher">Vale</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {unitPrice != null && !util.fields.hasLiters && (
            <p className="text-xs text-muted-foreground">
              Custo unitário: <span className="font-medium" style={{ color: util.accent }}>
                {BRL(unitPrice)}/{util.unit}
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!amount || Number(amount) < 0 || save.isPending || !category}
            className="btn-signal"
          >
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
