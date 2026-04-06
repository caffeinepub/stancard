import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { _SERVICE } from "../declarations/backend.did.d.ts";
import type {
  CryptoQuote,
  ForexRate,
  MarketData,
  StockQuote,
} from "../declarations/backend.did.d.ts";
import { useActor } from "../hooks/useActor";
import {
  ExpandedChartModal,
  Sparkline,
  generateSparklineData,
} from "./Sparkline";

// Local type for backend actor with historical prices support
type ActorWithHistorical = {
  getHistoricalPrices: (symbol: string) => Promise<number[]>;
};

// ─── Mock fallback data ─────────────────────────────────────────────────────
const MOCK_DATA: MarketData = {
  success: false,
  lastUpdated: BigInt(Date.now()),
  stocks: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 172.62,
      changesPercentage: 1.24,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      price: 141.8,
      changesPercentage: -0.58,
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      price: 247.15,
      changesPercentage: 3.12,
    },
    {
      symbol: "AMZN",
      name: "Amazon.com",
      price: 185.4,
      changesPercentage: 0.87,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corp.",
      price: 415.2,
      changesPercentage: -0.32,
    },
    {
      symbol: "META",
      name: "Meta Platforms",
      price: 521.75,
      changesPercentage: 2.41,
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      price: 875.4,
      changesPercentage: 4.68,
    },
    {
      symbol: "NFLX",
      name: "Netflix Inc.",
      price: 628.9,
      changesPercentage: -1.15,
    },
    {
      symbol: "BABA",
      name: "Alibaba Group",
      price: 78.35,
      changesPercentage: -0.94,
    },
    {
      symbol: "TSM",
      name: "Taiwan Semiconductor",
      price: 142.6,
      changesPercentage: 1.83,
    },
  ],
  forex: [
    { symbol: "USD", rate: 1.0 },
    { symbol: "NGN", rate: 1580.0 },
    { symbol: "EUR", rate: 0.918 },
    { symbol: "GBP", rate: 0.792 },
    { symbol: "CNY", rate: 7.24 },
    { symbol: "JPY", rate: 151.6 },
  ],
  crypto: [
    { symbol: "BTC", name: "Bitcoin", price: 67450.0, changesPercentage: 2.34 },
    {
      symbol: "ETH",
      name: "Ethereum",
      price: 3512.8,
      changesPercentage: -0.87,
    },
    { symbol: "BNB", name: "BNB", price: 412.5, changesPercentage: 1.12 },
  ],
};

// ─── Constants ────────────────────────────────────────────────────────────────────────
const FOREX_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  NGN: "🇳🇬",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  CNY: "🇨🇳",
  JPY: "🇯🇵",
};

const CRYPTO_SYMBOLS = ["BTC", "ETH", "BNB"];

// Symbols to fetch real historical data for (stocks + crypto)
const HISTORICAL_SYMBOLS = [
  "AAPL",
  "GOOGL",
  "TSLA",
  "AMZN",
  "MSFT",
  "META",
  "NVDA",
  "NFLX",
  "BABA",
  "TSM",
  "BTC",
  "ETH",
  "BNB",
];

const ALL_CURRENCIES = [
  "USD",
  "NGN",
  "EUR",
  "GBP",
  "CNY",
  "JPY",
  "BTC",
  "ETH",
  "BNB",
];

const SKELETON_IDS_SM = ["sk-s1", "sk-s2", "sk-s3", "sk-s4", "sk-s5", "sk-s6"];
const SKELETON_IDS_MD = ["sk-m1", "sk-m2", "sk-m3"];

// ─── Expanded item type ───────────────────────────────────────────────────────────
type ExpandedItem = {
  symbol: string;
  name: string;
  currentPrice: string;
  changePercent: number;
  sparkData: number[];
  priceUnit?: string;
} | null;

