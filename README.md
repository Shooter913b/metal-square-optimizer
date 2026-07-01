# Metal Square Optimizer

A Next.js web app that finds a low-cost plan for buying metal stock and cutting the pieces you need.

## What it does

Given:

- **Demand list** — piece name, length, and quantity
- **Stock options** — purchasable bar lengths and their unit cost
- **Kerf** — material lost between cuts (default 1/8")

The app outputs:

- Total purchase cost
- Each stock bar to buy
- Which cuts come from each bar
- Waste per bar

## Paste import

Both tables support **Paste import**:

1. Copy rows from Excel, Google Sheets, or CSV
2. Paste into the dialog (any number of columns is fine)
3. Map each field to a column, or leave it as **Not mapped** to use the default
4. Import

**Default values when a field is not mapped:**

| Pieces needed | Default |
|---------------|---------|
| Name | Piece 1, Piece 2, … |
| Length | Required — map a column; blank cells are skipped |
| Quantity | 1 |

| Available stock | Default |
|-----------------|---------|
| Label | Stock 1, Stock 2, … |
| Length | Required — map a column; blank cells are skipped |
| Cost | 0 |
| Tolerance minus / plus | 0 |

If the first row contains headers, enable **First row contains column headers** — the tool will auto-suggest column mappings when possible.

## Stock tolerance

Each stock row can specify how much shorter (−) or longer (+) the actual bar may be vs nominal length (in inches).

Enable **Consider tolerances** before optimizing to plan cuts conservatively using `nominal length − minus tolerance`. When disabled, nominal length is used for all fit checks.

## Modes

| Mode | Description |
|------|-------------|
| **Fast** | Best-fit decreasing heuristic. Recommended for most jobs. |
| **Optimal** | Integer linear program via `glpk.js`. Exact minimum cost for jobs up to ~30 piece types, 2,000 total pieces, and 100,000 cutting patterns. May take several minutes on large inputs. Falls back to fast mode if limits are exceeded. |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` — run Vitest unit tests
- `npm run lint` — ESLint

## Notes

- Lengths are stored internally in inches. The UI accepts feet (e.g. `4` or `4' 6"`).
- Inputs are saved in `localStorage` so a refresh keeps your data.
- Optimal mode loads the WASM solver on demand to keep the initial bundle smaller.

## License

MIT
