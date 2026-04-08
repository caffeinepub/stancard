import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
// Issue 22+23: use shared fxRates to eliminate duplication with DonutChart
import { USD_RATES } from "../utils/fxRates";
import { DonutChart } from "./DonutChart";
import type { NewsArticle } from "./NewsSection";
import {
  ArticlePreviewModal,
  NewsSection,
  getArticleCategory,
} from "./NewsSection";

// ─── Local actor interface for news ──────────────────────────────────────────
interface NewsActor {
  getNewsData: () => Promise<{
    success: boolean;
    articles: NewsArticle[];
    lastUpdated: bigint;
  }>;
}

// ─── Mock fallback news ─────────────────────────────────────────────────────────────────────────────────────

const MOCK_ARTICLES: NewsArticle[] = [
  {
    title: "Global Markets Rally as Central Banks Signal Rate Cuts",
    source: "Reuters",
    url: "#",
    urlToImage: "",
    publishedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    description:
      "Major indices surged across Asia, Europe, and the US after coordinated signals from the Fed, ECB, and Bank of England.",
  },
  {
    title: "Africa's Tech Sector Sees Record Investment in Q1 2026",
    source: "Bloomberg",
    url: "#",
    urlToImage: "",
    publishedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    description:
      "Venture capital flows into African startups hit an all-time high, driven by fintech and clean energy sectors.",
  },
  {
    title: "Bitcoin Surpasses $70,000 on ETF Inflow Surge",
    source: "CoinDesk",
    url: "#",
    urlToImage: "",
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    description:
      "Spot Bitcoin ETFs recorded their highest single-day inflow of $1.4 billion, pushing BTC to new quarterly highs.",
  },
  {
    title: "Asia Pacific Trade Pact Boosts Regional Currency Stability",
    source: "Financial Times",
    url: "#",
    urlToImage: "",
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    description:
      "The expanded RCEP agreement is showing measurable effects on currency volatility across the Asia Pacific region.",
  },
  {
    title: "Oil Prices Stabilise as OPEC+ Maintains Output Targets",
    source: "CNBC",
    url: "#",
    urlToImage: "",
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    description:
      "Brent crude held steady near $82 per barrel after the OPEC+ group confirmed no changes to production quotas.",
  },
];

// ─── Currency to USD conversion (uses shared fxRates) ──────────────────────────────────────────
function toUSD(amount: number, currency: string): number {
  const rate = USD_RATES[currency] ?? 1;
  return amount * rate;
}

// ─── Actor type (minimal subset needed here) ──────────────────────────────────────────────────────
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

