import type { CuttingPattern, DemandType, StockOption } from "../types";
import { getEffectiveStockLength } from "../stock-length";
import { usedLength } from "./length";

export type PatternGenerationResult = {
  patterns: CuttingPattern[];
  truncated: boolean;
};

function patternKey(counts: number[]): string {
  return counts.join(",");
}

function buildCutsFromCounts(demandTypes: DemandType[], counts: number[]) {
  return demandTypes.flatMap((type, index) =>
    Array.from({ length: counts[index] }, () => ({
      name: type.name,
      length: type.length,
    })),
  );
}

function generatePatternsForStock(
  stock: StockOption,
  demandTypes: DemandType[],
  kerf: number,
  maxPatterns: number,
  considerTolerances: boolean,
): { patterns: CuttingPattern[]; truncated: boolean } {
  const effectiveLength = getEffectiveStockLength(stock, considerTolerances);
  const patterns: CuttingPattern[] = [];
  const seen = new Set<string>();
  const counts = new Array(demandTypes.length).fill(0);
  let truncated = false;

  function visit(startIndex: number) {
    if (patterns.length >= maxPatterns) {
      truncated = true;
      return;
    }

    const cuts = buildCutsFromCounts(demandTypes, counts);
    if (cuts.length > 0 && usedLength(cuts, kerf) <= effectiveLength + 1e-9) {
      const key = patternKey(counts);
      if (!seen.has(key)) {
        seen.add(key);
        patterns.push({
          stockOptionId: stock.id,
          stockLength: stock.length,
          stockCost: stock.cost,
          counts: [...counts],
        });
      }
    }

    for (let i = startIndex; i < demandTypes.length; i += 1) {
      if (patterns.length >= maxPatterns) {
        truncated = true;
        return;
      }

      counts[i] += 1;
      const nextCuts = buildCutsFromCounts(demandTypes, counts);
      if (usedLength(nextCuts, kerf) <= effectiveLength + 1e-9) {
        visit(i);
      }
      counts[i] -= 1;
    }
  }

  visit(0);
  return { patterns, truncated };
}

export function generateCuttingPatterns(
  demandTypes: DemandType[],
  stocks: StockOption[],
  kerf: number,
  maxPatterns: number,
  considerTolerances = false,
): PatternGenerationResult {
  const activeStocks = stocks.filter((stock) => stock.length > 0 && stock.cost >= 0);
  const patterns: CuttingPattern[] = [];
  let truncated = false;

  for (const stock of activeStocks) {
    const remaining = maxPatterns - patterns.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    const stockResult = generatePatternsForStock(
      stock,
      demandTypes,
      kerf,
      remaining,
      considerTolerances,
    );
    patterns.push(...stockResult.patterns);
    truncated = truncated || stockResult.truncated;

    if (patterns.length >= maxPatterns) {
      truncated = true;
      break;
    }
  }

  return { patterns, truncated };
}

export function addSingletonPatterns(
  patterns: CuttingPattern[],
  demandTypes: DemandType[],
  stocks: StockOption[],
  considerTolerances = false,
): CuttingPattern[] {
  const merged = [...patterns];
  const seen = new Set(patterns.map((pattern) => `${pattern.stockOptionId}:${patternKey(pattern.counts)}`));

  for (const stock of stocks) {
    const effectiveLength = getEffectiveStockLength(stock, considerTolerances);
    demandTypes.forEach((type, index) => {
      if (type.length > effectiveLength) return;
      const counts = demandTypes.map((_, i) => (i === index ? 1 : 0));
      const key = `${stock.id}:${patternKey(counts)}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({
        stockOptionId: stock.id,
        stockLength: stock.length,
        stockCost: stock.cost,
        counts,
      });
    });
  }

  return merged;
}
