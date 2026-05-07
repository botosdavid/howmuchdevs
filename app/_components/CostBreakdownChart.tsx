"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import type { ScenarioResult } from "@/lib/simulate";

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const SEGMENTS = [
  {
    key: "salaries",
    label: "Productive salaries",
    fill: "var(--chart-senior)",
  },
  {
    key: "rework",
    label: "Rework (wasted salary)",
    fill: "var(--destructive)",
  },
  { key: "ai", label: "AI inference", fill: "var(--chart-ai)" },
  { key: "delay", label: "Cost of delay", fill: "var(--chart-junior)" },
] as const;

export function CostBreakdownChart({
  scenarios,
}: {
  scenarios: ScenarioResult[];
}) {
  const data = scenarios.map((s) => ({
    label: s.label,
    salaries: s.breakdown.salaries,
    rework: s.breakdown.rework,
    ai: s.breakdown.ai,
    delay: s.breakdown.delay,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where the money goes</CardTitle>
        <CardDescription>
          Total economic cost per scenario broken down: productive salaries,
          rework (salary spent on tokens that got reworked away), AI inference,
          and the opportunity cost of delay.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 16, bottom: 24, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={11}
                interval={0}
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => fmtUSD(Number(v))}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v, name) => [fmtUSD(Number(v)), String(name)]}
              />
              {SEGMENTS.map((seg) => (
                <Bar
                  key={seg.key}
                  dataKey={seg.key}
                  name={seg.label}
                  stackId="cost"
                  fill={seg.fill}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
          {SEGMENTS.map((seg) => (
            <li key={seg.key} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm"
                style={{ background: seg.fill }}
                aria-hidden
              />
              {seg.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
