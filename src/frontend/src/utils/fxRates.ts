// Shared USD conversion rates — used by HomeScreen and DonutChart
// These are fallback rates; live rates should be passed as props when available.
export const USD_RATES: Record<string, number> = {
  NGN: 1 / 1600,
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  CNY: 0.138,
};
