"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SCENARIO_COLORS, type Inputs } from "@/lib/constants";
import {
  blendedAITokenPrice,
  type ModelInfo,
  type ScenarioResult,
} from "@/lib/simulate";
import {
  AI_MULTIPLIER,
  AI_TOKENS_PER_DEV_MONTH,
  JUNIOR_TOKENS_PER_MONTH,
  SENIOR_TOKENS_PER_MONTH,
} from "@/lib/constants";

const M = 1_000_000;
const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
const fmtMtok = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 1 });

type Props = {
  inputs: Inputs;
  model: ModelInfo;
  scenarios: ScenarioResult[];
};

export function IntelligenceValuePanel({ inputs, model, scenarios }: Props) {
  // Effective tokens/month assuming AI assistance (the realistic case).
  const juniorTokens = JUNIOR_TOKENS_PER_MONTH * AI_MULTIPLIER.junior;
  const seniorTokens = SENIOR_TOKENS_PER_MONTH * AI_MULTIPLIER.senior;
  const juniorCostPerMtok = (inputs.juniorPay / juniorTokens) * M;
  const seniorCostPerMtok = (inputs.seniorPay / seniorTokens) * M;
  const aiPerToken = blendedAITokenPrice(model);
  const aiCostPerMtok = aiPerToken * M;

  // Pick the "Mixed team + AI" scenario for the headline blended figure.
  const headline =
    scenarios.find((s) => s.label.startsWith("Mixed")) ?? scenarios[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligence value</CardTitle>
        <CardDescription>
          Cost per million tokens of useful cognitive output, with AI in the
          loop.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Stat
          color={SCENARIO_COLORS.junior}
          label="Junior dev"
          headline={`${fmtUSD(juniorCostPerMtok)}/Mtok`}
          rows={[
            ["Salary", `${fmtUSD(inputs.juniorPay)}/mo`],
            ["Throughput", `${fmtMtok(juniorTokens / M)} Mtok/mo`],
            ["AI multiplier", `×${AI_MULTIPLIER.junior}`],
          ]}
        />
        <Stat
          color={SCENARIO_COLORS.senior}
          label="Senior dev"
          headline={`${fmtUSD(seniorCostPerMtok)}/Mtok`}
          rows={[
            ["Salary", `${fmtUSD(inputs.seniorPay)}/mo`],
            ["Throughput", `${fmtMtok(seniorTokens / M)} Mtok/mo`],
            ["AI multiplier", `×${AI_MULTIPLIER.senior}`],
          ]}
        />
        <Stat
          color={SCENARIO_COLORS.ai}
          label={model.name}
          headline={`${fmtUSD(aiCostPerMtok)}/Mtok`}
          rows={[
            ["Prompt", `${fmtUSD(model.promptPrice * M)}/Mtok`],
            ["Completion", `${fmtUSD(model.completionPrice * M)}/Mtok`],
            [
              "Per-dev usage",
              `${fmtMtok(AI_TOKENS_PER_DEV_MONTH / M)} Mtok/mo`,
            ],
          ]}
        />
      </CardContent>
      {headline && (
        <CardContent>
          <div
            className="rounded-lg border border-dashed p-4 flex flex-col gap-1"
            style={{ borderColor: headline.color }}
          >
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Blended scenario · {headline.label}
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {fmtUSD(headline.intelligence.blendedCostPerMtok)}/Mtok
            </p>
            <p className="text-sm text-muted-foreground">
              {headline.juniors} junior · {headline.seniors} senior ·{" "}
              {headline.useAI ? "with AI" : "no AI"} · ships in{" "}
              {headline.months.toFixed(1)} mo for {fmtUSD(headline.totalCost)}
              {headline.capped && " (capped at 12 mo)"}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Stat({
  color,
  label,
  headline,
  rows,
}: {
  color: string;
  label: string;
  headline: string;
  rows: [string, string][];
}) {
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </p>
      </div>
      <p className="text-xl font-semibold tabular-nums">{headline}</p>
      <dl className="text-xs flex flex-col gap-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
