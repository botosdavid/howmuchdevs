import {
  AI_COMPLETION_RATIO,
  AI_MULTIPLIER,
  AI_PROMPT_RATIO,
  AI_TOKENS_PER_DEV_MONTH,
  COMPLEXITY_TOKENS,
  JUNIOR_TOKENS_PER_MONTH,
  MAX_MONTHS,
  QUALITY_FACTOR,
  SCENARIO_COLORS,
  SENIOR_REQUIRED_FROM_COMPLEXITY,
  SENIOR_TOKENS_PER_MONTH,
  type Inputs,
} from "./constants";

export type ModelInfo = {
  id: string;
  name: string;
  vendor: string;
  /** USD per token. */
  promptPrice: number;
  /** USD per token. */
  completionPrice: number;
};

export type ScenarioInput = {
  label: string;
  juniors: number;
  seniors: number;
  useAI: boolean;
  color: string;
};

export type ScenarioResult = {
  label: string;
  color: string;
  juniors: number;
  seniors: number;
  useAI: boolean;
  monthlySalary: number;
  monthlyAICost: number;
  monthlyCost: number;
  /** Tokens produced before quality/rework. */
  rawTokensPerMonth: number;
  /** Tokens that actually count toward shipping (after quality factor). */
  effectiveTokensPerMonth: number;
  totalProjectTokens: number;
  monthsRaw: number;
  months: number;
  capped: boolean;
  infeasible: boolean;
  totalCost: number;
  reworkCost: number;
  delayCost: number;
  /** projectValue − totalCost − delayCost (null when infeasible / capped). */
  netValue: number | null;
  breakdown: {
    salaries: number;
    ai: number;
    rework: number;
    delay: number;
  };
  series: { month: number; cost: number }[];
  /** Net-value time series for the NetValueChart. */
  netSeries: { month: number; netValue: number }[];
  intelligence: {
    juniorCostPerMtok: number | null;
    seniorCostPerMtok: number | null;
    aiCostPerMtok: number | null;
    blendedCostPerMtok: number;
  };
};

export type Intersection = {
  a: string;
  b: string;
  month: number;
  cost: number;
};

const M = 1_000_000;

export function blendedAITokenPrice(model: ModelInfo): number {
  return (
    model.promptPrice * AI_PROMPT_RATIO +
    model.completionPrice * AI_COMPLETION_RATIO
  );
}

function roleCostPerMtok(monthlyPay: number, tokensPerMonth: number) {
  if (tokensPerMonth <= 0) return null;
  return (monthlyPay / tokensPerMonth) * M;
}

