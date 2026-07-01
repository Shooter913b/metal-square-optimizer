import type { Cut } from "../types";

export function usedLength(cuts: Cut[], kerf: number): number {
  if (cuts.length === 0) return 0;
  const pieceLength = cuts.reduce((sum, cut) => sum + cut.length, 0);
  return pieceLength + (cuts.length - 1) * kerf;
}

export function remainingSpace(cuts: Cut[], stockLength: number, kerf: number): number {
  return stockLength - usedLength(cuts, kerf);
}

export function fitsPiece(existingCuts: Cut[], pieceLength: number, stockLength: number, kerf: number): boolean {
  const nextCuts =
    existingCuts.length === 0
      ? [{ name: "", length: pieceLength }]
      : [...existingCuts, { name: "", length: pieceLength }];
  return usedLength(nextCuts, kerf) <= stockLength + 1e-9;
}
