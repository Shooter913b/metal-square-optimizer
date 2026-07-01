import type { DemandItem, OptimizeResult, StockOption } from "../types";
import { OPTIMAL_LIMITS } from "../types";
import { demandTypesFromItems, totalPieceCount, validateInputs } from "../validation";
import { decodePatternToUsage, optimizeHeuristic } from "./heuristic";
import { getGlpk } from "./glpk-loader";
import { addSingletonPatterns, generateCuttingPatterns } from "./patterns";
import { validateStockPlan } from "./validate-plan";

function shouldFallbackToHeuristic(
  demands: DemandItem[],
  patternCount: number,
  patternsTruncated: boolean,
): string | null {
  if (demands.length > OPTIMAL_LIMITS.maxDemandTypes) {
    return `Optimal mode supports up to ${OPTIMAL_LIMITS.maxDemandTypes} piece types. Falling back to fast mode.`;
  }

  if (totalPieceCount(demands) > OPTIMAL_LIMITS.maxTotalPieces) {
    return `Optimal mode supports up to ${OPTIMAL_LIMITS.maxTotalPieces} total pieces. Falling back to fast mode.`;
  }

  if (patternsTruncated || patternCount >= OPTIMAL_LIMITS.maxPatterns) {
    return `Too many cutting patterns were generated (limit ${OPTIMAL_LIMITS.maxPatterns.toLocaleString()}). Try reducing piece types, using fewer stock sizes, or use fast mode.`;
  }

  return null;
}

export async function optimizeWithIlp(
  demands: DemandItem[],
  stocks: StockOption[],
  kerf: number,
  considerTolerances = false,
): Promise<OptimizeResult> {
  const activeDemands = validateInputs(demands, stocks, kerf, considerTolerances);
  const activeStocks = stocks.filter((item) => item.length > 0 && item.cost >= 0);
  const demandTypes = demandTypesFromItems(activeDemands);

  const { patterns, truncated: patternsTruncated } = generateCuttingPatterns(
    demandTypes,
    activeStocks,
    kerf,
    OPTIMAL_LIMITS.maxPatterns,
    considerTolerances,
  );
  const patternsWithSingletons = addSingletonPatterns(patterns, demandTypes, activeStocks, considerTolerances);

  const fallbackWarning = shouldFallbackToHeuristic(
    activeDemands,
    patternsWithSingletons.length,
    patternsTruncated,
  );
  if (fallbackWarning) {
    const heuristic = optimizeHeuristic(activeDemands, activeStocks, kerf, considerTolerances);
    return {
      ...heuristic,
      warnings: [...(heuristic.warnings ?? []), fallbackWarning],
    };
  }

  const glpk = getGlpk();
  const patternVars = patternsWithSingletons.map((_, index) => `p${index}`);

  const options = {
    msglev: glpk.GLP_MSG_ERR,
    presol: true,
    tmlim: OPTIMAL_LIMITS.solverTimeLimitSeconds,
  };

  const lp = {
    name: "cutting-stock",
    objective: {
      direction: glpk.GLP_MIN,
      name: "cost",
      vars: patternsWithSingletons.map((pattern, index) => ({
        name: patternVars[index],
        coef: pattern.stockCost,
      })),
    },
    subjectTo: demandTypes.map((_, typeIndex) => ({
      name: `demand_${typeIndex}`,
      vars: patternsWithSingletons.map((pattern, patternIndex) => ({
        name: patternVars[patternIndex],
        coef: pattern.counts[typeIndex],
      })),
      bnds: {
        type: glpk.GLP_LO,
        lb: activeDemands[typeIndex].quantity,
        ub: 0,
      },
    })),
    generals: patternVars,
  };

  let result;
  try {
    result = glpk.solve(lp, options);
  } catch {
    const heuristic = optimizeHeuristic(activeDemands, activeStocks, kerf, considerTolerances);
    return {
      ...heuristic,
      warnings: [
        ...(heuristic.warnings ?? []),
        "The optimal solver failed to run. Showing fast mode result.",
      ],
    };
  }

  if (result.result.status !== glpk.GLP_OPT && result.result.status !== glpk.GLP_FEAS) {
    const heuristic = optimizeHeuristic(activeDemands, activeStocks, kerf, considerTolerances);
    return {
      ...heuristic,
      warnings: [
        ...(heuristic.warnings ?? []),
        "The optimal solver did not find a proven optimum. Showing fast mode result.",
      ],
    };
  }

  const solverTimedOut = result.result.status === glpk.GLP_FEAS;

  const stockById = new Map(activeStocks.map((stock) => [stock.id, stock]));
  const stockUsages = [];

  for (let i = 0; i < patternsWithSingletons.length; i += 1) {
    const count = Math.round(result.result.vars[patternVars[i]] ?? 0);
    if (count <= 0) continue;

    const pattern = patternsWithSingletons[i];
    const stock = stockById.get(pattern.stockOptionId);
    if (!stock) continue;

    for (let j = 0; j < count; j += 1) {
      stockUsages.push(
        decodePatternToUsage(pattern.counts, demandTypes, stock, kerf, considerTolerances),
      );
    }
  }

  if (stockUsages.length === 0) {
    const heuristic = optimizeHeuristic(activeDemands, activeStocks, kerf, considerTolerances);
    return {
      ...heuristic,
      warnings: [
        ...(heuristic.warnings ?? []),
        "The optimal solver returned an empty plan. Showing fast mode result.",
      ],
    };
  }

  validateStockPlan(stockUsages, kerf, considerTolerances);

  return {
    stocks: stockUsages,
    totalCost: stockUsages.reduce((sum, stock) => sum + stock.cost, 0),
    totalWaste: stockUsages.reduce((sum, stock) => sum + stock.waste, 0),
    method: "optimal",
    warnings: solverTimedOut
      ? [
          `Solver reached the ${OPTIMAL_LIMITS.solverTimeLimitSeconds}s time limit with a feasible (but not proven optimal) plan.`,
        ]
      : undefined,
  };
}
