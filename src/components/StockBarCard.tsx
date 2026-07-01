"use client";

import type { StockUsage } from "@/lib/types";
import { formatCurrency, formatLength } from "@/lib/units";

const CUT_COLORS = [
  "#2563eb",
  "#0891b2",
  "#059669",
  "#d97706",
  "#db2777",
  "#7c3aed",
  "#dc2626",
];

type StockBarCardProps = {
  stock: StockUsage;
  index: number;
};

export function StockBarCard({ stock, index }: StockBarCardProps) {
  const barLength = stock.effectiveLength ?? stock.stockLength;
  const safeWaste = Math.max(0, stock.waste);
  const cutWidthTotal = stock.cuts.reduce((sum, cut) => sum + cut.length, 0);
  const kerfWidth = Math.max(0, stock.usedLength - cutWidthTotal);

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Bar {index + 1}</h3>
          <p className="text-sm text-muted">
            {formatLength(stock.stockLength)} stock
            {stock.effectiveLength !== undefined
              ? ` · planned at ${formatLength(stock.effectiveLength)}`
              : ""}{" "}
            · {formatCurrency(stock.cost)} · waste {formatLength(safeWaste)}
          </p>
        </div>
      </div>

      <div
        className="mb-4 flex h-10 overflow-hidden rounded-lg border border-border bg-slate-100"
        aria-label={`Cut layout for bar ${index + 1}`}
      >
        {stock.cuts.map((cut, cutIndex) => {
          const widthPercent = (cut.length / barLength) * 100;
          const color = CUT_COLORS[cutIndex % CUT_COLORS.length];
          return (
            <div
              key={`${cut.name}-${cutIndex}`}
              className="flex min-w-0 items-center justify-center px-1 text-[10px] font-medium text-white"
              style={{ width: `${widthPercent}%`, backgroundColor: color }}
              title={`${cut.name} (${formatLength(cut.length)})`}
            >
              <span className="truncate">{cut.name}</span>
            </div>
          );
        })}
        {kerfWidth > 0 ? (
          <div
            className="flex min-w-[1px] items-center justify-center bg-slate-400/70"
            style={{ width: `${(kerfWidth / barLength) * 100}%` }}
            title={`Kerf (${formatLength(kerfWidth)})`}
          />
        ) : null}
        {safeWaste > 0 ? (
          <div
            className="flex min-w-[2rem] items-center justify-center bg-[var(--waste)] px-1 text-[10px] text-slate-700"
            style={{ width: `${(safeWaste / barLength) * 100}%` }}
            title={`Waste (${formatLength(safeWaste)})`}
          >
            waste
          </div>
        ) : null}
      </div>

      <ul className="space-y-1 text-sm">
        {stock.cuts.map((cut, cutIndex) => (
          <li key={`${cut.name}-${cutIndex}`} className="flex justify-between gap-3">
            <span>{cut.name}</span>
            <span className="text-muted">{formatLength(cut.length)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
