import * as XLSX from "xlsx";
import type { DemandItem, StockOption } from "./types";
import { createId, parseLengthWithUnit, type LengthUnit } from "./units";

export class SpreadsheetImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetImportError";
  }
}

export type DemandColumnMapping = {
  name: number | null;
  length: number | null;
  quantity: number | null;
};

export type StockColumnMapping = {
  label: number | null;
  length: number | null;
  cost: number | null;
  toleranceMinus: number | null;
  tolerancePlus: number | null;
};

export type DemandImportDefaults = {
  name: string;
  quantity: number;
};

export type StockImportDefaults = {
  label: string;
  cost: number;
  toleranceMinus: number;
  tolerancePlus: number;
};

const UNMAPPED = null;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function parsePastedText(text: string): string[][] {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new SpreadsheetImportError("Paste spreadsheet data to continue.");
  }

  try {
    const workbook = XLSX.read(trimmed, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new SpreadsheetImportError("No rows were found in the pasted data.");
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
    const normalized = rows
      .map((row) => row.map((cell) => String(cell ?? "").trim()))
      .filter((row) => row.some((cell) => cell.length > 0));

    if (normalized.length === 0) {
      throw new SpreadsheetImportError("No rows were found in the pasted data.");
    }

    return normalized;
  } catch (error) {
    if (error instanceof SpreadsheetImportError) throw error;
    throw new SpreadsheetImportError("Could not parse the pasted data.");
  }
}

function findHeaderIndex(headers: string[], aliases: string[]): number | null {
  const index = headers.findIndex((header) => aliases.includes(header));
  return index >= 0 ? index : null;
}

function columnLabel(rows: string[][], columnIndex: number, hasHeaderRow: boolean): string {
  const header = hasHeaderRow ? rows[0]?.[columnIndex]?.trim() : "";
  const sampleRowIndex = hasHeaderRow ? 1 : 0;
  const sample = rows[sampleRowIndex]?.[columnIndex]?.trim() ?? "";
  const columnNumber = columnIndex + 1;

  if (header) return `Column ${columnNumber}: ${header}`;
  if (sample) return `Column ${columnNumber}: ${sample}`;
  return `Column ${columnNumber}`;
}

export function getColumnOptions(
  rows: string[][],
  hasHeaderRow: boolean,
): { index: number; label: string }[] {
  const columnCount = Math.max(...rows.map((row) => row.length), 0);
  return Array.from({ length: columnCount }, (_, index) => ({
    index,
    label: columnLabel(rows, index, hasHeaderRow),
  }));
}

export function guessDemandMapping(headerRow: string[]): DemandColumnMapping {
  const headers = headerRow.map(normalizeHeader);
  return {
    name: findHeaderIndex(headers, ["name", "piece", "piece name", "label", "description"]),
    length: findHeaderIndex(headers, [
      "length",
      "length ft",
      "length feet",
      "length (ft)",
      "length (feet)",
      "size",
    ]),
    quantity: findHeaderIndex(headers, ["quantity", "qty", "count", "amount"]),
  };
}

export function guessStockMapping(headerRow: string[]): StockColumnMapping {
  const headers = headerRow.map(normalizeHeader);
  const symmetric = findHeaderIndex(headers, [
    "tolerance",
    "tolerance in",
    "tolerance (in)",
    "tolerance +/-",
    "tolerance ±",
  ]);

  const minus = findHeaderIndex(headers, [
    "tolerance minus",
    "tolerance minus in",
    "tolerance minus (in)",
    "tol minus",
    "minus tolerance",
  ]);
  const plus = findHeaderIndex(headers, [
    "tolerance plus",
    "tolerance plus in",
    "tolerance plus (in)",
    "tol plus",
    "plus tolerance",
  ]);

  return {
    label: findHeaderIndex(headers, ["label", "name", "stock", "description"]),
    length: findHeaderIndex(headers, [
      "length",
      "length ft",
      "length feet",
      "length (ft)",
      "length (feet)",
      "size",
    ]),
    cost: findHeaderIndex(headers, ["cost", "price", "unit cost", "cost usd"]),
    toleranceMinus: minus ?? symmetric,
    tolerancePlus: plus ?? symmetric,
  };
}

export function guessStockMappingWithSymmetric(headerRow: string[]): StockColumnMapping {
  return guessStockMapping(headerRow);
}

function parseLengthCell(value: string, unit: LengthUnit = "feet"): number | null {
  return parseLengthWithUnit(value, unit);
}