// ─── Helper ───────────────────────────────────────────────────────────────────────────────────────────
function timeAgo(isoString: string): string {
  if (!isoString) return "";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

// ─── "Last updated X minutes ago" string from a Date ─────────────────────────
function updatedAgoLabel(date: Date | null): string {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function formatUSD(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Inline "Last updated" + Refresh row ─────────────────────────────────────
function NewsRefreshRow({
  lastUpdatedAt,
  isRefreshing,
  onRefresh,
  labelOverride,
}: {
  lastUpdatedAt: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  labelOverride?: string;
}) {
  const [, forceRender] = useState(0);

  // Tick every minute so the "X minutes ago" label stays live
  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!lastUpdatedAt && !isRefreshing) return null;

  const label = labelOverride ?? updatedAgoLabel(lastUpdatedAt);

  return (
    <div className="flex items-center justify-end gap-2 mb-2">
      {lastUpdatedAt && (
        <span className="text-[10px]" style={{ color: "#6C6C6C" }}>
          Updated {label}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1 text-[10px] font-semibold transition-opacity active:opacity-60 disabled:opacity-40"
        style={{ color: "#D4AF37" }}
        aria-label="Refresh news"
        data-ocid="news.refresh.button"
      >
        <RefreshCw
          size={10}
          className={isRefreshing ? "animate-spin" : ""}
          style={{ color: "#D4AF37" }}
        />
        {isRefreshing ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────────────────────────────
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

function HeadlineSkeletonRow() {
  return (
    <div
      className="px-4 py-3 animate-pulse"
      style={{ borderBottom: "1px solid #1A1A1A" }}
    >
      <div
        className="h-2.5 rounded mb-1.5"
        style={{ background: "#1A1A1A", width: "25%" }}
      />
      <div
        className="h-3.5 rounded"
        style={{ background: "#1A1A1A", width: "90%" }}
      />
    </div>
  );
}

// ─── Issue 30: Top Headlines extracted into a single shared component ───────────────────────
// Previously duplicated in both mobile and desktop sections.
function TopHeadlines({
  articles,
  isLoading,
  onOpen,
  onExplore,
  lastUpdatedAt,
  isRefreshing,
  onRefresh,
  variant = "mobile",
}: {
  articles: NewsArticle[];
  isLoading: boolean;
  onOpen: (article: NewsArticle) => void;
  onExplore: () => void;
  lastUpdatedAt: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  variant?: "mobile" | "sidebar";
}) {
  const titleSize =
    variant === "sidebar" ? "text-sm lg:text-base" : "text-base";

  return (
    <>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: variant === "sidebar" ? 4 : 8 }}
      >
        <h2
          className={`${titleSize} font-semibold`}
          style={{ color: "#D4AF37" }}
        >
          Top Headlines
        </h2>
        <button
          type="button"
          onClick={onExplore}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity active:opacity-60"
          style={{ color: "#D4AF37" }}
          data-ocid="headlines.link"
        >
          Explore <ArrowRight size={12} />
        </button>
      </div>

      {/* Last updated + refresh for headlines block */}
      <NewsRefreshRow
        lastUpdatedAt={lastUpdatedAt}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid #1A1A1A" }}
        data-ocid="headlines.list"
      >
        {isLoading ? (
          <>
            <HeadlineSkeletonRow />
            <HeadlineSkeletonRow />
            <HeadlineSkeletonRow />
          </>
        ) : articles.length === 0 ? (
          <div
            className="px-4 py-6 text-center"
            style={{ background: "#0F0F0F" }}
            data-ocid="headlines.empty_state"
          >
            <p className="text-xs" style={{ color: "#6C6C6C" }}>
              No headlines available
            </p>
          </div>
        ) : (
          articles.map((article, index) => (
            <button
              key={`${article.url}-${index}`}
              type="button"
              onClick={() => onOpen(article)}
              className="w-full flex items-center gap-3 px-4 py-3.5 activity-row transition-colors text-left"
              style={{
                background: "#0F0F0F",
                borderBottom:
                  index < articles.length - 1 ? "1px solid #1A1A1A" : "none",
              }}
              data-ocid={`headlines.item.${index + 1}`}
            >
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: "#1A1400",
                  border: "1px solid #2A2000",
                  color: "#D4AF37",
                  maxWidth: "64px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {article.source}
              </span>
              <p
                className="flex-1 text-xs font-medium min-w-0"
                style={{
                  color: "#E8E8E8",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                }}
              >
                {article.title}
              </p>
              <span
                className="text-[10px] flex-shrink-0"
                style={{ color: "#6C6C6C" }}
              >
                {timeAgo(article.publishedAt)}
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────────────────────────────────
interface HomeScreenProps {
  hideBalance?: boolean;
  isLoggedIn?: boolean;
  displayName?: string;
  actor?: WalletActor | null;
  identity?: unknown;
  /** Currently active tab name — used to detect tab-return for news re-fetch */
  activeTab?: string;
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────────────────────────────────
export function HomeScreen({
  hideBalance = false,
  isLoggedIn = false,
  displayName = "",
  actor: walletActor = null,
  identity,
  activeTab,
}: HomeScreenProps) {
  const { actor, isFetching } = useActor();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("Global");
  const exploreRef = useRef<HTMLElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const articlesRef = useRef<NewsArticle[]>([]);
  articlesRef.current = articles;

  // ─── Fix 2: last successful news fetch timestamp ──────────────────────────
  const [lastNewsUpdatedAt, setLastNewsUpdatedAt] = useState<Date | null>(null);
  // Ref version for use inside callbacks without stale closure
  const lastNewsFetchRef = useRef<number>(0);

  // ─── Wallet balance state ──────────────────────────────────────────────────────────────────────
  const [walletBalances, setWalletBalances] = useState<
    { currency: string; amount: number }[]
  >([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Recent transactions state
  const [recentTxs, setRecentTxs] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Issue 8: wrap wallet Promise.all with an 8-second timeout
  // biome-ignore lint/correctness/useExhaustiveDependencies: identity used to detect login change
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
        ? (walletActor as any).getWalletTransactions().catch(() => [])
        : Promise.resolve([]),
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
      .catch((err) => {
        console.error("Failed to load wallet data:", err);
        if (!cancelled) {
          setBalancesLoading(false);
          setTxLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, walletActor, identity]);

  // ─── Compute portfolio figures ─────────────────────────────────────────────────────────────────────
  const totalPortfolioUSD = walletBalances.reduce((sum, b) => {
    return sum + toUSD(b.amount, b.currency);
  }, 0);

  const usdBalance =
    walletBalances.find((b) => b.currency === "USD")?.amount ?? 0;

  // Issue 17: isFetchingRef guards against concurrent fetchNews calls
  const isFetchingNewsRef = useRef(false);

  const fetchNews = useCallback(async () => {
    if (!actor) return;
    // Issue 17: deduplicate concurrent calls
    if (isFetchingNewsRef.current) return;
    isFetchingNewsRef.current = true;
    try {
      const typedActor = actor as unknown as NewsActor;
      // Issue 7: wrap getNewsData with 8-second timeout
      const fetchPromise = typedActor.getNewsData();
      const timeoutPromise = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 8000),
      );
      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (data.success && data.articles.length > 0) {
        setArticles(data.articles);
      } else if (articlesRef.current.length === 0) {
        setArticles(MOCK_ARTICLES);
      }
      // Fix 2: record timestamp of successful fetch
      const now = new Date();
      setLastNewsUpdatedAt(now);
      lastNewsFetchRef.current = now.getTime();
    } catch {
      if (articlesRef.current.length === 0) {
        setArticles(MOCK_ARTICLES);
      }
    } finally {
      setIsNewsLoading(false);
      isFetchingNewsRef.current = false;
    }
  }, [actor]);

  useEffect(() => {
    if (actor && !isFetching) {
      fetchNews();
    } else if (!actor && !isFetching) {
      setArticles(MOCK_ARTICLES);
      setIsNewsLoading(false);
    }
  }, [actor, isFetching, fetchNews]);

  useEffect(() => {
    if (!actor || isFetching) return;
    intervalRef.current = setInterval(() => {
      fetchNews();
    }, 300_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [actor, isFetching, fetchNews]);

  // Fix 1: re-fetch when returning to the Home tab if >60s since last fetch
  const prevActiveTabRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const isHomeTab =
      activeTab === "home" || activeTab === "Home" || activeTab === undefined;
    const wasOtherTab =
      prevActiveTabRef.current !== undefined &&
      prevActiveTabRef.current !== activeTab;
    prevActiveTabRef.current = activeTab;

    if (!isHomeTab || !wasOtherTab) return;
    if (!actor || isFetching) return;

    const elapsed = Date.now() - lastNewsFetchRef.current;
    if (elapsed >= 60_000) {
      fetchNews();
    }
  }, [activeTab, actor, isFetching, fetchNews]);

  const topHeadlines = articles.slice(0, 3);

  function openArticle(article: NewsArticle) {
    setSelectedArticle(article);
    setSelectedCategory(getArticleCategory(article));
  }

  function closeArticle() {
    setSelectedArticle(null);
  }

  // ─── Fix 3: manual refresh handler (respects isFetchingNewsRef lock) ────
  function handleManualRefresh() {
    fetchNews();
  }

  const isRefreshingNews = isFetchingNewsRef.current && isNewsLoading === false;

  // ─── Welcome message logic ────────────────────────────────────────────────────────────────────────────────
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

  // ─── Portfolio card balance area ─────────────────────────────────────────────────────────────────────
  function renderPortfolioBalance() {
    if (!isLoggedIn) {
      return (
        <div className="py-4 text-center" data-ocid="portfolio.loading_state">
          <p
            style={{
              color: "#3A2A00",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
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

  const heroAndFeed = (
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
          <DonutChart balances={walletBalances} isLoggedIn={isLoggedIn} />
        </div>
      </section>

      {/* Explore / News Section */}
      <NewsSection
        ref={exploreRef}
        articles={articles}
        isLoading={isNewsLoading}
        lastUpdatedAt={lastNewsUpdatedAt}
        isRefreshing={isRefreshingNews}
        onRefresh={handleManualRefresh}
      />

      <div style={{ height: "16px" }} />
    </>
  );

  // Issue 30: sidebarContent uses shared <TopHeadlines> component
  const sidebarContent = (
    <>
      <div
        className="rounded-xl overflow-hidden mb-6 animate-fade-in"
        style={{ border: "1px solid #1A1A1A", animationDelay: "120ms" }}
        data-ocid="headlines.section"
      >
        <div
          className="px-4 py-3"
          style={{ borderBottom: "1px solid #1A1A1A" }}
        >
          <TopHeadlines
            articles={topHeadlines}
            isLoading={isNewsLoading}
            onOpen={openArticle}
            onExplore={() =>
              exploreRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            lastUpdatedAt={lastNewsUpdatedAt}
            isRefreshing={isRefreshingNews}
            onRefresh={handleManualRefresh}
            variant="sidebar"
          />
        </div>
      </div>
    </>
  );

  return (
    <main className="flex-1 overflow-y-auto px-5 pt-4 pb-4 lg:overflow-visible">
      {/* Mobile: single column */}
      <div className="lg:hidden">
        {/* Issue 30: use shared TopHeadlines component */}
        <section
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "120ms" }}
          data-ocid="headlines.section"
        >
          <TopHeadlines
            articles={topHeadlines}
            isLoading={isNewsLoading}
            onOpen={openArticle}
            onExplore={() =>
              exploreRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            lastUpdatedAt={lastNewsUpdatedAt}
            isRefreshing={isRefreshingNews}
            onRefresh={handleManualRefresh}
            variant="mobile"
          />
        </section>

        {heroAndFeed}
      </div>

      {/* Desktop: two-column grid */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">
        {/* Left column: hero + activity + insights + news feed */}
        <div>{heroAndFeed}</div>

        {/* Right column: headlines + placeholder for market data */}
        <div className="lg:sticky" style={{ top: 16 }}>
          {sidebarContent}
        </div>
      </div>

      {/* Article Preview Modal */}
      <ArticlePreviewModal
        article={selectedArticle}
        category={selectedCategory}
        onClose={closeArticle}
      />
    </main>
  );
}
