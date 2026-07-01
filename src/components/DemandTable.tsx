"use client";

import { useState } from "react";
import type { DemandItem } from "@/lib/types";
import {
  DEMAND_IMPORT_FIELDS,
  guessDemandMapping,
  importDemandsFromPaste,
  type DemandColumnMapping,
} from "@/lib/spreadsheet";
import { createId, formatLength, inchesToFeet, parseLengthFeet, type LengthUnit } from "@/lib/units";
import { PasteImportDialog } from "@/components/PasteImportDialog";

const EMPTY_DEMAND_MAPPING: DemandColumnMapping = {
  name: null,
  length: null,
  quantity: null,
};

type DemandTableProps = {
  demands: DemandItem[];
  onChange: (demands: DemandItem[]) => void;
};

export function DemandTable({ demands, onChange }: DemandTableProps) {
  const [importOpen, setImportOpen] = useState(false);

  const updateDemand = (id: string, patch: Partial<DemandItem>) => {
    onChange(demands.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addRow = () => {
    onChange([
      ...demands,
      { id: createId(), name: `Piece ${demands.length + 1}`, length: 0, quantity: 1 },
    ]);
  };

  const removeRow = (id: string) => {
    if (demands.length === 1) return;
    onChange(demands.filter((item) => item.id !== id));
  };

  const handleImport = (rows: string[][], mapping: DemandColumnMapping, hasHeaderRow: boolean, lengthUnit: LengthUnit) => {
    const imported = importDemandsFromPaste(rows, mapping, { hasHeaderRow, lengthUnit });
    onChange(imported);
  };

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Pieces needed</h2>
            <p className="text-sm text-muted">
              Name, length in feet, and quantity. Paste from a spreadsheet and map columns.
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
                <th>Name</th>
                <th>Length (ft)</th>
                <th>Preview</th>
                <th>Qty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {demands.map((item) => (
                <tr key={item.id} className="border-b border-border/70">
                  <td>
                    <input
                      value={item.name}
                      onChange={(event) => updateDemand(item.id, { name: event.target.value })}
                      aria-label="Piece name"
                    />
                  </td>
                  <td>
                    <input
                      value={item.length ? String(inchesToFeet(item.length)) : ""}
                      onChange={(event) => {
                        const parsed = parseLengthFeet(event.target.value);
                        updateDemand(item.id, { length: parsed ?? 0 });
                      }}
                      placeholder="4"
                      aria-label="Piece length in feet"
                    />
                  </td>
                  <td className="text-sm text-muted">{item.length ? formatLength(item.length) : "—"}</td>
                  <td className="w-24">
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(event) =>
                        updateDemand(item.id, { quantity: Math.max(0, Number(event.target.value) || 0) })
                      }
                      aria-label="Quantity"
                    />
                  </td>
                  <td className="w-16 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="text-sm text-red-600 hover:underline"
                      disabled={demands.length === 1}
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
          title="Paste pieces needed"
          description="Paste any number of columns from your spreadsheet, then label which column maps to each field. Unmapped fields use defaults."
          fields={DEMAND_IMPORT_FIELDS}
          initialMapping={EMPTY_DEMAND_MAPPING}
          guessMapping={guessDemandMapping}
          showLengthUnit
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
    </>
  );
}