export function simulateScenario(
  scenario: ScenarioInput,
  inputs: Inputs,
  model: ModelInfo,
): ScenarioResult {
  const { juniors, seniors, useAI } = scenario;
  const devs = juniors + seniors;

  const jMul = useAI ? AI_MULTIPLIER.junior : 1;
  const sMul = useAI ? AI_MULTIPLIER.senior : 1;

  const juniorRaw = juniors * JUNIOR_TOKENS_PER_MONTH * jMul;
  const seniorRaw = seniors * SENIOR_TOKENS_PER_MONTH * sMul;
  const rawTokensPerMonth = juniorRaw + seniorRaw;

  // Quality factor: only a fraction of produced tokens survives rework.
  const effectiveTokensPerMonth =
    juniorRaw * QUALITY_FACTOR.junior + seniorRaw * QUALITY_FACTOR.senior;

  const monthlySalary = juniors * inputs.juniorPay + seniors * inputs.seniorPay;
  const aiPricePerToken = blendedAITokenPrice(model);
  const monthlyAICost = useAI
    ? devs * AI_TOKENS_PER_DEV_MONTH * aiPricePerToken
    : 0;
  const monthlyCost = monthlySalary + monthlyAICost;

  // Complexity ceiling: very complex projects need at least one senior.
  const infeasible =
    inputs.complexity >= SENIOR_REQUIRED_FROM_COMPLEXITY && seniors === 0;

  const totalProjectTokens = COMPLEXITY_TOKENS[inputs.complexity] ?? 0;
  const monthsRaw =
    !infeasible && effectiveTokensPerMonth > 0
      ? totalProjectTokens / effectiveTokensPerMonth
      : Infinity;

  const capped = monthsRaw > MAX_MONTHS;
  // Capped scenarios still ship — just past the 12-mo planning horizon.
  // Infeasible scenarios genuinely never ship; clamp them to MAX_MONTHS for display.
  const months = infeasible ? MAX_MONTHS : monthsRaw;

  const series: { month: number; cost: number }[] = [{ month: 0, cost: 0 }];
  const last = Math.ceil(months);
  for (let m = 1; m <= last; m += 1) {
    const t = Math.min(m, months);
    series.push({ month: t, cost: t * monthlyCost });
  }
  if (series[series.length - 1].month !== months) {
    series.push({ month: months, cost: months * monthlyCost });
  }

  const totalCost = months * monthlyCost;

  const reworkRatio =
    rawTokensPerMonth > 0 ? 1 - effectiveTokensPerMonth / rawTokensPerMonth : 0;
  const reworkCost = monthlySalary * months * reworkRatio;
  const productiveSalary = monthlySalary * months - reworkCost;
  const aiCostTotal = monthlyAICost * months;
  const delayCost = months * inputs.delayCostPerMonth;

  const shipped = !infeasible;
  const netValue = shipped ? inputs.projectValue - totalCost - delayCost : null;

  // Net-value series: under-water until ship, then jumps up by projectValue.
  // Horizon extends past MAX_MONTHS for capped scenarios so the chart can
  // show their actual ship time.
  const netSeries: { month: number; netValue: number }[] = [];
  const burnPerMonth = monthlyCost + inputs.delayCostPerMonth;
  const finalNet = shipped ? inputs.projectValue - totalCost - delayCost : null;
  const horizon = Math.max(MAX_MONTHS, Math.ceil(months));
  for (let m = 0; m <= horizon; m += 1) {
    if (shipped && m >= Math.ceil(months)) {
      netSeries.push({ month: m, netValue: finalNet ?? 0 });
    } else if (shipped && m + 1 > months && m < months) {
      // We are inside the ship month: emit the underwater point then the jump.
      netSeries.push({ month: m, netValue: -burnPerMonth * m });
    } else {
      netSeries.push({ month: m, netValue: -burnPerMonth * m });
    }
  }
  // Insert the exact ship-month transition for a clean step.
  if (shipped) {
    netSeries.push({ month: months, netValue: -burnPerMonth * months });
    netSeries.push({ month: months, netValue: finalNet ?? 0 });
    netSeries.sort((a, b) => a.month - b.month);
  }

  const juniorCostPerMtok = roleCostPerMtok(
    inputs.juniorPay,
    JUNIOR_TOKENS_PER_MONTH * jMul * QUALITY_FACTOR.junior,
  );
  const seniorCostPerMtok = roleCostPerMtok(
    inputs.seniorPay,
    SENIOR_TOKENS_PER_MONTH * sMul * QUALITY_FACTOR.senior,
  );
  const aiCostPerMtok = useAI ? aiPricePerToken * M : null;

  const blendedCostPerMtok =
    effectiveTokensPerMonth > 0
      ? (monthlyCost / effectiveTokensPerMonth) * M
      : 0;

  return {
    label: scenario.label,
    color: scenario.color,
    juniors,
    seniors,
    useAI,
    monthlySalary,
    monthlyAICost,
    monthlyCost,
    rawTokensPerMonth,
    effectiveTokensPerMonth,
    totalProjectTokens,
    monthsRaw,
    months,
    capped,
    infeasible,
    totalCost,
    reworkCost,
    delayCost,
    netValue,
    breakdown: {
      salaries: productiveSalary,
      ai: aiCostTotal,
      rework: reworkCost,
      delay: delayCost,
    },
    series,
    netSeries,
    intelligence: {
      juniorCostPerMtok,
      seniorCostPerMtok,
      aiCostPerMtok,
      blendedCostPerMtok,
    },
  };
}