// ─── Helper functions ────────────────────────────────────────────────────────────────────
function formatPrice(price: number, symbol?: string): string {
  if (CRYPTO_SYMBOLS.includes(symbol ?? "")) {
    if (price >= 1000)
      return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatForexRate(rate: number): string {
  if (rate >= 1000)
    return rate.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (rate < 0.01) return rate.toFixed(6);
  return rate.toFixed(4);
}

function getTimeAgo(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Updated just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `Updated ${diffHr}h ago`;
}

function convertCurrency(
  amount: number,
  from: string,
  to: string,
  forex: ForexRate[],
  crypto: CryptoQuote[],
): number {
  if (from === to) return amount;
  const getForexRate = (sym: string): number | null => {
    const found = forex.find((f) => f.symbol === sym);
    return found ? found.rate : null;
  };
  const getCryptoPrice = (sym: string): number | null => {
    const found = crypto.find((c) => c.symbol === sym);
    return found ? found.price : null;
  };
  const fromIsCrypto = CRYPTO_SYMBOLS.includes(from);
  const toIsCrypto = CRYPTO_SYMBOLS.includes(to);
  let amountInUSD = 0;
  if (fromIsCrypto) {
    const price = getCryptoPrice(from);
    if (!price) return 0;
    amountInUSD = amount * price;
  } else {
    const rate = getForexRate(from);
    if (!rate) return 0;
    amountInUSD = amount / rate;
  }
  if (toIsCrypto) {
    const price = getCryptoPrice(to);
    if (!price) return 0;
    return amountInUSD / price;
  }
  const rate = getForexRate(to);
  if (!rate) return 0;
  return amountInUSD * rate;
}

function formatConverted(value: number, to: string): string {
  if (CRYPTO_SYMBOLS.includes(to)) {
    if (value < 0.0001) return value.toExponential(4);
    return value.toFixed(8);
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────────────────
function SkeletonCard({ wide }: { wide?: boolean }) {
  return (
    <div
      className="rounded-2xl p-4 overflow-hidden relative"
      style={{ background: "#0F0F0F", border: "1px solid #1A1A1A" }}
    >
      <div className="animate-pulse">
        <div
          className="h-3 rounded mb-3"
          style={{ background: "#1A1A1A", width: wide ? "60%" : "40%" }}
        />
        <div
          className="h-5 rounded mb-2"
          style={{ background: "#1A1A1A", width: "80%" }}
        />
        <div
          className="h-3 rounded"
          style={{ background: "#1A1A1A", width: "50%" }}
        />
      </div>
    </div>
  );
}

function StockCard({
  stock,
  onTap,
  historicalData,
}: {
  stock: StockQuote;
  onTap: () => void;
  historicalData: Record<string, number[]>;
}) {
  const isPositive = stock.changesPercentage >= 0;
  const monogram = stock.symbol.slice(0, 2).toUpperCase();
  const [hovered, setHovered] = useState(false);
  const realData = historicalData[stock.symbol];
  const sparkData =
    realData && realData.length > 0
      ? realData
      : generateSparklineData(
          stock.symbol,
          stock.price,
          stock.changesPercentage,
        );

  return (
    <button
      type="button"
      className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer text-left"
      style={{
        background: "#0F0F0F",
        border: hovered ? "1px solid #3A3000" : "1px solid #1A1A1A",
      }}
      onClick={onTap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`View ${stock.symbol} chart`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{
          background: "#1A1400",
          color: "#D4AF37",
          border: "1px solid #2A2000",
        }}
      >
        {monogram}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "#D4AF37" }}>
          {stock.symbol}
        </p>
        <p className="text-xs truncate" style={{ color: "#6C6C6C" }}>
          {stock.name}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: "#E8E8E8" }}>
          {formatPrice(stock.price)}
        </p>
        <span
          className="flex items-center justify-end gap-0.5 text-xs font-semibold mb-1"
          style={{ color: isPositive ? "#22C55E" : "#EF4444" }}
        >
          {isPositive ? (
            <ArrowUpRight size={11} />
          ) : (
            <ArrowDownRight size={11} />
          )}
          {Math.abs(stock.changesPercentage).toFixed(2)}%
        </span>
        <div style={{ opacity: 0.85 }}>
          <Sparkline data={sparkData} width={80} height={30} />
        </div>
      </div>
    </button>
  );
}

