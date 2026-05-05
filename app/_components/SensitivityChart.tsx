"use client";

import * as React from "react";
import {
  CartesianGrid,
  Label as RcLabel,
  Line,
  LineChart,
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
import { Label } from "@/components/ui/label";
import type { ScenarioResult, SensitivityRow } from "@/lib/simulate";

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

type Metric = "netValue" | "totalCost" | "months";

const METRIC_LABEL: Record<Metric, string> = {
  netValue: "Net value",
  totalCost: "Total cost",
  months: "Months to ship",
};

export function SensitivityChart({
  rows,
  scenarios,
}: {
  rows: SensitivityRow[];
  scenarios: ScenarioResult[];
}) {
  const [metric, setMetric] = React.useState<Metric>("netValue");

  const data = rows.map((r) => {
    const row: Record<string, number | null> = { complexity: r.complexity };
    for (const s of scenarios) {
      const v = r.scenarios[s.label];
      if (!v || (metric === "netValue" && (v.infeasible || v.capped))) {
        row[s.label] = null;
      } else if (metric === "netValue") {
        row[s.label] = v.netValue;
      } else if (metric === "totalCost") {
        row[s.label] = v.totalCost;
      } else {
        row[s.label] = v.months;
      }
    }
    return row;
  });

  const fmt = (v: number) =>
    metric === "months" ? `${v.toFixed(1)}` : fmtUSD(v);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensitivity to project complexity</CardTitle>
        <CardDescription>
          Hold every other input fixed and sweep complexity 1 → 10. Lines drop
          out where a scenario becomes infeasible (junior-only at high
          complexity) or doesn’t ship in 12 months.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-xs">Show:</Label>
          {(["netValue", "totalCost", "months"] as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                metric === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground hover:bg-accent"
              }`}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 12, right: 16, bottom: 16, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="complexity"
                type="number"
                domain={[1, 10]}
                ticks={Array.from({ length: 10 }, (_, i) => i + 1)}
                stroke="var(--muted-foreground)"
                fontSize={12}
              >
                <RcLabel
                  value="Project complexity"
                  position="insideBottom"
                  offset={-6}
                  fill="var(--muted-foreground)"
                  fontSize={12}
                />
              </XAxis>
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => fmt(Number(v))}
                width={90}
              />
              <Tooltip
                formatter={(v, name) => [
                  v == null ? "—" : fmt(Number(v)),
                  String(name),
                ]}
                labelFormatter={(l) => `Complexity ${l}`}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              {scenarios.map((s) => (
                <Line
                  key={s.label}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
