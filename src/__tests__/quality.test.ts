import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/lib/example-data";
import { optimizeHeuristic } from "@/lib/optimizer/heuristic";
import { optimizeWithIlp } from "@/lib/optimizer/ilp";

describe("example data quality", () => {
  it("heuristic is close to optimal on the default example", async () => {
    const { demands, stocks } = createDefaultState();
    const kerf = 0.125;

    const heuristic = optimizeHeuristic(demands, stocks, kerf, false);
    const optimal = await optimizeWithIlp(demands, stocks, kerf, false);

    expect(heuristic.stocks.length).toBe(2);
    expect(heuristic.totalCost).toBe(157);
    expect(optimal.method).toBe("optimal");
    expect(optimal.totalCost).toBe(157);
  });
});
