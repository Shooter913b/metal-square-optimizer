import type { DemandItem, OptimizeOptions, OptimizeResult, StockOption } from "../types";
import { OptimizationError } from "../validation";
import { optimizeHeuristic } from "./heuristic";

export { usedLength, remainingSpace, fitsPiece } from "./length";
export { optimizeHeuristic } from "./heuristic";
export { generateCuttingPatterns } from "./patterns";
export type { PatternGenerationResult } from "./patterns";

export async function runOptimizeLocal(
  demands: DemandItem[],
  stocks: StockOption[],
  options: OptimizeOptions,
): Promise<OptimizeResult> {
  if (options.mode === "optimal") {
    const { optimizeWithIlp } = await import("./ilp");
    return optimizeWithIlp(demands, stocks, options.kerf, options.considerTolerances);
  }

  return optimizeHeuristic(demands, stocks, options.kerf, options.considerTolerances);
}

export async function optimize(
  demands: DemandItem[],
  stocks: StockOption[],
  options: OptimizeOptions,
): Promise<OptimizeResult> {
  if (typeof window === "undefined") {
    return runOptimizeLocal(demands, stocks, options);
  }

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