function ForexCard({ forex, onTap }: { forex: ForexRate; onTap: () => void }) {
  const flag = FOREX_FLAGS[forex.symbol] ?? "";
  const isBase = forex.symbol === "USD";
  const [hovered, setHovered] = useState(false);
  const sparkData = generateSparklineData(forex.symbol, forex.rate, 0);

  return (
    <button
      type="button"
      className="w-full rounded-2xl p-4 transition-all cursor-pointer text-left"
      style={{
        background: "#0F0F0F",
        border: hovered
          ? "1px solid #3A3000"
          : isBase
            ? "1px solid #2A2000"
            : "1px solid #1A1A1A",
      }}
      onClick={onTap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`View ${forex.symbol} chart`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{flag}</span>
        <span className="text-sm font-bold" style={{ color: "#D4AF37" }}>
          {forex.symbol}
        </span>
      </div>
      {isBase ? (
        <p className="text-xs" style={{ color: "#9A9A9A" }}>
          Base Currency
        </p>
      ) : (
        <>
          <p className="text-xs font-semibold" style={{ color: "#E8E8E8" }}>
            {formatForexRate(forex.rate)}
            <span className="font-normal" style={{ color: "#6C6C6C" }}>
              {" "}
              / USD
            </span>
          </p>
          <div className="mt-2" style={{ opacity: 0.85 }}>
            <Sparkline data={sparkData} width={72} height={26} />
          </div>
        </>
      )}
    </button>
  );
}

function CryptoCard({
  crypto,
  onTap,
  historicalData,
}: {
  crypto: CryptoQuote;
  onTap: () => void;
  historicalData: Record<string, number[]>;
}) {
  const isPositive = crypto.changesPercentage >= 0;
  const [hovered, setHovered] = useState(false);
  const realData = historicalData[crypto.symbol];
  const sparkData =
    realData && realData.length > 0
      ? realData
      : generateSparklineData(
          crypto.symbol,
          crypto.price,
          crypto.changesPercentage,
        );

  return (
    <button
      type="button"
      className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer text-left"
      style={{
        background: "#0F0F0F",
        border: hovered ? "1px solid #3A3000" : "1px solid #1A1A1A",
      }}
      onClick={onTap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`View ${crypto.symbol} chart`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{
          background: "#0D1A0D",
          color: "#22C55E",
          border: "1px solid #1A3A1A",
        }}
      >
        {crypto.symbol.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "#D4AF37" }}>
          {crypto.symbol}
        </p>
        <p className="text-xs" style={{ color: "#6C6C6C" }}>
          {crypto.name}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: "#E8E8E8" }}>
          {formatPrice(crypto.price, crypto.symbol)}
        </p>
        <span
          className="flex items-center justify-end gap-0.5 text-xs font-semibold mb-1"
          style={{ color: isPositive ? "#22C55E" : "#EF4444" }}
        >
          {isPositive ? (
            <ArrowUpRight size={11} />
          ) : (
            <ArrowDownRight size={11} />
          )}
          {Math.abs(crypto.changesPercentage).toFixed(2)}%
        </span>
        <div style={{ opacity: 0.85 }}>
          <Sparkline data={sparkData} width={80} height={30} />
        </div>
      </div>
    </button>
  );
}

function CurrencyConverter({
  forex,
  crypto,
}: {
  forex: ForexRate[];
  crypto: CryptoQuote[];
}) {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("NGN");
  const [amount, setAmount] = useState("1");

  const numericAmount = Number.parseFloat(amount) || 0;
  const result = convertCurrency(
    numericAmount,
    fromCurrency,
    toCurrency,
    forex,
    crypto,
  );

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getCurrencyLabel = (sym: string) => {
    const flag = FOREX_FLAGS[sym];
    if (flag) return `${flag} ${sym}`;
    return sym;
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#0F0F0F", border: "1px solid #1A1A1A" }}
      data-ocid="converter.panel"
    >
      <h3
        className="text-[10px] font-bold uppercase tracking-widest mb-4"
        style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
      >
        Currency Converter
      </h3>

      <div className="mb-3">
        <p
          className="block text-[10px] uppercase tracking-widest mb-1.5"
          style={{ color: "#6C6C6C" }}
        >
          From
        </p>
        <div className="flex gap-2">
          <select
            id="from-currency"
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className="flex-shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none appearance-none cursor-pointer"
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: "#D4AF37",
              width: "100px",
            }}
            data-ocid="converter.select"
          >
            {ALL_CURRENCIES.map((c) => (
              <option
                key={c}
                value={c}
                style={{ background: "#1A1A1A", color: "#E8E8E8" }}
              >
                {getCurrencyLabel(c)}
              </option>
            ))}
          </select>
          <input
            id="from-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
            placeholder="Enter amount"
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: "#E8E8E8",
            }}
            data-ocid="converter.input"
          />
        </div>
      </div>

      <div className="flex justify-center my-3">
        <button
          type="button"
          onClick={handleSwap}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: "#1A1400",
            border: "1px solid #2A2000",
            color: "#D4AF37",
          }}
          data-ocid="converter.toggle"
          aria-label="Swap currencies"
        >
          <ArrowLeftRight size={14} />
        </button>
      </div>

      <div className="mb-5">
        <p
          className="block text-[10px] uppercase tracking-widest mb-1.5"
          style={{ color: "#6C6C6C" }}
        >
          To
        </p>
        <div className="flex gap-2">
          <select
            id="to-currency"
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            className="flex-shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none appearance-none cursor-pointer"
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: "#D4AF37",
              width: "100px",
            }}
            data-ocid="converter.select"
          >
            {ALL_CURRENCIES.map((c) => (
              <option
                key={c}
                value={c}
                style={{ background: "#1A1A1A", color: "#E8E8E8" }}
              >
                {getCurrencyLabel(c)}
              </option>
            ))}
          </select>
          <div
            className="flex-1 rounded-xl px-3 py-2.5 text-sm font-bold"
            style={{
              background: "#141400",
              border: "1px solid #2A2000",
              color: "#D4AF37",
            }}
          >
            {numericAmount > 0 ? formatConverted(result, toCurrency) : "—"}
          </div>
        </div>
      </div>

      {numericAmount > 0 && (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "#0A0A00", border: "1px solid #2A2000" }}
          data-ocid="converter.success_state"
        >
          <p className="text-xs mb-1" style={{ color: "#6C6C6C" }}>
            {numericAmount} {fromCurrency} =
          </p>
          <p className="text-2xl font-bold" style={{ color: "#D4AF37" }}>
            {formatConverted(result, toCurrency)}{" "}
            <span className="text-base" style={{ color: "#9A9A9A" }}>
              {toCurrency}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main MarketsScreen ──────────────────────────────────────────────────────────────────────────
