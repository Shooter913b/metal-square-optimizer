"use client";

import type { OptimizeResult, StockUsage } from "@/lib/types";
import { formatCurrency, formatLength } from "@/lib/units";

type ResultsSummaryProps = {
  result: OptimizeResult | null;
  error: string | null;
};

type BarSummaryRow = {
  stockLength: number;
  cost: number;
  quantity: number;
};

function summarizeBars(stocks: StockUsage[]): BarSummaryRow[] {
  const byLength = new Map<string, BarSummaryRow>();

  for (const stock of stocks) {
    const key = `${stock.stockLength}:${stock.cost}`;
    const existing = byLength.get(key);
    if (existing) {
      existing.quantity += 1;
    } else {
      byLength.set(key, {
        stockLength: stock.stockLength,
        cost: stock.cost,
        quantity: 1,
      });
    }
  }

  return [...byLength.values()].sort((a, b) => a.stockLength - b.stockLength);
}

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

  const barSummary = summarizeBars(result.stocks);

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

      {barSummary.length ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Stock to buy</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-medium text-muted">Bar length</th>
                  <th className="pb-2 font-medium text-muted">Qty</th>
                </tr>
              </thead>
              <tbody>
                {barSummary.map((row) => (
                  <tr key={`${row.stockLength}-${row.cost}`} className="border-b border-border/70">
                    <td className="py-2 pr-4 font-medium">{formatLength(row.stockLength)}</td>
                    <td className="py-2">{row.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
