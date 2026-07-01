import { describe, expect, it } from "vitest";
import { computeWaste } from "@/lib/optimizer/plan-length";

describe("computeWaste", () => {
  it("never returns negative waste", () => {
    const result = computeWaste(
      [
        { name: "A", length: 48 },
        { name: "B", length: 48 },
      ],
      60,
      0.125,
    );

    expect(result.usedLength).toBeGreaterThan(60);
    expect(result.waste).toBe(0);
  });
});