interface MarketsScreenProps {
  isActive: boolean;
  // ISSUE 14: callback to navigate to Alerts tab
  onSetAlert?: () => void;
}

export function MarketsScreen({ isActive, onSetAlert }: MarketsScreenProps) {
  const { actor, isFetching } = useActor();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "stocks" | "forex" | "crypto" | "convert"
  >("stocks");
  const [expandedItem, setExpandedItem] = useState<ExpandedItem>(null);
  const [historicalData, setHistoricalData] = useState<
    Record<string, number[]>
  >({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFetchedOnce = useRef(false);
  const marketDataRef = useRef<MarketData | null>(null);
  const historicalLoaded = useRef(false);
  const prevActorRef = useRef<typeof actor>(actor);

  marketDataRef.current = marketData;

  // ISSUE 12: Reset hasFetchedOnce when actor changes from null to truthy
  // so that after login the real market data is fetched instead of staying mock
  useEffect(() => {
    const wasNull = !prevActorRef.current;
    const isNowSet = !!actor;
    prevActorRef.current = actor;
    if (wasNull && isNowSet) {
      hasFetchedOnce.current = false;
      historicalLoaded.current = false;
    }
  }, [actor]);

  // Fetch real historical prices once per session for stocks + crypto
  const fetchHistoricalData = useCallback(async () => {
    if (!actor || historicalLoaded.current) return;
    historicalLoaded.current = true;
    try {
      const typedActor = actor as unknown as ActorWithHistorical;
      const results = await Promise.allSettled(
        HISTORICAL_SYMBOLS.map((symbol) =>
          typedActor.getHistoricalPrices(symbol).then((prices) => ({
            symbol,
            prices,
          })),
        ),
      );
      const newData: Record<string, number[]> = {};
      for (const result of results) {
        if (result.status === "fulfilled" && result.value.prices.length > 0) {
          newData[result.value.symbol] = result.value.prices;
        }
      }
      if (Object.keys(newData).length > 0) {
        setHistoricalData(newData);
      }
    } catch {
      // Silently fall back to mock sparkline data — no error shown to user
    }
  }, [actor]);

  const fetchData = useCallback(async () => {
    if (!actor) return;
    try {
      const typedActor = actor as unknown as _SERVICE;
      const data = await typedActor.getMarketData();
      setMarketData(data);
      // Fetch historical data once after first successful market data load
      if (!historicalLoaded.current) {
        fetchHistoricalData();
      }
    } catch {
      if (!marketDataRef.current) {
        setMarketData(MOCK_DATA);
      }
    } finally {
      setIsLoading(false);
    }
  }, [actor, fetchHistoricalData]);

  useEffect(() => {
    if (actor && !isFetching && !hasFetchedOnce.current) {
      hasFetchedOnce.current = true;
      fetchData();
    } else if (!actor && !isFetching && !hasFetchedOnce.current) {
      hasFetchedOnce.current = true;
      setMarketData(MOCK_DATA);
      setIsLoading(false);
    }
  }, [actor, isFetching, fetchData]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on tab activation only
  useEffect(() => {
    if (isActive && actor && !isFetching) {
      fetchData();
    }
  }, [isActive]);

  useEffect(() => {
    if (!actor || isFetching) return;
    intervalRef.current = setInterval(() => {
      fetchData();
    }, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [actor, isFetching, fetchData]);

  const data = marketData ?? MOCK_DATA;
  const lastUpdatedMs = Number(data.lastUpdated);
  const timeAgo = getTimeAgo(lastUpdatedMs);

  const tabs: Array<{
    id: "stocks" | "forex" | "crypto" | "convert";
    label: string;
  }> = [
    { id: "stocks", label: "Stocks" },
    { id: "forex", label: "Forex" },
    { id: "crypto", label: "Crypto" },
    { id: "convert", label: "Convert" },
  ];

  const makeStockItem = (stock: StockQuote) => {
    const realData = historicalData[stock.symbol];
    return {
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: formatPrice(stock.price),
      changePercent: stock.changesPercentage,
      sparkData:
        realData && realData.length > 0
          ? realData
          : generateSparklineData(
              stock.symbol,
              stock.price,
              stock.changesPercentage,
            ),
    };
  };

  const makeForexItem = (rate: ForexRate) => ({
    symbol: rate.symbol,
    name: `${rate.symbol} / USD`,
    currentPrice: formatForexRate(rate.rate),
    changePercent: 0,
    sparkData: generateSparklineData(rate.symbol, rate.rate, 0),
    priceUnit: "/ USD",
  });

  const makeCryptoItem = (coin: CryptoQuote) => {
    const realData = historicalData[coin.symbol];
    return {
      symbol: coin.symbol,
      name: coin.name,
      currentPrice: formatPrice(coin.price, coin.symbol),
      changePercent: coin.changesPercentage,
      sparkData:
        realData && realData.length > 0
          ? realData
          : generateSparklineData(
              coin.symbol,
              coin.price,
              coin.changesPercentage,
            ),
    };
  };

  return (
    <main className="flex-1 overflow-y-auto px-5 pt-4 pb-4 lg:overflow-visible">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 lg:pt-6">
        <div>
          <h1
            className="text-xl lg:text-2xl font-bold"
            style={{ color: "#E8E8E8" }}
          >
            Markets
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#6C6C6C" }}>
            {isLoading ? "Loading…" : timeAgo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <span
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                background: data.success
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(245,158,11,0.08)",
                border: data.success
                  ? "1px solid rgba(34,197,94,0.2)"
                  : "1px solid rgba(245,158,11,0.2)",
                color: data.success ? "#22C55E" : "#F59E0B",
              }}
              data-ocid={
                data.success ? "markets.success_state" : "markets.error_state"
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: data.success ? "#22C55E" : "#F59E0B" }}
              />
              {data.success ? "Live" : "Cached"}
            </span>
          )}
          <button
            type="button"
            onClick={fetchData}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: "#9A9A9A",
            }}
            data-ocid="markets.secondary_button"
            aria-label="Refresh market data"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ===== MOBILE: tabbed view ===== */}
      <div className="lg:hidden">
        <div
          className="flex mb-5 rounded-xl overflow-hidden"
          style={{
            background: "#0F0F0F",
            border: "1px solid #1A1A1A",
            padding: "3px",
          }}
          data-ocid="markets.tab"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
              style={{
                background: activeTab === tab.id ? "#1A1400" : "transparent",
                color: activeTab === tab.id ? "#D4AF37" : "#6C6C6C",
                border:
                  activeTab === tab.id
                    ? "1px solid #2A2000"
                    : "1px solid transparent",
              }}
              data-ocid={`markets.${tab.id}.tab`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "stocks" && (
          <section>
            <h2
              className="text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
            >
              Top 10 Global Stocks
            </h2>
            <div className="flex flex-col gap-2" data-ocid="stocks.list">
              {isLoading
                ? SKELETON_IDS_SM.map((id) => <SkeletonCard key={id} wide />)
                : data.stocks.map((stock, i) => (
                    <div key={stock.symbol} data-ocid={`stocks.item.${i + 1}`}>
                      <StockCard
                        stock={stock}
                        historicalData={historicalData}
                        onTap={() => setExpandedItem(makeStockItem(stock))}
                      />
                    </div>
                  ))}
            </div>
          </section>
        )}
        {activeTab === "forex" && (
          <section>
            <h2
              className="text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
            >
              Live Forex Rates
            </h2>
            <div className="grid grid-cols-2 gap-2" data-ocid="forex.list">
              {isLoading
                ? SKELETON_IDS_SM.map((id) => <SkeletonCard key={id} />)
                : data.forex.map((rate, i) => (
                    <div key={rate.symbol} data-ocid={`forex.item.${i + 1}`}>
                      <ForexCard
                        forex={rate}
                        onTap={() => setExpandedItem(makeForexItem(rate))}
                      />
                    </div>
                  ))}
            </div>
          </section>
        )}
        {activeTab === "crypto" && (
          <section>
            <h2
              className="text-[10px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
            >
              Cryptocurrency
            </h2>
            <div className="flex flex-col gap-2" data-ocid="crypto.list">
              {isLoading
                ? SKELETON_IDS_MD.map((id) => <SkeletonCard key={id} wide />)
                : data.crypto.map((coin, i) => (
                    <div key={coin.symbol} data-ocid={`crypto.item.${i + 1}`}>
                      <CryptoCard
                        crypto={coin}
                        historicalData={historicalData}
                        onTap={() => setExpandedItem(makeCryptoItem(coin))}
                      />
                    </div>
                  ))}
            </div>
          </section>
        )}
        {activeTab === "convert" && (
          <section>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {SKELETON_IDS_MD.map((id) => (
                  <SkeletonCard key={id} wide />
                ))}
              </div>
            ) : (
              <CurrencyConverter forex={data.forex} crypto={data.crypto} />
            )}
          </section>
        )}
      </div>

      {/* ===== DESKTOP: three-column grid + converter below ===== */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-3 gap-8 mb-10">
          <section>
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
            >
              Global Stocks
            </h2>
            <div className="flex flex-col gap-2" data-ocid="stocks.list">
              {isLoading
                ? SKELETON_IDS_SM.map((id) => <SkeletonCard key={id} wide />)
                : data.stocks.map((stock, i) => (
                    <div key={stock.symbol} data-ocid={`stocks.item.${i + 1}`}>
                      <StockCard
                        stock={stock}
                        historicalData={historicalData}
                        onTap={() => setExpandedItem(makeStockItem(stock))}
                      />
                    </div>
                  ))}
            </div>
          </section>

          <section>
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
            >
              Live Forex Rates
            </h2>
            <div className="grid grid-cols-2 gap-2" data-ocid="forex.list">
              {isLoading
                ? SKELETON_IDS_SM.map((id) => <SkeletonCard key={id} />)
                : data.forex.map((rate, i) => (
                    <div key={rate.symbol} data-ocid={`forex.item.${i + 1}`}>
                      <ForexCard
                        forex={rate}
                        onTap={() => setExpandedItem(makeForexItem(rate))}
                      />
                    </div>
                  ))}
            </div>
          </section>

          <section>
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
            >
              Cryptocurrency
            </h2>
            <div className="flex flex-col gap-2" data-ocid="crypto.list">
              {isLoading
                ? SKELETON_IDS_MD.map((id) => <SkeletonCard key={id} wide />)
                : data.crypto.map((coin, i) => (
                    <div key={coin.symbol} data-ocid={`crypto.item.${i + 1}`}>
                      <CryptoCard
                        crypto={coin}
                        historicalData={historicalData}
                        onTap={() => setExpandedItem(makeCryptoItem(coin))}
                      />
                    </div>
                  ))}
            </div>
          </section>
        </div>

        <section className="mb-8">
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#D4AF37", letterSpacing: "0.14em" }}
          >
            Currency Converter
          </h2>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {SKELETON_IDS_MD.map((id) => (
                <SkeletonCard key={id} wide />
              ))}
            </div>
          ) : (
            <CurrencyConverter forex={data.forex} crypto={data.crypto} />
          )}
        </section>
      </div>

      <div style={{ height: "16px" }} />

      {expandedItem && (
        <ExpandedChartModal
          isOpen={true}
          onClose={() => setExpandedItem(null)}
          symbol={expandedItem.symbol}
          name={expandedItem.name}
          currentPrice={expandedItem.currentPrice}
          changePercent={expandedItem.changePercent}
          sparkData={expandedItem.sparkData}
          priceUnit={expandedItem.priceUnit}
          onSetAlert={onSetAlert}
        />
      )}
    </main>
  );
}
