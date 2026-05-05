"use client";

import {
  CartesianGrid,
  Label as RcLabel,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MAX_MONTHS } from "@/lib/constants";
import type { ScenarioResult } from "@/lib/simulate";

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export function NetValueChart({ scenarios }: { scenarios: ScenarioResult[] }) {
  // Flex X-axis: each scenario's "end" is its ship month (monthsRaw) or
  // MAX_MONTHS for infeasible ones. Crop to last end + small buffer,
  // extending past MAX_MONTHS when anything ships later than 12 months.
  const ends = scenarios.map((s) =>
    s.infeasible || !Number.isFinite(s.monthsRaw) ? MAX_MONTHS : s.monthsRaw,
  );
  const lastEnd = ends.length > 0 ? Math.max(...ends) : MAX_MONTHS;
  const maxMonth = Math.max(1, Math.ceil((lastEnd + 0.5) * 2) / 2);

  // Sample net value at half-month intervals for smooth lines including the ship-month jump.
  const stepCount = Math.ceil(maxMonth * 2) + 1;
  const samples = Array.from({ length: stepCount }, (_, i) =>
    Math.min(maxMonth, i / 2),
  );
  const rows = samples.map((m) => {
    const row: Record<string, number | null> = { month: m };
    for (const s of scenarios) {
      // Walk netSeries (sorted asc by month) and pick the latest entry with month <= m.
      let val: number | null = null;
      for (const p of s.netSeries) {
        if (p.month <= m) val = p.netValue;
        else break;
      }
      row[s.label] = val;
    }
    return row;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net economic value over time</CardTitle>
        <CardDescription>
          Cumulative spend (plus the cost of delay) drags every scenario into
          the red until it ships and the project value lands. The line that ends
          highest <em>and</em> earliest is the right call. Below zero = you’re
          still under water.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows}
              margin={{ top: 12, right: 16, bottom: 16, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="month"
                type="number"
                domain={[0, maxMonth]}
                ticks={Array.from(
                  { length: Math.floor(maxMonth) + 1 },
                  (_, i) => i,
                )}
                stroke="var(--muted-foreground)"
                fontSize={12}
              >
                <RcLabel
                  value="Months"
                  position="insideBottom"
                  offset={-6}
                  fill="var(--muted-foreground)"
                  fontSize={12}
                />
              </XAxis>
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => fmtUSD(Number(v))}
                width={90}
              />
              <ReferenceLine
                y={0}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 4"
              />
              <Tooltip content={<NetTooltip />} />
              {scenarios.map((s) => (
                <Line
                  key={s.label}
                  type="linear"
                  dataKey={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeDasharray={s.infeasible || s.capped ? "6 4" : undefined}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
          {scenarios.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: s.color }}
                  aria-hidden
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {s.infeasible
                  ? "infeasible"
                  : s.capped
                    ? "doesn’t ship"
                    : `net ${fmtUSD(s.netValue ?? 0)} @ ${s.months.toFixed(1)} mo`}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function NetTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover text-popover-foreground p-3 shadow-md text-xs flex flex-col gap-1.5 min-w-[220px]">
      <p className="font-mono text-muted-foreground">
        Month {Number(label).toFixed(1)}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 max-w-[140px]">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="truncate">{p.name}</span>
          </span>
          <span className="font-mono tabular-nums text-right">
            {fmtUSD(p.value)}
            <span className="block text-muted-foreground">
              {p.value >= 0 ? "in the green" : "in the red"}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
