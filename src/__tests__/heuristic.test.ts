import { describe, expect, it } from "vitest";
import { feetToInches, createId } from "@/lib/units";
import { optimizeHeuristic } from "@/lib/optimizer/heuristic";
import type { DemandItem, StockOption } from "@/lib/types";

const stock12: StockOption = {
  id: createId(),
  label: "12 ft",
  length: feetToInches(12),
  cost: 45,
  toleranceMinus: 0,
  tolerancePlus: 0,
};

describe("optimizeHeuristic", () => {
  it("combines pieces into fewer bars than one bar per piece", () => {
    const demands: DemandItem[] = [
      { id: createId(), name: "A", length: feetToInches(4), quantity: 3 },
      { id: createId(), name: "B", length: feetToInches(8), quantity: 2 },
    ];

    const result = optimizeHeuristic(demands, [stock12], 0);

    expect(result.stocks.length).toBeLessThan(5);
    expect(result.totalCost).toBe(45 * result.stocks.length);
  });

  it("respects kerf when deciding whether pieces fit", () => {
    const demands: DemandItem[] = [
      { id: createId(), name: "Half", length: feetToInches(6), quantity: 2 },
    ];

    const withoutKerf = optimizeHeuristic(demands, [stock12], 0);
    const withKerf = optimizeHeuristic(demands, [stock12], 0.125);

    expect(withoutKerf.stocks).toHaveLength(1);
    expect(withKerf.stocks).toHaveLength(2);
  });

  it("prefers cheaper stock when opening a new bar", () => {
    const demands: DemandItem[] = [{ id: createId(), name: "Short", length: feetToInches(4), quantity: 1 }];
    const stocks: StockOption[] = [
      { id: createId(), label: "20 ft", length: feetToInches(20), cost: 100 },
      { id: createId(), label: "12 ft", length: feetToInches(12), cost: 45 },
    ];

    const result = optimizeHeuristic(demands, stocks, 0);

    expect(result.stocks[0].stockLength).toBe(feetToInches(12));
    expect(result.totalCost).toBe(45);
  });

  it("uses minus tolerance when considerTolerances is enabled", () => {
    const demands: DemandItem[] = [
      { id: createId(), name: "Half", length: feetToInches(6), quantity: 2 },
    ];
    const stockWithTolerance: StockOption = {
      ...stock12,
      toleranceMinus: 0.25,
      tolerancePlus: 0.25,
    };

    const ignoringTolerance = optimizeHeuristic(demands, [stockWithTolerance], 0, false);
    const usingTolerance = optimizeHeuristic(demands, [stockWithTolerance], 0, true);

    expect(ignoringTolerance.stocks).toHaveLength(1);
    expect(usingTolerance.stocks).toHaveLength(2);
    expect(usingTolerance.stocks[0].effectiveLength).toBe(feetToInches(12) - 0.25);
  });
});
