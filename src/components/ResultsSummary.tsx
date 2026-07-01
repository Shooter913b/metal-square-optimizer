"use client";

import type { OptimizeResult } from "@/lib/types";
import { formatCurrency, formatLength } from "@/lib/units";

type ResultsSummaryProps = {
  result: OptimizeResult | null;
  error: string | null;
};

export function ResultsSummary({ result, error }: ResultsSummaryProps) {
  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <h2 className="font-semibold">Could not optimize</h2>
        <p className="mt-1 text-sm">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted">
        Run the optimizer to see total cost, waste, and a cut plan for each stock bar.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Results</h2>
          <p className="text-sm text-muted">
            {result.method === "optimal" ? "Optimal plan" : "Fast heuristic plan"}
          </p>
        </div>
        <div className="grid gap-1 text-right text-sm">
          <div>
            <span className="text-muted">Total cost: </span>
            <span className="font-semibold">{formatCurrency(result.totalCost)}</span>
          </div>
          <div>
            <span className="text-muted">Bars used: </span>
            <span className="font-semibold">{result.stocks.length}</span>
          </div>
          <div>
            <span className="text-muted">Total waste: </span>
            <span className="font-semibold">{formatLength(result.totalWaste)}</span>
          </div>
        </div>
      </div>

      {result.warnings?.length ? (
        <ul className="mt-4 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {result.warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
