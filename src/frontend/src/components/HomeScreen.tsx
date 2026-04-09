import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { USD_RATES, getLiveRates } from "../utils/fxRates";
import { DonutChart } from "./DonutChart";
import { LearnSection } from "./LearnSection";

// ─── Currency to USD conversion ───────────────────────────────────────────────
function toUSD(amount: number, currency: string): number {
  const rates = getLiveRates();
  const rate = rates[currency] ?? USD_RATES[currency] ?? 1;
  return amount * rate;
}

// ─── Actor types ──────────────────────────────────────────────────────────────
interface WalletTransaction {
  id: string;
  txType: string;
  currency: string;
  amount: number;
  date: string;
  desc: string;
  status: string;
}

interface WalletActor {
  getWalletBalances: () => Promise<{ currency: string; amount: number }[]>;
  getWalletTransactions?: () => Promise<WalletTransaction[]>;
}

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatUSD(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SparkLine() {
  return (
    <svg
      viewBox="0 0 120 36"
      width="120"
      height="36"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A1400" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1A1400" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points="0,28 18,22 36,25 54,15 72,18 90,8 108,4 120,2"
        fill="none"
        stroke="#1A1400"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface HomeScreenProps {
  hideBalance?: boolean;
  isLoggedIn?: boolean;
  displayName?: string;
  actor?: WalletActor | null;
  identity?: unknown;
  activeTab?: string;
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
export function HomeScreen({
  hideBalance = false,
  isLoggedIn = false,
  displayName = "",
  actor: walletActor = null,
  identity,
}: HomeScreenProps) {
  // ─── Wallet balance state ─────────────────────────────────────────────────
  const [walletBalances, setWalletBalances] = useState<
    { currency: string; amount: number }[]
  >([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [recentTxs, setRecentTxs] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: identity triggers login refresh
  useEffect(() => {
    if (!isLoggedIn || !walletActor) {
      setWalletBalances([]);
      setRecentTxs([]);
      return;
    }
    let cancelled = false;
    setBalancesLoading(true);
    setTxLoading(true);

    const walletFetch = Promise.all([
      walletActor
        .getWalletBalances()
        .catch(() => [] as { currency: string; amount: number }[]),
      walletActor.getWalletTransactions
        ? (
            walletActor as WalletActor & {
              getWalletTransactions: () => Promise<WalletTransaction[]>;
            }
          )
            .getWalletTransactions()
            .catch(() => [] as WalletTransaction[])
        : Promise.resolve([] as WalletTransaction[]),
    ]);

    const timeout = new Promise<
      [{ currency: string; amount: number }[], WalletTransaction[]]
    >((resolve) => setTimeout(() => resolve([[], []]), 8000));

    Promise.race([walletFetch, timeout])
      .then(([balances, txs]) => {
        if (!cancelled) {
          setWalletBalances(balances as { currency: string; amount: number }[]);
          setBalancesLoading(false);
          const allTxs = txs as WalletTransaction[];
          setRecentTxs(allTxs.slice(-3).reverse());
          setTxLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBalancesLoading(false);
          setTxLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, walletActor, identity]);

  // ─── Portfolio figures ────────────────────────────────────────────────────
  const totalPortfolioUSD = walletBalances.reduce((sum, b) => {
    return sum + toUSD(b.amount, b.currency);
  }, 0);

  const usdBalance =
    walletBalances.find((b) => b.currency === "USD")?.amount ?? 0;

  // ─── Welcome heading ──────────────────────────────────────────────────────
  function renderWelcomeHeading() {
    if (isLoggedIn && displayName) {
      return (
        <h1
          className="text-3xl lg:text-4xl font-bold mb-1"
          style={{ color: "#E8E8E8" }}
        >
          Welcome back, <span style={{ color: "#D4AF37" }}>{displayName}</span>
        </h1>
      );
    }
    if (isLoggedIn) {
      return (
        <h1
          className="text-3xl lg:text-4xl font-bold mb-1"
          style={{ color: "#E8E8E8" }}
        >
          Welcome back
        </h1>
      );
    }
    return (
      <h1
        className="text-3xl lg:text-4xl font-bold mb-1"
        style={{ color: "#E8E8E8" }}
      >
        Welcome to Stancard
      </h1>
    );
  }

  // ─── Portfolio balance area ────────────────────────────────────────────────
  function renderPortfolioBalance() {
    if (!isLoggedIn) {
      return (
        <div className="py-4 text-center" data-ocid="portfolio.loading_state">
          <p style={{ color: "#3A2A00", fontSize: "14px", fontWeight: 500 }}>
            Sign in to view your portfolio
          </p>
        </div>
      );
    }

    if (balancesLoading) {
      return (
        <div className="py-1" data-ocid="portfolio.loading_state">
          <div
            className="h-10 rounded-lg mb-2 animate-pulse"
            style={{ background: "rgba(0,0,0,0.15)", width: "60%" }}
          />
          <div
            className="h-4 rounded animate-pulse"
            style={{ background: "rgba(0,0,0,0.15)", width: "45%" }}
          />
        </div>
      );
    }

    return (
      <>
        <div
          className="text-4xl lg:text-5xl font-bold tracking-tight mb-2"
          style={{ color: "#111111" }}
          data-ocid="portfolio.card"
        >
          {hideBalance ? "••••••" : `$${formatUSD(totalPortfolioUSD)}`}
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm" style={{ color: "#2A1E00" }}>
            Available Balance:{" "}
            <span className="font-semibold">
              {hideBalance ? "••••••" : `$${formatUSD(usdBalance)}`}
            </span>
          </span>
        </div>
      </>
    );
  }

  const mainContent = (
    <>
      {/* Welcome Section */}
      <section
        className="mb-6 animate-fade-in"
        style={{ animationDelay: "0ms" }}
      >
        {renderWelcomeHeading()}
        <p
          className="text-base font-semibold mb-1 text-gold-gradient"
          style={{ fontStyle: "normal" }}
        >
          Your World. Your Wealth.
        </p>
        <p className="text-xs" style={{ color: "#7A7A7A" }}>
          Stancard — Premium Financial Platform by Stancard Space Ltd
        </p>
      </section>

      {/* Gold Portfolio Card */}
      <section
        className="mb-6 rounded-2xl p-5 lg:p-6 bg-gold-gradient shadow-gold animate-fade-in"
        style={{ animationDelay: "80ms" }}
        aria-label="Portfolio value card"
        data-ocid="portfolio.card"
      >
        <div className="flex items-start justify-between mb-1">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#2A1E00", letterSpacing: "0.14em" }}
          >
            Total Portfolio Value
          </span>
          <span
            className="text-[11px] font-medium"
            style={{ color: "#3A2A00" }}
          >
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })}
          </span>
        </div>

        {renderPortfolioBalance()}

        {isLoggedIn && !balancesLoading && (
          <div className="flex items-end justify-end opacity-60">
            <SparkLine />
          </div>
        )}
      </section>

      {/* Financial Education + Glossary */}
      <section
        className="mb-6 animate-fade-in"
        style={{ animationDelay: "120ms" }}
      >
        <LearnSection />
      </section>

      {/* Recent Activity */}
      <section
        className="mb-6 animate-fade-in"
        style={{ animationDelay: "160ms" }}
      >
        <h2
          className="text-base lg:text-lg font-semibold mb-3"
          style={{ color: "#D4AF37" }}
        >
          Recent Activity
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #1A1A1A" }}
          data-ocid="activity.list"
        >
          {!isLoggedIn ? (
            <div
              className="flex items-center px-4 py-4"
              style={{ background: "#0F0F0F" }}
              data-ocid="activity.empty_state"
            >
              <p className="text-sm" style={{ color: "#4A4A4A" }}>
                Sign in to view recent activity
              </p>
            </div>
          ) : txLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3.5 animate-pulse"
                  style={{
                    background: "#0F0F0F",
                    borderBottom: i < 3 ? "1px solid #1A1A1A" : "none",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0"
                    style={{ background: "#1A1A1A" }}
                  />
                  <div className="flex-1">
                    <div
                      className="h-3 rounded mb-1.5"
                      style={{ background: "#1A1A1A", width: "60%" }}
                    />
                    <div
                      className="h-2.5 rounded"
                      style={{ background: "#1A1A1A", width: "35%" }}
                    />
                  </div>
                  <div
                    className="h-3 rounded flex-shrink-0"
                    style={{ background: "#1A1A1A", width: "60px" }}
                  />
                </div>
              ))}
            </>
          ) : recentTxs.length === 0 ? (
            <div
              className="flex items-center px-4 py-4"
              style={{ background: "#0F0F0F" }}
              data-ocid="activity.empty_state"
            >
              <p className="text-sm" style={{ color: "#4A4A4A" }}>
                No transactions yet
              </p>
            </div>
          ) : (
            recentTxs.map((tx, index) => {
              const isReceive = tx.txType === "receive" || tx.txType === "fund";
              const sym = CURRENCY_SYMBOL_MAP[tx.currency] ?? tx.currency;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3.5 activity-row transition-colors"
                  style={{
                    background: "#0F0F0F",
                    borderBottom:
                      index < recentTxs.length - 1
                        ? "1px solid #1A1A1A"
                        : "none",
                  }}
                  data-ocid={`activity.item.${index + 1}`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "#1E1E1E" }}
                  >
                    {isReceive ? (
                      <ArrowUpRight size={14} style={{ color: "#D4AF37" }} />
                    ) : (
                      <ArrowDownRight size={14} style={{ color: "#9A9A9A" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "#E8E8E8" }}
                    >
                      {tx.desc || tx.txType}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#6C6C6C" }}>
                      {tx.txType}
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold flex-shrink-0"
                    style={{ color: isReceive ? "#D4AF37" : "#9A9A9A" }}
                  >
                    {isReceive ? "+" : "-"}
                    {sym}
                    {tx.amount.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Investment Insights */}
      <section
        className="mb-6 animate-fade-in"
        style={{ animationDelay: "240ms" }}
      >
        <h2
          className="text-base lg:text-lg font-semibold mb-4"
          style={{ color: "#D4AF37" }}
        >
          Investment Insights
        </h2>
        <div
          className="rounded-xl p-4 lg:p-6"
          style={{ background: "#0F0F0F", border: "1px solid #1A1A1A" }}
          data-ocid="insights.panel"
        >
          <DonutChart
            balances={walletBalances}
            isLoggedIn={isLoggedIn}
            loading={balancesLoading}
            liveRates={getLiveRates()}
          />
        </div>
      </section>

      <div style={{ height: "16px" }} />
    </>
  );

  return (
    <main className="flex-1 min-h-0 flex flex-col px-5 pt-4 pb-4 overflow-y-auto lg:overflow-visible lg:flex-none lg:block">
      {/* Mobile + Desktop: single column layout */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">
        <div>{mainContent}</div>
        {/* Desktop right column placeholder for balance */}
        <div className="hidden lg:block lg:sticky" style={{ top: 16 }} />
      </div>
    </main>
  );
}
