export const TAB_KEYS = ["cost", "net", "sensitivity", "breakdown"] as const;

export type TabKey = (typeof TAB_KEYS)[number];

export const TAB_LABELS: Record<TabKey, string> = {
  cost: "Cost over time",
  net: "Net value",
  sensitivity: "Sensitivity",
  breakdown: "Breakdown",
};
