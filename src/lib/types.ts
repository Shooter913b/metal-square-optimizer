export type DemandItem = {
  id: string;
  name: string;
  length: number;
  quantity: number;
};

export type StockOption = {
  id: string;
  label?: string;
  length: number;
  cost: number;
  /** How much shorter (in inches) the bar may be vs nominal. */
  toleranceMinus?: number;
  /** How much longer (in inches) the bar may be vs nominal. */
  tolerancePlus?: number;
};

export type Cut = {
  name: string;
  length: number;
};

export type StockUsage = {
  stockLength: number;
  /** Length used for fit checks when tolerances are enabled. */
  effectiveLength?: number;
  cost: number;
  cuts: Cut[];
  usedLength: number;
  waste: number;
};

export type OptimizeMode = "heuristic" | "optimal";

export type OptimizeOptions = {
  kerf: number;
  mode: OptimizeMode;
  /** When true, plan cuts using nominal length minus toleranceMinus. */
  considerTolerances: boolean;
};

export type OptimizeResult = {
  stocks: StockUsage[];
  totalCost: number;
  totalWaste: number;
  method: OptimizeMode;
  warnings?: string[];
};

export type DemandType = {
  id: string;
  name: string;
  length: number;
};

export type CuttingPattern = {
  stockOptionId: string;
  stockLength: number;
  stockCost: number;
  counts: number[];
};

export type ExpandedPiece = {
  typeIndex: number;
  name: string;
  length: number;
};

export type OpenBin = {
  stockLength: number;
  effectiveLength: number;
  cost: number;
  cuts: Cut[];
};

export const INCHES_PER_FOOT = 12;

export const OPTIMAL_LIMITS = {
  /** Distinct piece types (rows in the demand table). */
  maxDemandTypes: 30,
  /** Total count of individual pieces across all demand rows. */
  maxTotalPieces: 2000,
  /** Cutting patterns generated for the ILP (governs solver size). */
  maxPatterns: 100_000,
  /** Max time for the ILP solver, in seconds. */
  solverTimeLimitSeconds: 300,
} as const;

export const STORAGE_KEY = "metal-square-optimizer-state";

export type PersistedState = {
  demands: DemandItem[];
  stocks: StockOption[];
  kerfInches: number;
  mode: OptimizeMode;
  considerTolerances: boolean;
};
