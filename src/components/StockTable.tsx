"use client";

import { useState } from "react";
import type { StockOption } from "@/lib/types";
import {
  guessStockMapping,
  importStocksFromPaste,
  STOCK_IMPORT_FIELDS,
  type StockColumnMapping,
} from "@/lib/spreadsheet";
import { createId, formatLength, inchesToFeet, parseLengthFeet, type LengthUnit } from "@/lib/units";
import { PasteImportDialog } from "@/components/PasteImportDialog";

const EMPTY_STOCK_MAPPING: StockColumnMapping = {
  label: null,
  length: null,
  cost: null,
  toleranceMinus: null,
  tolerancePlus: null,
};

type StockTableProps = {
  stocks: StockOption[];
  onChange: (stocks: StockOption[]) => void;
};

export function StockTable({ stocks, onChange }: StockTableProps) {
  const [importOpen, setImportOpen] = useState(false);

  const updateStock = (id: string, patch: Partial<StockOption>) => {
    onChange(stocks.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addRow = () => {
    onChange([
      ...stocks,
      {
        id: createId(),
        label: `Stock ${stocks.length + 1}`,
        length: 0,
        cost: 0,
        toleranceMinus: 0,
        tolerancePlus: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (stocks.length === 1) return;
    onChange(stocks.filter((item) => item.id !== id));
  };

  const handleImport = (rows: string[][], mapping: StockColumnMapping, hasHeaderRow: boolean, lengthUnit: LengthUnit) => {
    const imported = importStocksFromPaste(rows, mapping, { hasHeaderRow, lengthUnit });
    onChange(imported);
  };

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Available stock</h2>
            <p className="text-sm text-muted">
              Purchasable bar lengths, cost, and optional length tolerance. Paste from a spreadsheet and map columns.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Paste import
            </button>
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Add row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th>Label</th>
                <th>Length (ft)</th>
                <th>Preview</th>
                <th>Cost ($)</th>
                <th>− Tol (in)</th>
                <th>+ Tol (in)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stocks.map((item) => (
                <tr key={item.id} className="border-b border-border/70">
                  <td>
                    <input
                      value={item.label ?? ""}
                      onChange={(event) => updateStock(item.id, { label: event.target.value })}
                      aria-label="Stock label"
                    />
                  </td>
                  <td>
                    <input
                      value={item.length ? String(inchesToFeet(item.length)) : ""}
                      onChange={(event) => {
                        const parsed = parseLengthFeet(event.target.value);
                        updateStock(item.id, { length: parsed ?? 0 });
                      }}
                      placeholder="12"
                      aria-label="Stock length in feet"
                    />
                  </td>
                  <td className="text-sm text-muted">{item.length ? formatLength(item.length) : "—"}</td>
                  <td className="w-28">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.cost}
                      onChange={(event) =>
                        updateStock(item.id, { cost: Math.max(0, Number(event.target.value) || 0) })
                      }
                      aria-label="Stock cost"
                    />
                  </td>
                  <td className="w-24">
                    <input
                      type="number"
                      min={0}
                      step="0.0625"
                      value={item.toleranceMinus ?? 0}
                      onChange={(event) =>
                        updateStock(item.id, {
                          toleranceMinus: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      aria-label="Tolerance minus inches"
                      title="How much shorter the bar may be vs nominal"
                    />
                  </td>
                  <td className="w-24">
                    <input
                      type="number"
                      min={0}
                      step="0.0625"
                      value={item.tolerancePlus ?? 0}
                      onChange={(event) =>
                        updateStock(item.id, {
                          tolerancePlus: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      aria-label="Tolerance plus inches"
                      title="How much longer the bar may be vs nominal"
                    />
                  </td>
                  <td className="w-16 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="text-sm text-red-600 hover:underline"
                      disabled={stocks.length === 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {importOpen ? (
        <PasteImportDialog
          title="Paste available stock"
          description="Paste any number of columns from your spreadsheet, then label which column maps to each field. Unmapped fields use defaults."
          fields={STOCK_IMPORT_FIELDS}
          initialMapping={EMPTY_STOCK_MAPPING}
          guessMapping={guessStockMapping}
          showLengthUnit
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
    </>
  );
}
