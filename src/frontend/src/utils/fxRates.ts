// Shared USD conversion rates — used by HomeScreen and DonutChart
// Format: 1 unit of currency = X USD
// e.g. NGN: 1/1600 means 1 NGN = 0.000625 USD
export const USD_RATES: Record<string, number> = {
  NGN: 1 / 1600,
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  CNY: 0.138,
};

// ─── Live rate store ──────────────────────────────────────────────────────────
// MarketsScreen calls updateLiveRates() after every successful market data fetch.
// HomeScreen and DonutChart call getLiveRates() to get a merged snapshot
// (live rates overlaid on static fallbacks).
let _liveRates: Record<string, number> | null = null;

/**
 * Called by MarketsScreen after a successful forex data fetch.
 * @param forexRates Array of { symbol, rate } where `rate` is units-per-USD
 *   (e.g. { symbol: "NGN", rate: 1580 } means 1580 NGN per 1 USD).
 */
export function updateLiveRates(
  forexRates: { symbol: string; rate: number }[],
): void {
  const next: Record<string, number> = {};
  for (const entry of forexRates) {
    const { symbol, rate } = entry;
    if (!symbol || !rate || rate <= 0) continue;
    if (symbol === "USD") {
      next.USD = 1;
    } else {
      // Convert from "X per USD" → "USD per 1 X"
      next[symbol] = 1 / rate;
    }
  }
  if (Object.keys(next).length > 0) {
    _liveRates = next;
  }
}

/**
 * Returns merged rates: live values overlaid on static fallbacks.
 * Always safe to call — returns USD_RATES if no live data yet.
 */
export function getLiveRates(): Record<string, number> {
  if (!_liveRates) return USD_RATES;
  return { ...USD_RATES, ..._liveRates };
}
