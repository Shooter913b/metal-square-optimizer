import { describe, expect, it } from "vitest";
import { feetToInches, createId } from "@/lib/units";
import { generateCuttingPatterns } from "@/lib/optimizer/patterns";
import type { DemandType, StockOption } from "@/lib/types";

describe("generateCuttingPatterns", () => {
  it("creates feasible patterns that fit within stock length", () => {
    const demandTypes: DemandType[] = [
      { id: createId(), name: "A", length: feetToInches(4) },
      { id: createId(), name: "B", length: feetToInches(8) },
    ];
    const stocks: StockOption[] = [
      { id: createId(), length: feetToInches(12), cost: 45 },
    ];

    const { patterns } = generateCuttingPatterns(demandTypes, stocks, 0, 100);

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.some((pattern) => pattern.counts[0] === 3)).toBe(true);
    expect(patterns.some((pattern) => pattern.counts[1] === 1)).toBe(true);
  });
});
