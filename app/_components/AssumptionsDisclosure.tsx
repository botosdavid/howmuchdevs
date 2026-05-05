import {
  AI_MULTIPLIER,
  AI_TOKENS_PER_DEV_MONTH,
  COMPLEXITY_TOKENS,
  JUNIOR_TOKENS_PER_MONTH,
  MAX_MONTHS,
  SENIOR_TOKENS_PER_MONTH,
} from "@/lib/constants";

const M = 1_000_000;

const ROWS: { label: string; value: string; rationale: string }[] = [
  {
    label: "Junior throughput",
    value: `${JUNIOR_TOKENS_PER_MONTH / M} Mtok/month`,
    rationale:
      "Average useful cognitive output of a junior developer in a normal month — code, design, comms, decisions.",
  },
  {
    label: "Senior throughput",
    value: `${SENIOR_TOKENS_PER_MONTH / M} Mtok/month`,
    rationale:
      "Seniors compress more meaning per token via better abstractions, fewer rewrites, and higher-leverage decisions.",
  },
  {
    label: "AI multiplier — junior",
    value: `×${AI_MULTIPLIER.junior}`,
    rationale:
      "Juniors gain more relative throughput from AI tooling (autocomplete, scaffolding, debugging assist).",
  },
  {
    label: "AI multiplier — senior",
    value: `×${AI_MULTIPLIER.senior}`,
    rationale:
      "Seniors gain less relative leverage; they were already operating near the top of their context window.",
  },
  {
    label: "AI tokens per dev / month",
    value: `${AI_TOKENS_PER_DEV_MONTH / M} Mtok`,
    rationale:
      "Inference volume each developer consumes monthly across IDE, agents and chat. 70% prompt / 30% completion.",
  },
  {
    label: "Complexity → project tokens",
    value: `${COMPLEXITY_TOKENS[1] / M}–${COMPLEXITY_TOKENS[10] / M} Mtok`,
    rationale:
      "Total tokens of cognitive work to ship — from a small script (1) to a large platform (10).",
  },
  {
    label: "Time horizon",
    value: `${MAX_MONTHS} months`,
    rationale:
      "Scenarios that overrun this horizon are flagged 'capped' — a signal to grow the team or cut scope.",
  },
];

export function AssumptionsDisclosure() {
  return (
    <details className="group rounded-xl border bg-card text-card-foreground">
      <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between gap-4 text-sm font-medium">
        <span>How we value a token</span>
        <span
          aria-hidden
          className="text-muted-foreground transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="px-6 pb-6 pt-0 flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          These are calibrated defaults, not laws of physics. Treat them as a
          shared starting point for arguing about team composition.
        </p>
        <dl className="grid grid-cols-1 gap-3">
          {ROWS.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[10rem_1fr] gap-3 border-t pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-col">
                <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {r.label}
                </dt>
                <dd className="font-semibold tabular-nums">{r.value}</dd>
              </div>
              <p className="text-muted-foreground">{r.rationale}</p>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
