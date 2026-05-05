/**
 * Core thesis: a token is a measurable fraction of cognitive output.
 * Every constant here is a rough but defensible average a team lead
 * can override later — see the AssumptionsDisclosure for rationale.
 */

/** Tokens of useful output an average junior dev produces per month. */
export const JUNIOR_TOKENS_PER_MONTH = 10_000_000;

/** Tokens of useful output an average senior dev produces per month. */
export const SENIOR_TOKENS_PER_MONTH = 30_000_000;

/**
 * AI as a multiplier on a developer's effective throughput. Juniors
 * benefit more in relative terms (autocomplete, scaffolding, debugging).
 */
export const AI_MULTIPLIER = {
  junior: 1.6,
  senior: 1.25,
} as const;

/**
 * Quality factor — fraction of produced tokens that survive review and
 * actually count toward shipping. Juniors generate more rework; seniors
 * approach the ceiling. Salary is paid for ALL tokens — wasted ones
 * become "rework cost".
 */
export const QUALITY_FACTOR = {
  junior: 0.7,
  senior: 0.95,
} as const;

/**
 * Above this complexity level a project requires real architectural
 * judgement: at least one senior is mandatory. Junior-only teams are
 * flagged "infeasible" beyond this threshold.
 */
export const SENIOR_REQUIRED_FROM_COMPLEXITY = 8;

/**
 * In modern dev practice every developer uses AI continuously.
 * This is the inference token volume each dev consumes per month
 * across IDE, agents, and chat. 70% prompt / 30% completion split.
 */
export const AI_TOKENS_PER_DEV_MONTH = 20_000_000;
export const AI_PROMPT_RATIO = 0.7;
export const AI_COMPLETION_RATIO = 0.3;

/**
 * Project complexity (1–10) → total tokens of cognitive work to ship.
 * Roughly: 1 = small script, 5 = mid SaaS feature, 10 = large platform.
 */
export const COMPLEXITY_TOKENS: Record<number, number> = {
  1: 5_000_000,
  2: 15_000_000,
  3: 35_000_000,
  4: 70_000_000,
  5: 120_000_000,
  6: 180_000_000,
  7: 250_000_000,
  8: 330_000_000,
  9: 420_000_000,
  10: 500_000_000,
};

/** Project simulation horizon. Scenarios that overrun are flagged "capped". */
export const MAX_MONTHS = 12;

/**
 * Curated set of currently popular models (May 2026). We prefix-match
 * against OpenRouter ids so minor version bumps don't break the list.
 */
export const POPULAR_MODEL_PREFIXES: readonly string[] = [
  "openai/gpt-4o",
  "openai/gpt-4.1",
  "openai/o3",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-opus-4",
  "anthropic/claude-haiku-4",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3",
  "deepseek/deepseek-v3",
  "deepseek/deepseek-r1",
  "mistralai/mistral-large",
  "x-ai/grok-2",
];

/** Defaults used to prune URL search params (only non-defaults are written). */
export const DEFAULTS = {
  juniorPay: 5_000,
  seniorPay: 12_000,
  complexity: 5,
  teamSize: 4,
  modelId: "anthropic/claude-sonnet-4.6",
  /** USD value the project delivers once shipped. */
  projectValue: 300_000,
  /** USD opportunity cost per month of delay. */
  delayCostPerMonth: 10_000,
} as const;

export type Inputs = {
  juniorPay: number;
  seniorPay: number;
  complexity: number;
  teamSize: number;
  modelId: string;
  projectValue: number;
  delayCostPerMonth: number;
};

/** Visual identity shared between Intelligence Panel and Chart. */
export const SCENARIO_COLORS = {
  junior: "var(--chart-junior)",
  senior: "var(--chart-senior)",
  ai: "var(--chart-ai)",
  baseline: "var(--chart-baseline)",
} as const;
