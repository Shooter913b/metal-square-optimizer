import type { Cut, StockOption } from "../types";
import { getEffectiveStockLength } from "../stock-length";
import { usedLength } from "./length";

export function getPlanningLength(
  stockLength: number,
  effectiveLength: number,
  considerTolerances: boolean,
): number {
  return considerTolerances ? effectiveLength : stockLength;
}

export function computeWaste(
  cuts: Cut[],
  planningLength: number,
  kerf: number,
): { usedLength: number; waste: number } {
  const consumed = usedLength(cuts, kerf);
  return {
    usedLength: consumed,
    waste: Math.max(0, planningLength - consumed),
  };
}

export function getStockPlanningLength(stock: StockOption, considerTolerances: boolean): number {
  return getEffectiveStockLength(stock, considerTolerances);
}
