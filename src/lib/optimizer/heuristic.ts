import type { Cut, DemandItem, OpenBin, OptimizeResult, StockOption, StockUsage } from "../types";
import { getEffectiveStockLength } from "../stock-length";
import { demandTypesFromItems, expandDemands, validateInputs } from "../validation";
import { fitsPiece, remainingSpace, usedLength } from "./length";
import { computeWaste, getPlanningLength } from "./plan-length";
import { validateStockPlan } from "./validate-plan";

function largestPieceLength(pieces: Cut[]): number {
  return pieces.reduce((max, piece) => Math.max(max, piece.length), 0);
}

function viableStocksForPieces(
  pieces: Cut[],
  stocks: StockOption[],
  kerf: number,
  considerTolerances: boolean,
): StockOption[] {
  const largest = largestPieceLength(pieces);
  return stocks.filter((stock) => getEffectiveStockLength(stock, considerTolerances) >= largest);
}

function packMostPiecesOnBar(
  stock: StockOption,
  pieces: Cut[],
  kerf: number,
  considerTolerances: boolean,
): Cut[] {
  const effectiveLength = getEffectiveStockLength(stock, considerTolerances);
  const cuts: Cut[] = [];

  for (const piece of pieces) {
    if (fitsPiece(cuts, piece.length, effectiveLength, kerf)) {
      cuts.push(piece);
    }
  }

  return cuts;
}

function cloneBins(bins: OpenBin[]): OpenBin[] {
  return bins.map((bin) => ({
    ...bin,
    cuts: [...bin.cuts],
  }));
}

function simulateFromIndex(
  pieces: Cut[],
  startIndex: number,
  stocks: StockOption[],
  kerf: number,
  considerTolerances: boolean,
  startingBins: OpenBin[] = [],
  forcedFirstStock?: StockOption,
): { totalCost: number; bins: OpenBin[] } {
  const bins = cloneBins(startingBins);
  let forcedStockUsed = false;

  for (let pieceIndex = startIndex; pieceIndex < pieces.length; pieceIndex += 1) {
    const piece = pieces[pieceIndex];
    let bestBinIndex = -1;
    let bestRemaining = Number.POSITIVE_INFINITY;

    for (let i = 0; i < bins.length; i += 1) {
      const bin = bins[i];
      if (!fitsPiece(bin.cuts, piece.length, bin.effectiveLength, kerf)) continue;

      const remaining = remainingSpace(
        [...bin.cuts, { name: piece.name, length: piece.length }],
        bin.effectiveLength,
        kerf,
      );

      if (remaining < bestRemaining) {
        bestRemaining = remaining;
        bestBinIndex = i;
      }
    }

    if (bestBinIndex >= 0) {
      bins[bestBinIndex].cuts.push({ name: piece.name, length: piece.length });
      continue;
    }

    let stock: StockOption;
    if (forcedFirstStock && !forcedStockUsed) {
      stock = forcedFirstStock;
      forcedStockUsed = true;
    } else {
      const remaining = pieces.slice(pieceIndex);
      const eligibleStocks = viableStocksForPieces(remaining, stocks, kerf, considerTolerances);
      stock = rankStocksBySingleBar(
        remaining,
        eligibleStocks.length > 0 ? eligibleStocks : stocks,
        kerf,
        considerTolerances,
      )[0];
    }

    bins.push({
      stockLength: stock.length,
      effectiveLength: getEffectiveStockLength(stock, considerTolerances),
      cost: stock.cost,
      cuts: [{ name: piece.name, length: piece.length }],
    });
  }

  return {
    totalCost: bins.reduce((sum, bin) => sum + bin.cost, 0),
    bins,
  };
}

function chooseStockBySimulation(
  pieces: Cut[],
  startIndex: number,
  existingBins: OpenBin[],
  stocks: StockOption[],
  kerf: number,
  considerTolerances: boolean,
): StockOption {
  const remaining = pieces.slice(startIndex);
  const viableStocks = stocks.filter(
    (stock) => packMostPiecesOnBar(stock, remaining, kerf, considerTolerances).length > 0,
  );

  if (viableStocks.length === 0) {
    throw new Error("No stock fits the requested piece length.");
  }

  if (viableStocks.length === 1) {
    return viableStocks[0];
  }

  let bestStock = viableStocks[0];
  let bestCost = Number.POSITIVE_INFINITY;

  for (const stock of viableStocks) {
    const { totalCost } = simulateFromIndex(
      pieces,
      startIndex,
      stocks,
      kerf,
      considerTolerances,
      existingBins,
      stock,
    );

    if (totalCost < bestCost) {
      bestCost = totalCost;
      bestStock = stock;
    }
  }

  return bestStock;
}

