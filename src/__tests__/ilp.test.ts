import { describe, expect, it } from "vitest";
import { feetToInches, createId } from "@/lib/units";
import { optimizeWithIlp } from "@/lib/optimizer/ilp";
import type { DemandItem, StockOption } from "@/lib/types";

describe("optimizeWithIlp", () => {
  it("finds a minimum-cost plan for a small case", async () => {
    const demands: DemandItem[] = [
      { id: createId(), name: "Small", length: feetToInches(3), quantity: 2 },
      { id: createId(), name: "Large", length: feetToInches(9), quantity: 1 },
    ];
    const stocks: StockOption[] = [
      { id: createId(), label: "12 ft", length: feetToInches(12), cost: 45 },
      { id: createId(), label: "20 ft", length: feetToInches(20), cost: 80 },
    ];

    const result = await optimizeWithIlp(demands, stocks, 0);

    expect(result.stocks.length).toBeGreaterThan(0);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.method).toBe("optimal");
  });
});
