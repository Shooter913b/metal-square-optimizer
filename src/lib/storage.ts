import type { PersistedState } from "./types";
import { createDefaultState } from "./example-data";
import { STORAGE_KEY } from "./types";

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return createDefaultState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed.demands?.length || !parsed.stocks?.length) {
      return createDefaultState();
    }
    return {
      ...createDefaultState(),
      ...parsed,
      considerTolerances: parsed.considerTolerances ?? false,
      stocks: parsed.stocks.map((stock) => ({
        ...stock,
        toleranceMinus: stock.toleranceMinus ?? 0,
        tolerancePlus: stock.tolerancePlus ?? 0,
      })),
    };
  } catch {
    return createDefaultState();
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
