"use client";

import { useMemo, useState } from "react";
import {
  getColumnOptions,
  parsePastedText,
  SpreadsheetImportError,
  UNMAPPED,
} from "@/lib/spreadsheet";
import type { LengthUnit } from "@/lib/units";

type ImportField<K extends string> = {
  key: K;
  label: string;
  defaultHint: string;
};

type PasteImportDialogProps<M extends Record<string, number | null>> = {
  title: string;
  description: string;
  fields: ImportField<keyof M & string>[];
  initialMapping: M;
  guessMapping: (headerRow: string[]) => M;
  showLengthUnit?: boolean;
  onImport: (rows: string[][], mapping: M, hasHeaderRow: boolean, lengthUnit: LengthUnit) => void;
  onClose: () => void;
};

export function PasteImportDialog<M extends Record<string, number | null>>({
  title,
  description,
  fields,
  initialMapping,
  guessMapping,
  onImport,
  onClose,
  showLengthUnit = false,
}: PasteImportDialogProps<M>) {
  const [step, setStep] = useState<"paste" | "map">("paste");
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("feet");
  const [mapping, setMapping] = useState<M>(initialMapping);
  const [error, setError] = useState<string | null>(null);

  const columnOptions = useMemo(() => getColumnOptions(rows, hasHeaderRow), [rows, hasHeaderRow]);
  const previewRows = rows.slice(0, Math.min(rows.length, hasHeaderRow ? 6 : 5));

  const handleContinue = () => {
    setError(null);
    try {
      const parsed = parsePastedText(pasteText);
      setRows(parsed);
      setMapping(hasHeaderRow && parsed.length > 0 ? guessMapping(parsed[0]) : initialMapping);
      setStep("map");
    } catch (err) {
      setError(err instanceof SpreadsheetImportError ? err.message : "Could not parse pasted data.");
    }
  };

  const handleImport = () => {
    setError(null);
    try {
      onImport(rows, mapping, hasHeaderRow, lengthUnit);
      onClose();
    } catch (err) {
      setError(err instanceof SpreadsheetImportError ? err.message : "Import failed.");
    }
  };

  const updateMapping = (key: keyof M, value: string) => {
    setMapping((current) => ({
      ...current,
      [key]: value === "" ? UNMAPPED : Number(value),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-import-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="paste-import-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-slate-100"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {step === "paste" ? (
          <div className="space-y-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Paste from Excel, Google Sheets, or CSV</span>
              <textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                rows={10}
                placeholder={"Name\tLength (ft)\tQuantity\nLeg A\t4\t1\nCrossbar\t8\t2"}
                className="min-h-48 w-full rounded-lg border border-border px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasHeaderRow}
                onChange={(event) => setHasHeaderRow(event.target.checked)}
              />
              First row contains column headers
            </label>
            {showLengthUnit ? (
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Length column unit</span>
                <select
                  value={lengthUnit}
                  onChange={(event) => setLengthUnit(event.target.value as LengthUnit)}
                  className="rounded-lg border border-border px-3 py-2"
                >
                  <option value="feet">Feet (default)</option>
                  <option value="inches">Inches</option>
                </select>
                <span className="text-xs text-muted">
                  Use inches if your spreadsheet stores lengths like 48, 60, 144 without units.
                </span>
              </label>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasHeaderRow}
                onChange={(event) => setHasHeaderRow(event.target.checked)}
              />
              First row contains column headers
            </label>

            {showLengthUnit ? (
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Length column unit</span>
                <select
                  value={lengthUnit}
                  onChange={(event) => setLengthUnit(event.target.value as LengthUnit)}
                  className="rounded-lg border border-border px-3 py-2"
                >
                  <option value="feet">Feet (default)</option>
                  <option value="inches">Inches</option>
                </select>
              </label>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="grid gap-1 text-sm">
                  <span className="font-medium">{field.label}</span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(event) => updateMapping(field.key, event.target.value)}
                    className="rounded-lg border border-border px-3 py-2"
                  >
                    <option value="">Not mapped ({field.defaultHint})</option>
                    {columnOptions.map((option) => (
                      <option key={option.index} value={option.index}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border/70">
                      {Array.from({ length: columnOptions.length }, (_, columnIndex) => (
                        <td key={columnIndex} className="px-3 py-2 text-muted">
                          {row[columnIndex] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {step === "map" ? (
            <button
              type="button"
              onClick={() => setStep("paste")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          {step === "paste" ? (
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Import rows
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
