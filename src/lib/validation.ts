import type { Cut, DemandItem, StockOption } from "./types";
import { getEffectiveStockLength } from "./stock-length";
import { usedLength } from "./optimizer/length";

export class OptimizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptimizationError";
  }
}

export function validateInputs(
  demands: DemandItem[],
  stocks: StockOption[],
  kerf: number,
  considerTolerances = false,
): DemandItem[] {
  if (kerf < 0) {
    throw new OptimizationError("Kerf cannot be negative.");
  }

  const activeDemands = demands.filter((item) => item.quantity > 0 && item.length > 0);
  if (activeDemands.length === 0) {
    throw new OptimizationError("Add at least one demand item with length and quantity.");
  }

  const activeStocks = stocks.filter((item) => item.length > 0 && item.cost >= 0);
  if (activeStocks.length === 0) {
    throw new OptimizationError("Add at least one stock option with length and cost.");
  }

  for (const stock of activeStocks) {
    const minus = stock.toleranceMinus ?? 0;
    const plus = stock.tolerancePlus ?? 0;
    if (minus < 0 || plus < 0) {
      throw new OptimizationError(`Stock "${stock.label ?? "item"}" has invalid tolerance values.`);
    }
    if (minus >= stock.length) {
      throw new OptimizationError(
        `Stock "${stock.label ?? "item"}" minus tolerance must be less than its nominal length.`,
      );
    }
    if (minus + plus > stock.length) {
      throw new OptimizationError(
        `Stock "${stock.label ?? "item"}" tolerances exceed its nominal length.`,
      );
    }
  }

  const maxStockLength = Math.max(
    ...activeStocks.map((item) => getEffectiveStockLength(item, considerTolerances)),
  );
  const tooLong = activeDemands.find((item) => item.length > maxStockLength);
  if (tooLong) {
    throw new OptimizationError(
      `"${tooLong.name}" (${tooLong.length}") is longer than the longest usable stock (${maxStockLength}")${
        considerTolerances ? " after tolerances" : ""
      }.`,
    );
  }

  return activeDemands;
}

export function expandDemands(demands: DemandItem[]): Cut[] {
  const pieces: Cut[] = [];

  for (const demand of demands) {
    for (let i = 0; i < demand.quantity; i += 1) {
      pieces.push({ name: demand.name, length: demand.length });
    }
  }

  return pieces;
}

export function demandTypesFromItems(demands: DemandItem[]) {
  return demands.map((item) => ({
    id: item.id,
    name: item.name,
    length: item.length,
  }));
}

export function totalPieceCount(demands: DemandItem[]): number {
  return demands.reduce((sum, item) => sum + item.quantity, 0);
}

export function fitsInStock(cuts: Cut[], stockLength: number, kerf: number): boolean {
  return usedLength(cuts, kerf) <= stockLength + 1e-9;
}
