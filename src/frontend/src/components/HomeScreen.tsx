import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsArticle } from "../declarations/backend.did.d.ts";
import type { _SERVICE } from "../declarations/backend.did.d.ts";
import { useActor } from "../hooks/useActor";
import { DonutChart } from "./DonutChart";
import {
  ArticlePreviewModal,
  NewsSection,
  getArticleCategory,
} from "./NewsSection";

// ─── Mock fallback news ───────────────────────────────────────────────────────

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

// ─── Static data ────────────────────────────────────────────────────────────────────

const activityItems = [
  {
    id: 1,
    ticker: "AAPL",
    name: "Apple Inc",
    action: "Bought",
    amount: "+$2,340.00",
    positive: true,
  },
  {
    id: 2,
    ticker: "TSLA",
    name: "Tesla Inc",
    action: "Sold",
    amount: "-$1,200.00",
    positive: false,
  },
  {
    id: 3,
    ticker: "GLD",
    name: "Gold ETF",
    action: "Dividend",
    amount: "+$180.00",
    positive: true,
  },
];

// ─── Currency to USD conversion rates ────────────────────────────────────────
const USD_RATES: Record<string, number> = {
  NGN: 1 / 1600,
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  CNY: 0.138,
};

function toUSD(amount: number, currency: string): number {
  const rate = USD_RATES[currency] ?? 1;
  return amount * rate;
}

// ─── Actor type (minimal subset needed here) ─────────────────────────────────
interface WalletActor {
  getWalletBalances: () => Promise<{ currency: string; amount: number }[]>;
}

// ─── Helper ─────────────────────────────────────────────────────────────────────────────
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

