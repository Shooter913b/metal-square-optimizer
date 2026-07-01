import type { Cut, StockUsage } from "../types";
import { OptimizationError } from "../validation";
import { fitsInStock } from "../validation";
import { getPlanningLength } from "./plan-length";

export function assertCutsFitStock(
  cuts: Cut[],
  stockLength: number,
  effectiveLength: number,
  kerf: number,
  considerTolerances: boolean,
  label: string,
): void {
  const planningLength = getPlanningLength(stockLength, effectiveLength, considerTolerances);
  if (!fitsInStock(cuts, planningLength, kerf)) {
    throw new OptimizationError(
      `Invalid cut plan for ${label}: cuts exceed usable stock length (${planningLength}").`,
    );
  }
}

export function validateStockPlan(stocks: StockUsage[], kerf: number, considerTolerances: boolean): void {
  stocks.forEach((stock, index) => {
    const effectiveLength = stock.effectiveLength ?? stock.stockLength;
    assertCutsFitStock(
      stock.cuts,
      stock.stockLength,
      effectiveLength,
      kerf,
      considerTolerances,
      `bar ${index + 1}`,
    );

    if (stock.waste < -1e-6) {
      throw new OptimizationError(`Invalid cut plan for bar ${index + 1}: negative waste.`);
    }
  });
}
