import { describe, expect, it } from "vitest";
import {
  importDemandsFromPaste,
  importStocksFromPaste,
  parsePastedText,
} from "@/lib/spreadsheet";

describe("paste import", () => {
  it("parses tab-separated pasted rows", () => {
    const rows = parsePastedText("Name\tLength (ft)\tQuantity\nLeg A\t4\t2\nCrossbar\t8\t1\n");

    expect(rows).toHaveLength(3);
    expect(rows[1][0]).toBe("Leg A");
  });

  it("imports demand rows with column mapping and defaults", () => {
    const rows = parsePastedText("Name\tLength (ft)\tExtra\nLeg A\t4\tignored\n\t8\t\n");

    const demands = importDemandsFromPaste(
      rows,
      { name: 0, length: 1, quantity: null },
      { hasHeaderRow: true },
    );

    expect(demands).toHaveLength(2);
    expect(demands[0].name).toBe("Leg A");
    expect(demands[0].quantity).toBe(1);
    expect(demands[1].name).toBe("Piece 2");
    expect(demands[1].length).toBe(96);
  });

  it("imports stock rows with partial mapping and defaults", () => {
    const rows = parsePastedText("Label\tLength (ft)\tCost\n12 ft\t12\t45\n20 ft\t20\t\n");

    const stocks = importStocksFromPaste(
      rows,
      { label: 0, length: 1, cost: 2, toleranceMinus: null, tolerancePlus: null },
      { hasHeaderRow: true },
    );

    expect(stocks).toHaveLength(2);
    expect(stocks[0].cost).toBe(45);
    expect(stocks[1].cost).toBe(0);
    expect(stocks[1].toleranceMinus).toBe(0);
    expect(stocks[1].tolerancePlus).toBe(0);
  });

  it("imports stock rows with length in inches when configured", () => {
    const rows = parsePastedText("Label\tLength\tCost\n12 ft\t144\t45\n");

    const stocks = importStocksFromPaste(
      rows,
      { label: 0, length: 1, cost: 2, toleranceMinus: null, tolerancePlus: null },
      { hasHeaderRow: true, lengthUnit: "inches" },
    );

    expect(stocks[0].length).toBe(144);
    expect(stocks[0].cost).toBe(45);
  });

  it("accepts extra columns without mapping them", () => {
    const rows = parsePastedText("Notes\tLength (ft)\tVendor\nignore\t4\tACME\n");

    const demands = importDemandsFromPaste(
      rows,
      { name: null, length: 1, quantity: null },
      { hasHeaderRow: true },
    );

    expect(demands).toHaveLength(1);
    expect(demands[0].name).toBe("Piece 1");
    expect(demands[0].length).toBe(48);
  });
});
