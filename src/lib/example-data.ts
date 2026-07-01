import { feetToInches, createId } from "./units";
import type { DemandItem, PersistedState, StockOption } from "./types";

export const EXAMPLE_DEMANDS: DemandItem[] = [
  { id: createId(), name: "Leg A", length: feetToInches(4), quantity: 1 },
  { id: createId(), name: "Leg B", length: feetToInches(4), quantity: 2 },
  { id: createId(), name: "Crossbar", length: feetToInches(8), quantity: 2 },
  { id: createId(), name: "Brace", length: feetToInches(3), quantity: 4 },
];

export const EXAMPLE_STOCKS: StockOption[] = [
  { id: createId(), label: "12 ft bar", length: feetToInches(12), cost: 45, toleranceMinus: 0, tolerancePlus: 0.25 },
  { id: createId(), label: "20 ft bar", length: feetToInches(20), cost: 72, toleranceMinus: 0.25, tolerancePlus: 0.25 },
  { id: createId(), label: "24 ft bar", length: feetToInches(24), cost: 85, toleranceMinus: 0, tolerancePlus: 0 },
];

export const DEFAULT_KERF_INCHES = 0.125;

export function createDefaultState(): PersistedState {
  return {
    demands: EXAMPLE_DEMANDS.map((item) => ({ ...item, id: createId() })),
    stocks: EXAMPLE_STOCKS.map((item) => ({ ...item, id: createId() })),
    kerfInches: DEFAULT_KERF_INCHES,
    mode: "heuristic",
    considerTolerances: false,
  };
}
