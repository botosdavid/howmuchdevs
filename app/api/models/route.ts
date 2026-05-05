import { NextResponse } from "next/server";
import { POPULAR_MODEL_PREFIXES } from "@/lib/constants";

export const revalidate = 3600;

type OpenRouterModel = {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
};

type Normalized = {
  id: string;
  name: string;
  vendor: string;
  promptPrice: number;
  completionPrice: number;
};

function matchesAllowList(id: string) {
  return POPULAR_MODEL_PREFIXES.some((p) => id.startsWith(p));
}

export async function GET() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter responded ${res.status}` },
        { status: 502 },
      );
    }
    const json = (await res.json()) as { data?: OpenRouterModel[] };
    const data = json.data ?? [];

    const seen = new Set<string>();
    const normalized: Normalized[] = [];

    for (const m of data) {
      if (!m.id || !matchesAllowList(m.id)) continue;
      // Dedupe by prefix family — keep first match per family.
      const family = POPULAR_MODEL_PREFIXES.find((p) => m.id.startsWith(p))!;
      if (seen.has(family)) continue;
      seen.add(family);

      const promptPrice = Number(m.pricing?.prompt ?? "0");
      const completionPrice = Number(m.pricing?.completion ?? "0");
      if (!Number.isFinite(promptPrice) || !Number.isFinite(completionPrice)) {
        continue;
      }
      const [vendor] = m.id.split("/");
      normalized.push({
        id: m.id,
        name: m.name ?? m.id,
        vendor: vendor ?? "unknown",
        promptPrice,
        completionPrice,
      });
    }

    normalized.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ models: normalized });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
