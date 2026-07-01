"use client";

import { useEffect, useState } from "react";
import { DemandTable } from "@/components/DemandTable";
import { OptimizeControls } from "@/components/OptimizeControls";
import { ResultsSummary } from "@/components/ResultsSummary";
import { StockBarCard } from "@/components/StockBarCard";
import { StockTable } from "@/components/StockTable";
import { createDefaultState } from "@/lib/example-data";
import { optimize } from "@/lib/optimizer";
import { loadPersistedState, savePersistedState } from "@/lib/storage";
import type { DemandItem, OptimizeMode, OptimizeResult, StockOption } from "@/lib/types";
import { OptimizationError } from "@/lib/validation";

export function OptimizerApp() {
  const [demands, setDemands] = useState<DemandItem[]>(createDefaultState().demands);
  const [stocks, setStocks] = useState<StockOption[]>(createDefaultState().stocks);
  const [kerfInches, setKerfInches] = useState(createDefaultState().kerfInches);
  const [mode, setMode] = useState<OptimizeMode>("heuristic");
  const [considerTolerances, setConsiderTolerances] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersistedState();
    setDemands(saved.demands);
    setStocks(saved.stocks);
    setKerfInches(saved.kerfInches);
    setMode(saved.mode);
    setConsiderTolerances(saved.considerTolerances);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersistedState({ demands, stocks, kerfInches, mode, considerTolerances });
  }, [demands, stocks, kerfInches, mode, considerTolerances, hydrated]);

  const handleOptimize = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const nextResult = await optimize(demands, stocks, {
        kerf: kerfInches,
        mode,
        considerTolerances,
      });
      setResult(nextResult);
    } catch (err) {
      setResult(null);
      setError(err instanceof OptimizationError ? err.message : "Unexpected optimization error.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Cutting stock planner</p>
        <h1 className="text-3xl font-bold tracking-tight">Metal Square Optimizer</h1>
        <p className="max-w-3xl text-muted">
          Enter the pieces you need and the stock sizes you can buy, or import them from a spreadsheet. The tool
          finds a low-cost cutting plan and shows which cuts come from each bar.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <DemandTable demands={demands} onChange={setDemands} />
        <StockTable stocks={stocks} onChange={setStocks} />
      </div>

      <OptimizeControls
        kerfInches={kerfInches}
        mode={mode}
        considerTolerances={considerTolerances}
        isRunning={isRunning}
        onKerfChange={setKerfInches}
        onModeChange={setMode}
        onConsiderTolerancesChange={setConsiderTolerances}
        onOptimize={handleOptimize}
      />

      <ResultsSummary result={result} error={error} />

      {result?.stocks.length ? (
        <section className="grid gap-4 md:grid-cols-2">
          {result.stocks.map((stock, index) => (
            <StockBarCard key={`${stock.stockLength}-${index}`} stock={stock} index={index} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
