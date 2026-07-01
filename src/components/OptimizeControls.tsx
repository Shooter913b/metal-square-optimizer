"use client";

import type { OptimizeMode } from "@/lib/types";

type OptimizeControlsProps = {
  kerfInches: number;
  mode: OptimizeMode;
  considerTolerances: boolean;
  isRunning: boolean;
  onKerfChange: (kerf: number) => void;
  onModeChange: (mode: OptimizeMode) => void;
  onConsiderTolerancesChange: (value: boolean) => void;
  onOptimize: () => void;
};

export function OptimizeControls({
  kerfInches,
  mode,
  considerTolerances,
  isRunning,
  onKerfChange,
  onModeChange,
  onConsiderTolerancesChange,
  onOptimize,
}: OptimizeControlsProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Run optimizer</h2>
      <p className="mb-4 text-sm text-muted">
        Fast mode uses lookahead simulation to pick stock sizes. Optimal mode runs an exact solver on the server — slower, but handles larger jobs (up to 30 piece types, 2,000 pieces).
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Kerf (inches)</span>
          <input
            type="number"
            min={0}
            step="0.0625"
            value={kerfInches}
            onChange={(event) => onKerfChange(Math.max(0, Number(event.target.value) || 0))}
            className="rounded-lg border border-border px-3 py-2"
          />
          <span className="text-xs text-muted">Material lost between each cut (e.g. 0.125 for 1/8&quot;).</span>
        </label>

        <fieldset className="grid gap-2 text-sm">
          <legend className="font-medium text-foreground">Mode</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === "heuristic"}
              onChange={() => onModeChange("heuristic")}
            />
            Fast (recommended)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === "optimal"}
              onChange={() => onModeChange("optimal")}
            />
            Optimal (exact, slower)
          </label>
        </fieldset>

        <fieldset className="grid gap-2 text-sm">
          <legend className="font-medium text-foreground">Stock tolerance</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={considerTolerances}
              onChange={(event) => onConsiderTolerancesChange(event.target.checked)}
            />
            Consider tolerances
          </label>
          <span className="text-xs text-muted">
            When enabled, plans cuts using nominal length minus the minus tolerance (conservative).
          </span>
        </fieldset>

        <button
          type="button"
          onClick={onOptimize}
          disabled={isRunning}
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-foreground disabled:opacity-60"
        >
          {isRunning ? "Optimizing..." : "Optimize cuts"}
        </button>
      </div>
    </section>
  );
}