function rankStocksBySingleBar(
  remainingPieces: Cut[],
  stocks: StockOption[],
  kerf: number,
  considerTolerances: boolean,
): StockOption[] {
  type Candidate = {
    stock: StockOption;
    packedCount: number;
    waste: number;
    costPerPiece: number;
  };

  const candidates: Candidate[] = stocks
    .map((stock) => {
      const packed = packMostPiecesOnBar(stock, remainingPieces, kerf, considerTolerances);
      if (packed.length === 0) return null;

      const effectiveLength = getEffectiveStockLength(stock, considerTolerances);
      return {
        stock,
        packedCount: packed.length,
        waste: effectiveLength - usedLength(packed, kerf),
        costPerPiece: stock.cost / packed.length,
      };
    })
    .filter((candidate): candidate is Candidate => candidate !== null);

  candidates.sort((a, b) => {
    if (a.costPerPiece !== b.costPerPiece) return a.costPerPiece - b.costPerPiece;
    if (a.packedCount !== b.packedCount) return b.packedCount - a.packedCount;
    if (a.waste !== b.waste) return a.waste - b.waste;
    return a.stock.cost - b.stock.cost;
  });

  return candidates.map((candidate) => candidate.stock);
}

function buildStockUsage(
  bin: OpenBin,
  kerf: number,
  considerTolerances: boolean,
): StockUsage {
  const planningLength = getPlanningLength(bin.stockLength, bin.effectiveLength, considerTolerances);
  const { usedLength: consumed, waste } = computeWaste(bin.cuts, planningLength, kerf);

  return {
    stockLength: bin.stockLength,
    effectiveLength: considerTolerances ? bin.effectiveLength : undefined,
    cost: bin.cost,
    cuts: bin.cuts,
    usedLength: consumed,
    waste,
  };
}

export function optimizeHeuristic(
  demands: DemandItem[],
  stocks: StockOption[],
  kerf: number,
  considerTolerances = false,
): OptimizeResult {
  const activeDemands = validateInputs(demands, stocks, kerf, considerTolerances);
  const activeStocks = stocks.filter((item) => item.length > 0 && item.cost >= 0);
  const pieces = expandDemands(activeDemands).sort((a, b) => b.length - a.length);

  const bins: OpenBin[] = [];

  for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex += 1) {
    const piece = pieces[pieceIndex];
    let bestBinIndex = -1;
    let bestRemaining = Number.POSITIVE_INFINITY;

    for (let i = 0; i < bins.length; i += 1) {
      const bin = bins[i];
      if (!fitsPiece(bin.cuts, piece.length, bin.effectiveLength, kerf)) continue;

      const remaining = remainingSpace(
        [...bin.cuts, { name: piece.name, length: piece.length }],
        bin.effectiveLength,
        kerf,
      );

      if (remaining < bestRemaining) {
        bestRemaining = remaining;
        bestBinIndex = i;
      }
    }

    if (bestBinIndex >= 0) {
      const targetBin = bins[bestBinIndex];
      if (!fitsPiece(targetBin.cuts, piece.length, targetBin.effectiveLength, kerf)) {
        throw new Error(`Cut "${piece.name}" does not fit on the selected stock bar.`);
      }
      targetBin.cuts.push({ name: piece.name, length: piece.length });
      continue;
    }

    const remainingPieces = pieces.slice(pieceIndex);
    const candidateStocks = viableStocksForPieces(
      remainingPieces,
      activeStocks,
      kerf,
      considerTolerances,
    );

    if (candidateStocks.length === 0) {
      throw new Error(`No stock is long enough for "${piece.name}" (${piece.length}").`);
    }

    const stock = chooseStockBySimulation(
      pieces,
      pieceIndex,
      bins,
      candidateStocks,
      kerf,
      considerTolerances,
    );

    if (!fitsPiece([], piece.length, getEffectiveStockLength(stock, considerTolerances), kerf)) {
      throw new Error(`Cut "${piece.name}" does not fit on stock ${stock.label ?? "item"}.`);
    }

    bins.push({
      stockLength: stock.length,
      effectiveLength: getEffectiveStockLength(stock, considerTolerances),
      cost: stock.cost,
      cuts: [{ name: piece.name, length: piece.length }],
    });
  }

  const stockUsages = bins.map((bin) => buildStockUsage(bin, kerf, considerTolerances));
  validateStockPlan(stockUsages, kerf, considerTolerances);

  return {
    stocks: stockUsages,
    totalCost: stockUsages.reduce((sum, stock) => sum + stock.cost, 0),
    totalWaste: stockUsages.reduce((sum, stock) => sum + stock.waste, 0),
    method: "heuristic",
  };
}

export function decodePatternToUsage(
  patternCounts: number[],
  demandTypes: ReturnType<typeof demandTypesFromItems>,
  stock: StockOption,
  kerf: number,
  considerTolerances = false,
): StockUsage {
  const cuts: Cut[] = [];

  patternCounts.forEach((count, index) => {
    for (let i = 0; i < count; i += 1) {
      cuts.push({
        name: demandTypes[index].name,
        length: demandTypes[index].length,
      });
    }
  });

  const effectiveLength = getEffectiveStockLength(stock, considerTolerances);
  const planningLength = getPlanningLength(stock.length, effectiveLength, considerTolerances);
  const { usedLength: consumed, waste } = computeWaste(cuts, planningLength, kerf);

  return {
    stockLength: stock.length,
    effectiveLength: considerTolerances ? effectiveLength : undefined,
    cost: stock.cost,
    cuts,
    usedLength: consumed,
    waste,
  };
}
