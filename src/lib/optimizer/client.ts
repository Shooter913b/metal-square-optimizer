import type { DemandItem, OptimizeOptions, OptimizeResult, StockOption } from "../types";
import { OptimizationError } from "../validation";

export async function optimize(
  demands: DemandItem[],
  stocks: StockOption[],
  options: OptimizeOptions,
): Promise<OptimizeResult> {
  const response = await fetch("/api/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ demands, stocks, options }),
  });

  const payload = (await response.json()) as OptimizeResult | { message: string };

  if (!response.ok) {
    throw new OptimizationError(
      "message" in payload ? payload.message : "Optimization request failed.",
    );
  }

  return payload as OptimizeResult;
}