export function buildScenarios(
  inputs: Inputs,
  model: ModelInfo,
): ScenarioResult[] {
  const team = Math.max(1, inputs.teamSize);
  const half = Math.max(1, Math.floor(team / 2));
  const presets: ScenarioInput[] = [
    {
      label: "All juniors + AI",
      juniors: team,
      seniors: 0,
      useAI: true,
      color: SCENARIO_COLORS.junior,
    },
    {
      label: "All seniors + AI",
      juniors: 0,
      seniors: team,
      useAI: true,
      color: SCENARIO_COLORS.senior,
    },
    {
      label: "Mixed team + AI",
      juniors: team - half,
      seniors: half,
      useAI: true,
      color: SCENARIO_COLORS.ai,
    },
  ];
  return presets.map((s) => simulateScenario(s, inputs, model));
}

/**
 * Linear analytic intersection between two cumulative-cost series.
 * Both series are piecewise-linear in month; for our model each
 * scenario is essentially a single line through the origin with
 * slope = monthlyCost, so we solve directly.
 */
export function findIntersections(scenarios: ScenarioResult[]): Intersection[] {
  const out: Intersection[] = [];
  for (let i = 0; i < scenarios.length; i += 1) {
    for (let j = i + 1; j < scenarios.length; j += 1) {
      const a = scenarios[i];
      const b = scenarios[j];
      // y_a = monthlyCost_a * m, y_b = monthlyCost_b * m
      // They only meet at m=0 unless slopes are equal — skip the trivial origin.
      // The interesting intersection in this app is between the *project completion*
      // points: when scenario A finishes earlier but at higher monthly burn vs B
      // finishing later cheaper. We compare their (months, totalCost) endpoints
      // and report which delivers the same project for a given budget threshold.
      // For piecewise lines through origin, intersection of two segments only
      // happens if one finishes at lower cost and same month — degenerate.
      // Instead, surface the *crossover budget*: the cost at which the slower
      // (cheaper monthly) scenario reaches what the faster spent in total.
      if (a.totalCost === b.totalCost) continue;
      const cheaper = a.monthlyCost < b.monthlyCost ? a : b;
      const pricier = cheaper === a ? b : a;
      // Months for cheaper to reach pricier.totalCost
      if (cheaper.monthlyCost <= 0) continue;
      const month = pricier.totalCost / cheaper.monthlyCost;
      if (month <= 0 || month > MAX_MONTHS) continue;
      // Only meaningful if both scenarios are still "in flight" at that month
      if (month > Math.max(cheaper.months, pricier.months)) continue;
      out.push({
        a: a.label,
        b: b.label,
        month,
        cost: pricier.totalCost,
      });
    }
  }
  return out;
}

/**
 * Sweep project complexity 1..10 with all other inputs fixed; return one
 * row per complexity with each scenario's outcomes. Used by SensitivityChart.
 */
export type SensitivityRow = {
  complexity: number;
  scenarios: Record<
    string,
    {
      months: number;
      totalCost: number;
      netValue: number | null;
      infeasible: boolean;
      capped: boolean;
    }
  >;
};

export function sweepComplexity(
  inputs: Inputs,
  model: ModelInfo,
): SensitivityRow[] {
  const rows: SensitivityRow[] = [];
  for (let c = 1; c <= 10; c += 1) {
    const presets = buildScenarios({ ...inputs, complexity: c }, model);
    const scenarios: SensitivityRow["scenarios"] = {};
    for (const s of presets) {
      scenarios[s.label] = {
        months: s.months,
        totalCost: s.totalCost,
        netValue: s.netValue,
        infeasible: s.infeasible,
        capped: s.capped,
      };
    }
    rows.push({ complexity: c, scenarios });
  }
  return rows;
}
