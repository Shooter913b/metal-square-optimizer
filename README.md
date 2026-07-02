# Metal Square Optimizer

A Next.js web app that finds a low-cost plan for buying metal stock and cutting the pieces you need.

## What it does

Given:

- **Demand list** — piece name, length, and quantity
- **Stock options** — purchasable bar lengths and their unit cost
- **Kerf** — material lost between cuts (default 1/8")

The app outputs:

- Total purchase cost and waste
- A **stock to buy** summary (bar length × quantity)
- A cut diagram for each bar showing which pieces come from it

## How to use

### 1. Start the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2. Enter pieces needed

In the **Pieces needed** table, add one row per piece type:

| Field | Description |
|-------|-------------|
| **Name** | Label for the cut (e.g. `Leg A`, `Crossbar`) |
| **Length (ft)** | Piece length in feet — you can also type `4' 6"` style values |
| **Qty** | How many of that piece you need |

Use **Paste import** to load many rows from Excel, Google Sheets, or CSV (see [Paste import](#paste-import) below).

### 3. Enter available stock

In the **Available stock** table, list every bar size you can purchase:

| Field | Description |
|-------|-------------|
| **Label** | Optional name (e.g. `20 ft bar`) |
| **Length (ft)** | Nominal bar length |
| **Cost** | Price per bar |
| **Tolerance − / +** | How much shorter or longer the actual bar may be vs nominal (in inches) |

The optimizer only uses stock rows with a positive length and non-negative cost.

### 4. Set options and run

In **Run optimizer**:

1. **Kerf** — blade width lost between cuts (default `0.125` = 1/8").
2. **Mode** — choose **Fast** for everyday jobs, or **Optimal** when you want a proven minimum-cost plan (slower).
3. **Consider tolerances** — when checked, plans cuts using `nominal length − minus tolerance` so the plan stays safe if the bar arrives on the short side.
4. Click **Optimize cuts**.

### 5. Read the results

After a successful run:

- **Results** shows total cost, number of bars, total waste, and any warnings.
- **Stock to buy** lists each bar length and how many to purchase.
- **Cut diagrams** below show every bar, the pieces cut from it, kerf between cuts, and leftover waste.

Your inputs are saved in `localStorage`, so refreshing the page keeps your data.

### Tips

- Lengths are stored internally in inches. The UI accepts feet (e.g. `4` or `4' 6"`). When pasting from a spreadsheet, pick **feet** or **inches** in the import dialog to match your data.
- If a piece is longer than every stock option, the optimizer will report an error — add a longer stock size or split the piece.
- Optimal mode runs on the server and may take seconds to several minutes on large jobs. Fast mode returns almost instantly.

## Paste import

Both tables support **Paste import**:

1. Copy rows from Excel, Google Sheets, or CSV
2. Paste into the dialog (any number of columns is fine)
3. Map each field to a column, or leave it as **Not mapped** to use the default
4. Choose the **length unit** (feet or inches) if you mapped a length column
5. Import

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
| **Fast** | Greedy best-fit heuristic with lookahead. Recommended for most jobs. Returns in milliseconds. |
| **Optimal** | Integer linear program via `glpk.js`. Proven minimum purchase cost for jobs up to ~30 piece types, 2,000 total pieces, and 100,000 cutting patterns. May take several minutes on large inputs. Falls back to fast mode if limits are exceeded. |

## How the algorithms work

Both modes solve the same **one-dimensional cutting stock** problem: assign every demanded piece to a purchased bar so that all quantities are met and total bar cost is as low as possible. Kerf (saw blade width) is counted between every cut on a bar.

### Fast mode (heuristic)

Fast mode is a greedy **best-fit decreasing** bin-packing algorithm with extra logic when opening a new bar.

**Step 1 — Sort pieces.** All individual pieces are expanded from the demand table (e.g. qty 3 → three separate pieces) and sorted longest-first. Packing large pieces first generally leaves more useful leftover space.

**Step 2 — Place each piece.** For the current piece:

1. **Try existing bars first.** If any already-open bar has room (including kerf), put the piece on the bar that leaves the *least* remaining space — tightest fit reduces waste.
2. **Otherwise, buy a new bar.** The algorithm must pick a stock length. It does not simply pick the cheapest or shortest option. Instead, for every stock size that can fit at least one remaining piece, it **simulates the rest of the cutting plan** — continuing to pack pieces onto open bars and opening new ones — and records the total cost of that simulation. The stock size with the lowest simulated total cost is chosen.

The simulation reuses the same best-fit rules and also considers bars that are already partially filled, so a choice like “buy one 20 ft bar now” vs “buy one 24 ft bar now” is judged by how the *entire* job finishes, not just the first cut.

**What you get:** A good, low-cost plan in milliseconds. It is not guaranteed to be the absolute cheapest — a clever combination of stock sizes can occasionally beat the greedy choice — but it is much faster than optimal mode and works well in practice.

### Optimal mode (integer linear program)

Optimal mode uses the classical **cutting stock formulation** with integer linear programming (ILP).

**Step 1 — Generate cutting patterns.** For each stock size, the app enumerates every feasible way to cut one bar: which combination of piece types (and how many of each) fit within the bar length including kerf. For example, on a 12 ft bar you might have patterns like “three 4 ft pieces” or “one 8 ft + one 4 ft”. Singleton patterns (one piece per bar) are always included so a solution is always possible.

**Step 2 — Build the ILP.** Each pattern becomes a decision variable: “how many bars do I cut using this pattern?” The objective is to **minimize total purchase cost** (sum of pattern cost × pattern count). Constraints require that the total number of each piece type produced across all chosen patterns equals the demand quantity.

**Step 3 — Solve.** The model is sent to the [GLPK](https://www.gnu.org/software/glpk/) solver (via `glpk.js` WASM) on the server. Variables are integers, so fractional bars are not allowed. When the solver finishes with an optimal status, the result is a provably minimum-cost combination of patterns.

**Step 4 — Decode to a cut plan.** Each pattern used in the solution is expanded into individual bars with named cuts, waste, and kerf — the same diagram view as fast mode.

**Limits and fallback.** Pattern generation grows quickly with many piece types and stock sizes. If the job exceeds the configured limits (30 piece types, 2,000 pieces, or 100,000 patterns), or the solver hits its 5-minute time limit without proving optimality, the app falls back to fast mode and shows a warning. A feasible plan from a timed-out solve may still be returned with a note that optimality was not proven.

## Development

```bash
npm install
npm run dev
```

### Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` — run Vitest unit tests
- `npm run lint` — ESLint

## Notes

- Lengths are stored internally in inches. The UI accepts feet (e.g. `4` or `4' 6"`).
- Inputs are saved in `localStorage` so a refresh keeps your data.
- Optimal mode runs server-side only; the browser calls `/api/optimize` so Node can load the WASM solver.

## License

MIT
