import { headers } from "next/headers";
import { Calculator } from "./_components/Calculator";
import { TAB_KEYS, type TabKey } from "@/lib/tabs";
import { DEFAULTS, type Inputs } from "@/lib/constants";
import type { ModelInfo } from "@/lib/simulate";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FALLBACK_MODELS: ModelInfo[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (fallback pricing)",
    vendor: "openai",
    promptPrice: 0.0000025,
    completionPrice: 0.00001,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4 (fallback pricing)",
    vendor: "anthropic",
    promptPrice: 0.000003,
    completionPrice: 0.000015,
  },
];

async function fetchModels(): Promise<ModelInfo[]> {
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (!host) return FALLBACK_MODELS;
    const res = await fetch(`${proto}://${host}/api/models`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_MODELS;
    const json = (await res.json()) as { models?: ModelInfo[] };
    return json.models?.length ? json.models : FALLBACK_MODELS;
  } catch {
    return FALLBACK_MODELS;
  }
}

function readNumber(
  v: string | string[] | undefined,
  fallback: number,
): number {
  if (typeof v !== "string") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function readString(
  v: string | string[] | undefined,
  fallback: string,
): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const models = await fetchModels();

  const requestedModelId = readString(sp.m, DEFAULTS.modelId);
  const resolvedModelId =
    models.find((m) => m.id === requestedModelId)?.id ??
    models.find((m) => m.id.startsWith(requestedModelId))?.id ??
    models[0]?.id ??
    DEFAULTS.modelId;

  const initial: Inputs = {
    juniorPay: readNumber(sp.jp, DEFAULTS.juniorPay),
    seniorPay: readNumber(sp.sp, DEFAULTS.seniorPay),
    complexity: readNumber(sp.cx, DEFAULTS.complexity),
    teamSize: readNumber(sp.ts, DEFAULTS.teamSize),
    modelId: resolvedModelId,
    projectValue: readNumber(sp.pv, DEFAULTS.projectValue),
    delayCostPerMonth: readNumber(sp.dc, DEFAULTS.delayCostPerMonth),
  };

  const requestedTab = readString(sp.tab, "cost");
  const initialTab: TabKey = (TAB_KEYS as readonly string[]).includes(
    requestedTab,
  )
    ? (requestedTab as TabKey)
    : "cost";

  return (
    <main className="flex flex-col flex-1 w-full">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            How Much Devs
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            One token is a fraction of intelligence.
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">
              See what each one costs you.
            </span>
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Treat tokens as a unit of cognitive output. Then compare what a
            junior dev, a senior dev, and your AI tooling each charge per
            million tokens — and how that adds up over a real project.
          </p>
        </header>

        <Calculator
          initialInputs={initial}
          initialTab={initialTab}
          models={models}
        />
      </div>
    </main>
  );
}