function parseNumberCell(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function cellValue(row: string[], columnIndex: number | null): string {
  if (columnIndex === null || columnIndex < 0) return "";
  return row[columnIndex] ?? "";
}

function normalizeMappingIndex(index: number | null): number | null {
  return index !== null && index >= 0 ? index : null;
}

export function importDemandsFromPaste(
  rows: string[][],
  mapping: DemandColumnMapping,
  options: {
    hasHeaderRow: boolean;
    lengthUnit?: LengthUnit;
    defaults?: Partial<DemandImportDefaults>;
  } = {
    hasHeaderRow: false,
  },
): DemandItem[] {
  const defaults: DemandImportDefaults = {
    name: options.defaults?.name ?? "Piece",
    quantity: options.defaults?.quantity ?? 1,
  };

  const nameCol = normalizeMappingIndex(mapping.name);
  const lengthCol = normalizeMappingIndex(mapping.length);
  const quantityCol = normalizeMappingIndex(mapping.quantity);
  const dataRows = options.hasHeaderRow ? rows.slice(1) : rows;
  const demands: DemandItem[] = [];

  dataRows.forEach((row) => {
    if (!row.some((cell) => cell.trim())) return;

    const nameRaw = cellValue(row, nameCol);
    const lengthRaw = cellValue(row, lengthCol);
    const quantityRaw = cellValue(row, quantityCol);

    const name = nameRaw.trim() || `${defaults.name} ${demands.length + 1}`;
    const length = lengthCol !== null ? parseLengthCell(lengthRaw, options.lengthUnit ?? "feet") : null;
    const parsedQuantity = quantityCol !== null ? parseNumberCell(quantityRaw) : null;
    const quantity =
      parsedQuantity !== null && parsedQuantity > 0 && Number.isInteger(parsedQuantity)
        ? parsedQuantity
        : defaults.quantity;

    if (length === null || length <= 0) {
      return;
    }

    demands.push({
      id: createId(),
      name,
      length,
      quantity,
    });
  });

  if (demands.length === 0) {
    throw new SpreadsheetImportError(
      "No rows were imported. Map at least the Length column and include one or more data rows.",
    );
  }

  return demands;
}

export function importStocksFromPaste(
  rows: string[][],
  mapping: StockColumnMapping,
  options: {
    hasHeaderRow: boolean;
    lengthUnit?: LengthUnit;
    defaults?: Partial<StockImportDefaults>;
  } = {
    hasHeaderRow: false,
  },
): StockOption[] {
  const defaults: StockImportDefaults = {
    label: options.defaults?.label ?? "Stock",
    cost: options.defaults?.cost ?? 0,
    toleranceMinus: options.defaults?.toleranceMinus ?? 0,
    tolerancePlus: options.defaults?.tolerancePlus ?? 0,
  };

  const labelCol = normalizeMappingIndex(mapping.label);
  const lengthCol = normalizeMappingIndex(mapping.length);
  const costCol = normalizeMappingIndex(mapping.cost);
  const tolMinusCol = normalizeMappingIndex(mapping.toleranceMinus);
  const tolPlusCol = normalizeMappingIndex(mapping.tolerancePlus);
  const dataRows = options.hasHeaderRow ? rows.slice(1) : rows;
  const stocks: StockOption[] = [];

  dataRows.forEach((row) => {
    if (!row.some((cell) => cell.trim())) return;

    const labelRaw = cellValue(row, labelCol);
    const lengthRaw = cellValue(row, lengthCol);
    const costRaw = cellValue(row, costCol);
    const tolMinusRaw = cellValue(row, tolMinusCol);
    const tolPlusRaw = cellValue(row, tolPlusCol);

    const label = labelRaw.trim() || `${defaults.label} ${stocks.length + 1}`;
    const length = lengthCol !== null ? parseLengthCell(lengthRaw, options.lengthUnit ?? "feet") : null;
    const parsedCost = costCol !== null ? parseNumberCell(costRaw) : null;
    const cost = parsedCost !== null && parsedCost >= 0 ? parsedCost : defaults.cost;

    const toleranceMinus =
      tolMinusCol !== null ? Math.max(0, parseNumberCell(tolMinusRaw) ?? defaults.toleranceMinus) : defaults.toleranceMinus;
    const tolerancePlus =
      tolPlusCol !== null ? Math.max(0, parseNumberCell(tolPlusRaw) ?? defaults.tolerancePlus) : defaults.tolerancePlus;

    if (length === null || length <= 0) {
      return;
    }

    stocks.push({
      id: createId(),
      label,
      length,
      cost,
      toleranceMinus,
      tolerancePlus,
    });
  });

  if (stocks.length === 0) {
    throw new SpreadsheetImportError(
      "No rows were imported. Map at least the Length column and include one or more data rows.",
    );
  }

  return stocks;
}

export const DEMAND_IMPORT_FIELDS = [
  { key: "name" as const, label: "Name", defaultHint: 'Default: "Piece 1", "Piece 2", …' },
  { key: "length" as const, label: "Length", defaultHint: "Required — rows without length are skipped" },
  { key: "quantity" as const, label: "Quantity", defaultHint: "Default: 1" },
];

export const STOCK_IMPORT_FIELDS = [
  { key: "label" as const, label: "Label", defaultHint: 'Default: "Stock 1", "Stock 2", …' },
  { key: "length" as const, label: "Length", defaultHint: "Required — rows without length are skipped" },
  { key: "cost" as const, label: "Cost", defaultHint: "Default: 0" },
  { key: "toleranceMinus" as const, label: "Tolerance minus (in)", defaultHint: "Default: 0" },
  { key: "tolerancePlus" as const, label: "Tolerance plus (in)", defaultHint: "Default: 0" },
];

export { UNMAPPED };
