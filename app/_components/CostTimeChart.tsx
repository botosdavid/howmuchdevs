"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
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
import type { Intersection, ScenarioResult } from "@/lib/simulate";

type Props = {
  scenarios: ScenarioResult[];
  intersections: Intersection[];
};

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function buildChartData(scenarios: ScenarioResult[], maxMonth: number) {
  // Sample at 0.5-month resolution from 0..maxMonth.
  const steps = Math.ceil(maxMonth * 2) + 1;
  const rows: Record<string, number>[] = [];
  for (let i = 0; i < steps; i += 1) {
    const month = Math.min(maxMonth, i / 2);
    const row: Record<string, number> = { month };
    for (const s of scenarios) {
      // Linear cost = monthlyCost * min(month, s.months)
      const t = Math.min(month, s.months);
      row[s.label] = t * s.monthlyCost;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * X-axis fits the data. Each scenario's "end" is its ship time (monthsRaw)
 * for shipping scenarios, MAX_MONTHS for infeasible ones. The window crops
 * to last end + small buffer, but extends past MAX_MONTHS when any scenario
 * actually finishes later than 12 months.
 */
function computeMaxMonth(scenarios: ScenarioResult[]): number {
  if (scenarios.length === 0) return MAX_MONTHS;
  const ends = scenarios.map((s) => {
    if (s.infeasible) return MAX_MONTHS;
    return Number.isFinite(s.monthsRaw) ? s.monthsRaw : MAX_MONTHS;
  });
  const lastEnd = Math.max(...ends);
  return Math.max(1, Math.ceil((lastEnd + 0.5) * 2) / 2);
}

export function CostTimeChart({ scenarios, intersections }: Props) {
  const maxMonth = computeMaxMonth(scenarios);
  const data = buildChartData(scenarios, maxMonth);
  const maxY = Math.max(
    ...scenarios.map((s) => s.totalCost),
    ...data.map((r) =>
      Math.max(...scenarios.map((s) => Number(r[s.label] ?? 0))),
    ),
  );
  const ticks = Array.from({ length: Math.floor(maxMonth) + 1 }, (_, i) => i);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost over time</CardTitle>
        <CardDescription>
          Cumulative project cost (USD) vs months. Lines flatten where a
          scenario has shipped; dashed segments mean the scenario hits the
          12-month cap before completion.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
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
                ticks={ticks}
                stroke="var(--muted-foreground)"
                fontSize={12}
                label={{
                  value: "Months",
                  position: "insideBottom",
                  offset: -2,
                  fill: "var(--muted-foreground)",
                  fontSize: 12,
                }}
              />
              <YAxis
                domain={[0, Math.ceil(maxY * 1.05)]}
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => fmtUSD(Number(v))}
                width={80}
              />
              <Tooltip
                content={<ChartTooltip scenarios={scenarios} />}
                cursor={{ stroke: "var(--ring)", strokeOpacity: 0.3 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => {
                  const s = scenarios.find((x) => x.label === value);
                  if (!s) return value;
                  return `${s.label} · ${fmtUSD(s.totalCost)}`;
                }}
              />
              {scenarios.map((s) => (
                <Line
                  key={s.label}
                  type="linear"
                  dataKey={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.capped ? "6 4" : undefined}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
              {intersections.map((it, i) => (
                <ReferenceDot
                  key={i}
                  x={it.month}
                  y={it.cost}
                  r={5}
                  fill="var(--foreground)"
                  stroke="var(--background)"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                  label={{
                    value: `${it.month.toFixed(1)}mo`,
                    position: "top",
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {intersections.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1">
            {intersections.map((it, i) => (
              <li key={i}>
                <span className="font-mono">{it.month.toFixed(1)} mo</span> ·{" "}
                <span className="font-mono">{fmtUSD(it.cost)}</span> — “{it.a}”
                crosses budget of “{it.b}”
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  scenarios,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  scenarios: ScenarioResult[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover text-popover-foreground p-3 shadow-md text-xs flex flex-col gap-1.5 min-w-[220px]">
      <p className="font-mono text-muted-foreground">
        Month {Number(label).toFixed(1)}
      </p>
      {payload.map((p) => {
        const s = scenarios.find((x) => x.label === p.name);
        return (
          <div key={p.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: p.color }}
                aria-hidden
              />
              <span className="truncate max-w-[120px]">{p.name}</span>
            </span>
            <span className="font-mono tabular-nums text-right">
              {fmtUSD(p.value)}
              {s && (
                <span className="block text-muted-foreground">
                  {fmtUSD(s.intelligence.blendedCostPerMtok)}/Mtok
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
