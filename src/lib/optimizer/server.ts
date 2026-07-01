import "server-only";

import type { DemandItem, OptimizeOptions, OptimizeResult, StockOption } from "../types";
import { optimizeHeuristic } from "./heuristic";

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