function formatUSD(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────────────
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

// ─── Props ───────────────────────────────────────────────────────────────────────────
interface HomeScreenProps {
  hideBalance?: boolean;
  isLoggedIn?: boolean;
  displayName?: string;
  actor?: WalletActor | null;
  identity?: unknown;
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────────────
export function HomeScreen({
  hideBalance = false,
  isLoggedIn = false,
  displayName = "",
  actor: walletActor = null,
  identity,
}: HomeScreenProps) {
  const { actor, isFetching } = useActor();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("Global");
  const exploreRef = useRef<HTMLElement>(null);
  const hasFetchedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const articlesRef = useRef<NewsArticle[]>([]);
  articlesRef.current = articles;

  // ─── Wallet balance state ─────────────────────────────────────────────────
  const [walletBalances, setWalletBalances] = useState<
    { currency: string; amount: number }[]
  >([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Fetch wallet balances when logged in and actor is available
  // biome-ignore lint/correctness/useExhaustiveDependencies: identity used to detect login change
  useEffect(() => {
    if (!isLoggedIn || !walletActor) {
      setWalletBalances([]);
      return;
    }
    let cancelled = false;
    setBalancesLoading(true);
    walletActor
      .getWalletBalances()
      .then((balances) => {
        if (!cancelled) {
          setWalletBalances(balances);
        }
      })
      .catch((err) => {
        console.error("Failed to load wallet balances for portfolio:", err);
      })
      .finally(() => {
        if (!cancelled) setBalancesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, walletActor, identity]);

  // ─── Compute portfolio figures ───────────────────────────────────────────
  const totalPortfolioUSD = walletBalances.reduce((sum, b) => {
    return sum + toUSD(b.amount, b.currency);
  }, 0);

  const usdBalance =
    walletBalances.find((b) => b.currency === "USD")?.amount ?? 0;

  const fetchNews = useCallback(async () => {
    if (!actor) return;
    try {
      const typedActor = actor as unknown as _SERVICE;
      const data = await typedActor.getNewsData();
      if (data.success && data.articles.length > 0) {
        setArticles(data.articles);
      } else if (articlesRef.current.length === 0) {
        setArticles(MOCK_ARTICLES);
      }
    } catch {
      if (articlesRef.current.length === 0) {
        setArticles(MOCK_ARTICLES);
      }
    } finally {
      setIsNewsLoading(false);
    }
  }, [actor]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot fetch on actor ready
  useEffect(() => {
    if (actor && !isFetching && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNews();
    } else if (!actor && !isFetching && !hasFetchedRef.current) {
      setArticles(MOCK_ARTICLES);
      setIsNewsLoading(false);
    }
  }, [actor, isFetching, fetchNews]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: interval reset intentional on actor change
  useEffect(() => {
    if (!actor || isFetching) return;
    intervalRef.current = setInterval(() => {
      fetchNews();
    }, 300_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [actor, isFetching, fetchNews]);

  const topHeadlines = articles.slice(0, 3);

  function openArticle(article: NewsArticle) {
    setSelectedArticle(article);
    setSelectedCategory(getArticleCategory(article));
  }

  function closeArticle() {
    setSelectedArticle(null);
  }

  // ─── Welcome message logic ────────────────────────────────────────────────
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

  // ─── Portfolio card balance area ─────────────────────────────────────────
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
          <span
            className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,60,0,0.15)", color: "#1A4A00" }}
          >
            <ArrowUpRight size={11} />
            +4.7% this month
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
          {activityItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3.5 activity-row transition-colors"
              style={{
                background: "#0F0F0F",
                borderBottom:
                  index < activityItems.length - 1
                    ? "1px solid #1A1A1A"
                    : "none",
              }}
              data-ocid={`activity.item.${index + 1}`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#1E1E1E" }}
              >
                {item.positive ? (
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
                  {item.name}{" "}
                  <span style={{ color: "#6C6C6C" }}>({item.ticker})</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#6C6C6C" }}>
                  {item.action}
                </p>
              </div>

              <span
                className="text-sm font-semibold flex-shrink-0"
                style={{ color: item.positive ? "#D4AF37" : "#9A9A9A" }}
              >
                {item.amount}
              </span>
            </div>
          ))}
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
          <DonutChart />
        </div>
      </section>

      {/* Explore / News Section */}
      <NewsSection
        ref={exploreRef}
        articles={articles}
        isLoading={isNewsLoading}
      />

      <div style={{ height: "16px" }} />
    </>
  );

  const sidebarContent = (
    <>
      {/* Top Headlines - desktop sidebar */}
      <div
        className="rounded-xl overflow-hidden mb-6 animate-fade-in"
        style={{ border: "1px solid #1A1A1A", animationDelay: "120ms" }}
        data-ocid="headlines.section"
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #1A1A1A" }}
        >
          <h2
            className="text-sm lg:text-base font-semibold"
            style={{ color: "#D4AF37" }}
          >
            Top Headlines
          </h2>
          <button
            type="button"
            onClick={() =>
              exploreRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex items-center gap-1 text-xs font-semibold transition-opacity active:opacity-60"
            style={{ color: "#D4AF37" }}
            data-ocid="headlines.link"
          >
            Explore <ArrowRight size={12} />
          </button>
        </div>

        <div data-ocid="headlines.list">
          {isNewsLoading ? (
            <>
              <HeadlineSkeletonRow />
              <HeadlineSkeletonRow />
              <HeadlineSkeletonRow />
            </>
          ) : topHeadlines.length === 0 ? (
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
            topHeadlines.map((article, index) => (
              <button
                key={`${article.url}-${index}`}
                type="button"
                onClick={() => openArticle(article)}
                className="w-full flex items-center gap-3 px-4 py-3.5 activity-row transition-colors text-left"
                style={{
                  background: "#0F0F0F",
                  borderBottom:
                    index < topHeadlines.length - 1
                      ? "1px solid #1A1A1A"
                      : "none",
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
      </div>
    </>
  );

  return (
    <main className="flex-1 overflow-y-auto px-5 pt-4 pb-4 lg:overflow-visible">
      {/* Mobile: single column */}
      <div className="lg:hidden">
        {/* Top Headlines (mobile only) */}
        <section
          className="mb-6 animate-fade-in"
          style={{ animationDelay: "120ms" }}
          data-ocid="headlines.section"
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base font-semibold"
              style={{ color: "#D4AF37" }}
            >
              Top Headlines
            </h2>
            <button
              type="button"
              onClick={() =>
                exploreRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              className="flex items-center gap-1 text-xs font-semibold transition-opacity active:opacity-60"
              style={{ color: "#D4AF37" }}
              data-ocid="headlines.link"
            >
              Explore <ArrowRight size={12} />
            </button>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #1A1A1A" }}
            data-ocid="headlines.list"
          >
            {isNewsLoading ? (
              <>
                <HeadlineSkeletonRow />
                <HeadlineSkeletonRow />
                <HeadlineSkeletonRow />
              </>
            ) : topHeadlines.length === 0 ? (
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
              topHeadlines.map((article, index) => (
                <button
                  key={`${article.url}-${index}`}
                  type="button"
                  onClick={() => openArticle(article)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 activity-row transition-colors text-left"
                  style={{
                    background: "#0F0F0F",
                    borderBottom:
                      index < topHeadlines.length - 1
                        ? "1px solid #1A1A1A"
                        : "none",
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
                    className="flex-1 text-xs font-medium truncate min-w-0"
                    style={{ color: "#E8E8E8" }}
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
