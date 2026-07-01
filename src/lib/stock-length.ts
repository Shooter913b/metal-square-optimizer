import type { StockOption } from "./types";

export function getEffectiveStockLength(stock: StockOption, considerTolerances: boolean): number {
  if (!considerTolerances) return stock.length;
  return stock.length - (stock.toleranceMinus ?? 0);
}

export function normalizeStockOption(stock: StockOption): StockOption {
  return {
    ...stock,
    toleranceMinus: stock.toleranceMinus ?? 0,
    tolerancePlus: stock.tolerancePlus ?? 0,
  };
}
