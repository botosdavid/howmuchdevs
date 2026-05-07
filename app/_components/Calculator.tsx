"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULTS, type Inputs } from "@/lib/constants";
import { TAB_KEYS, TAB_LABELS, type TabKey } from "@/lib/tabs";
import {
  buildScenarios,
  findIntersections,
  sweepComplexity,
  type ModelInfo,
} from "@/lib/simulate";
import { IntelligenceValuePanel } from "./IntelligenceValuePanel";
import { CostTimeChart } from "./CostTimeChart";
import { NetValueChart } from "./NetValueChart";
import { SensitivityChart } from "./SensitivityChart";
import { CostBreakdownChart } from "./CostBreakdownChart";
import { AssumptionsDisclosure } from "./AssumptionsDisclosure";

type Props = {
  initialInputs: Inputs;
  initialTab: TabKey;
  models: ModelInfo[];
};

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

function buildSearchParams(inputs: Inputs, tab: TabKey): string {
  const sp = new URLSearchParams();
  if (inputs.juniorPay !== DEFAULTS.juniorPay)
    sp.set("jp", String(inputs.juniorPay));
  if (inputs.seniorPay !== DEFAULTS.seniorPay)
    sp.set("sp", String(inputs.seniorPay));
  if (inputs.complexity !== DEFAULTS.complexity)
    sp.set("cx", String(inputs.complexity));
  if (inputs.teamSize !== DEFAULTS.teamSize)
    sp.set("ts", String(inputs.teamSize));
  if (inputs.modelId !== DEFAULTS.modelId) sp.set("m", inputs.modelId);
  if (inputs.projectValue !== DEFAULTS.projectValue)
    sp.set("pv", String(inputs.projectValue));
  if (inputs.delayCostPerMonth !== DEFAULTS.delayCostPerMonth)
    sp.set("dc", String(inputs.delayCostPerMonth));
  if (tab !== "cost") sp.set("tab", tab);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function Calculator({ initialInputs, initialTab, models }: Props) {
  const router = useRouter();
  const [inputs, setInputs] = React.useState<Inputs>(initialInputs);
  const [tab, setTab] = React.useState<TabKey>(initialTab);
  const [, startTransition] = React.useTransition();

  const update = React.useCallback((patch: Partial<Inputs>) => {
    setInputs((prev) => ({ ...prev, ...patch }));
  }, []);

  React.useEffect(() => {
    startTransition(() => {
      router.replace(`/${buildSearchParams(inputs, tab)}`, { scroll: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, tab]);

  const selectedModel = React.useMemo(
    () => models.find((m) => m.id === inputs.modelId) ?? models[0],
    [models, inputs.modelId],
  );

  const scenarios = React.useMemo(
    () => buildScenarios(inputs, selectedModel),
    [inputs, selectedModel],
  );
  const intersections = React.useMemo(
    () => findIntersections(scenarios),
    [scenarios],
  );

  const sensitivity = React.useMemo(
    () => sweepComplexity(inputs, selectedModel),
    [inputs, selectedModel],
  );

  const allCapped = scenarios.every((s) => s.capped);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Inputs — sticky on lg+ */}
        <Card className="lg:sticky lg:top-4 self-start">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>
              All amounts in USD. Defaults are typical Western-Europe averages.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <FieldSlider
              label="Junior dev pay"
              suffix={`${fmtUSD(inputs.juniorPay)}/mo`}
              value={inputs.juniorPay}
              min={1000}
              max={15000}
              step={250}
              onChange={(juniorPay) => update({ juniorPay })}
            />
            <FieldSlider
              label="Senior dev pay"
              suffix={`${fmtUSD(inputs.seniorPay)}/mo`}
              value={inputs.seniorPay}
              min={3000}
              max={30000}
              step={500}
              onChange={(seniorPay) => update({ seniorPay })}
            />
            <FieldSlider
              label="Project complexity"
              suffix={`${inputs.complexity} / 10`}
              value={inputs.complexity}
              min={1}
              max={10}
              step={1}
              onChange={(complexity) => update({ complexity })}
            />
            <FieldSlider
              label="Team size"
              suffix={`${inputs.teamSize} dev${inputs.teamSize === 1 ? "" : "s"}`}
              value={inputs.teamSize}
              min={1}
              max={20}
              step={1}
              onChange={(teamSize) => update({ teamSize })}
            />
            <FieldSlider
              label="Project value when shipped"
              suffix={fmtUSD(inputs.projectValue)}
              value={inputs.projectValue}
              min={50_000}
              max={2_000_000}
              step={25_000}
              onChange={(projectValue) => update({ projectValue })}
            />
            <FieldSlider
              label="Cost of delay"
              suffix={`${fmtUSD(inputs.delayCostPerMonth)}/mo`}
              value={inputs.delayCostPerMonth}
              min={0}
              max={100_000}
              step={2_500}
              onChange={(delayCostPerMonth) => update({ delayCostPerMonth })}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="model-select">AI model</Label>
              <Select
                value={inputs.modelId}
                onValueChange={(modelId) => update({ modelId })}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel && (
                <p className="text-xs text-muted-foreground font-mono">
                  ${(selectedModel.promptPrice * 1_000_000).toFixed(2)}/Mtok in
                  · ${(selectedModel.completionPrice * 1_000_000).toFixed(2)}
                  /Mtok out
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Headline + tabbed charts */}
        <div className="flex flex-col gap-6 min-w-0">
          <IntelligenceValuePanel
            inputs={inputs}
            model={selectedModel}
            scenarios={scenarios}
          />

          {allCapped && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-4 text-sm">
                <strong className="text-destructive">Heads up:</strong> every
                scenario hits the 12-month cap. Lower complexity or grow the
                team to see meaningful crossovers.
              </CardContent>
            </Card>
          )}

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabKey)}
            className="min-w-0"
          >
            <TabsList>
              {TAB_KEYS.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {TAB_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="min-h-[480px]">
              <TabsContent value="cost">
                <CostTimeChart
                  scenarios={scenarios}
                  intersections={intersections}
                />
              </TabsContent>
              <TabsContent value="net">
                <NetValueChart scenarios={scenarios} />
              </TabsContent>
              <TabsContent value="sensitivity">
                <SensitivityChart rows={sensitivity} scenarios={scenarios} />
              </TabsContent>
              <TabsContent value="breakdown">
                <CostBreakdownChart scenarios={scenarios} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <AssumptionsDisclosure />
    </div>
  );
}

function FieldSlider({
  label,
  suffix,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label>{label}</Label>
        <span className="text-sm font-mono text-muted-foreground">
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}
