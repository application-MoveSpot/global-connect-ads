import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Period = "7" | "30" | "90" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7",   label: "7 j" },
  { value: "30",  label: "30 j" },
  { value: "90",  label: "90 j" },
  { value: "all", label: "Tout" },
];

interface TxRow {
  amount_cents: number;
  created_at: string;
}

interface ChartPoint {
  date: string;      // "DD/MM"
  iso: string;       // ISO date key for filtering
  balance: number;   // EUR
}

function useWalletHistory(userId: string | null) {
  return useQuery({
    queryKey: ["wallet-balance-history", userId],
    queryFn: async () => {
      if (!userId) return [] as TxRow[];
      const { data, error } = await (supabase as any)
        .from("wallet_transactions")
        .select("amount_cents, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TxRow[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

function buildChartData(txs: TxRow[], period: Period): ChartPoint[] {
  if (txs.length === 0) return [];

  // Compute running balance for every transaction
  let running = 0;
  const byDay: Record<string, number> = {};

  for (const tx of txs) {
    running += tx.amount_cents / 100;
    const day = tx.created_at.slice(0, 10); // "YYYY-MM-DD"
    byDay[day] = running;
  }

  // Determine period start
  const now = new Date();
  let cutoff: Date | null = null;
  if (period !== "all") {
    cutoff = new Date(now.getTime() - Number(period) * 86_400_000);
  }

  // Build sorted list of days
  const allDays = Object.keys(byDay).sort();

  // Balance just before the cutoff (to start the chart correctly)
  let startBalance = 0;
  if (cutoff) {
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    for (const day of allDays) {
      if (day < cutoffStr) startBalance = byDay[day];
      else break;
    }
  }

  // Filter to period and build chart points
  const points: ChartPoint[] = [];
  let prevBalance = startBalance;

  // Fill gaps: iterate day by day within the period
  const daysInPeriod = period === "all" ? allDays : allDays.filter((d) => {
    const cutoffStr = cutoff!.toISOString().slice(0, 10);
    return d >= cutoffStr;
  });

  // If no transactions in period, add start point
  if (daysInPeriod.length === 0 && cutoff) {
    const fmtDate = (d: Date) =>
      d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    points.push({ date: fmtDate(cutoff), iso: cutoff.toISOString().slice(0, 10), balance: startBalance });
    points.push({ date: fmtDate(now), iso: now.toISOString().slice(0, 10), balance: startBalance });
    return points;
  }

  for (const day of daysInPeriod) {
    const bal = byDay[day] ?? prevBalance;
    const d = new Date(day + "T12:00:00");
    const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    points.push({ date: label, iso: day, balance: Math.max(0, bal) });
    prevBalance = bal;
  }

  return points;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-sm">
        {val.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
      </p>
    </div>
  );
}

export function WalletBalanceChart({ userId }: { userId: string | null }) {
  const [period, setPeriod] = useState<Period>("30");
  const { data: txs = [], isLoading } = useWalletHistory(userId);

  const chartData = useMemo(() => buildChartData(txs, period), [txs, period]);

  // Trend indicator
  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].balance;
    const last  = chartData[chartData.length - 1].balance;
    const delta = last - first;
    return { delta, pct: first > 0 ? (delta / first) * 100 : 0 };
  }, [chartData]);

  if (!userId) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-sm">Évolution du solde</h2>
          {trend && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {trend.delta > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : trend.delta < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.delta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : trend.delta < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {trend.delta >= 0 ? "+" : ""}
                {trend.delta.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                {" "}
                <span className="opacity-70">
                  ({trend.pct >= 0 ? "+" : ""}
                  {trend.pct.toFixed(1)} %)
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Period selector */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
          Chargement…
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
          Aucune transaction sur cette période
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000
                  ? `${(v / 1000).toFixed(1)} k€`
                  : `${v.toFixed(0)} €`
              }
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#balanceGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
