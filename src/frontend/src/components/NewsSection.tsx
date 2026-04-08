import { Clock, Globe, Newspaper, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  description: string;
}

type NewsCategory = "Global" | "Africa" | "Asia" | "Business" | "Crypto";

interface NewsSectionProps {
  articles: NewsArticle[];
  isLoading: boolean;
  /** Timestamp of the last successful news fetch — used to show "Updated X ago" */
  lastUpdatedAt?: Date | null;
  /** Whether a refresh is currently in progress */
  isRefreshing?: boolean;
  /** Called when the user taps the Refresh button */
  onRefresh?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: NewsCategory[] = [
  "Global",
  "Africa",
  "Asia",
  "Business",
  "Crypto",
];

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  Global: [],
  Africa: ["africa", "african", "nigeria", "kenya", "ghana", "egypt", "lagos"],
  Asia: [
    "asia",
    "asian",
    "china",
    "japan",
    "korea",
    "india",
    "taiwan",
    "singapore",
    "beijing",
    "tokyo",
  ],
  Business: [
    "business",
    "economy",
    "gdp",
    "trade",
    "market",
    "finance",
    "stock",
    "corporate",
    "earnings",
    "revenue",
  ],
  Crypto: [
    "bitcoin",
    "crypto",
    "btc",
    "eth",
    "ethereum",
    "blockchain",
    "defi",
    "nft",
    "altcoin",
    "web3",
  ],
};

const SKELETON_IDS = ["sk-n1", "sk-n2", "sk-n3"];

// ─── Helper functions ─────────────────────────────────────────────────────────

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

function filterArticles(
  articles: NewsArticle[],
  category: NewsCategory,
): NewsArticle[] {
  if (category === "Global") return articles;
  const keywords = CATEGORY_KEYWORDS[category];
  return articles.filter((a) => {
    const haystack = `${a.title} ${a.description}`.toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  });
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

export function getArticleCategory(article: NewsArticle): string {
  const haystack = `${article.title} ${article.description}`.toLowerCase();
  const orderedCategories: NewsCategory[] = [
    "Crypto",
    "Africa",
    "Asia",
    "Business",
  ];
  for (const cat of orderedCategories) {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords.some((kw) => haystack.includes(kw))) {
      return cat;
    }
  }
  return "Global";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NewsSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0F0F0F", border: "1px solid #1A1A1A" }}
    >
      <div className="animate-pulse">
        {/* Thumbnail placeholder */}
        <div className="h-36 w-full" style={{ background: "#1A1A1A" }} />
        <div className="p-4">
          <div
            className="h-3 rounded mb-2"
            style={{ background: "#1A1A1A", width: "30%" }}
          />
          <div
            className="h-4 rounded mb-1.5"
            style={{ background: "#1A1A1A", width: "95%" }}
          />
          <div
            className="h-4 rounded mb-3"
            style={{ background: "#1A1A1A", width: "70%" }}
          />
          <div
            className="h-3 rounded"
            style={{ background: "#1A1A1A", width: "20%" }}
          />
        </div>
      </div>
    </div>
  );
}

export function ThumbnailFallback({ source }: { source: string }) {
  return (
    <div
      className="w-full flex flex-col items-center justify-center gap-2"
      style={{
        background: "#1A1400",
        border: "1px solid #2A2000",
        height: "180px",
      }}
    >
      <Newspaper size={24} style={{ color: "#D4AF37", opacity: 0.5 }} />
      <span
        className="text-xs font-semibold text-center px-3 truncate max-w-full"
        style={{ color: "#D4AF37" }}
      >
        {source}
      </span>
    </div>
  );
}

// ─── Article Preview Modal ────────────────────────────────────────────────────

interface ArticlePreviewModalProps {
  article: NewsArticle | null;
  category: string;
  onClose: () => void;
}

export function ArticlePreviewModal({
  article,
  category,
  onClose,
}: ArticlePreviewModalProps) {
  const [imgError, setImgError] = useState(false);
  const showFallback = imgError || !article?.urlToImage;
  const hasValidUrl = article?.url && article.url !== "#";

  function handleReadFullArticle() {
    if (article?.url) {
      window.open(article.url, "_blank", "noopener,noreferrer");
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {article && (
        // Backdrop
        <motion.div
          key="article-modal-backdrop"
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)", zIndex: 200 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-ocid="news.modal"
        >
          {/* Modal panel — stop propagation so clicks inside don't close */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="w-full overflow-y-auto"
            style={{
              maxWidth: "430px",
              maxHeight: "calc(85dvh - env(safe-area-inset-bottom, 0px))",
              background: "#111111",
              borderRadius: "20px 20px 0 0",
              borderTop: "1px solid #2A2000",
            }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            {/* Close button */}
            <div className="flex justify-end px-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: "#1A1A1A" }}
                aria-label="Close article preview"
                data-ocid="news.close_button"
              >
                <X size={14} style={{ color: "#6C6C6C" }} />
              </button>
            </div>

            {/* Thumbnail */}
            <div
              className="w-full"
              style={{ height: "180px", overflow: "hidden" }}
            >
              {showFallback ? (
                <ThumbnailFallback source={article.source} />
              ) : (
                <img
                  src={article.urlToImage}
                  alt={article.title}
                  className="w-full object-cover"
                  style={{ height: "180px" }}
                  onError={() => setImgError(true)}
                  loading="lazy"
                />
              )}
            </div>

            {/* Content area */}
            <div className="px-5 pb-6 pt-4">
              {/* Category + Source row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #2A2A2A",
                    color: "#9A9A9A",
                  }}
                >
                  {category}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: "#1A1400",
                    border: "1px solid #2A2000",
                    color: "#D4AF37",
                  }}
                >
                  {article.source}
                </span>
              </div>

              {/* Headline */}
              <p
                className="font-semibold mt-3"
                style={{
                  color: "#E8E8E8",
                  fontSize: "15px",
                  lineHeight: "1.4",
                }}
              >
                {article.title}
              </p>

              {/* Publish time */}
              <p
                className="mt-1.5"
                style={{ fontSize: "11px", color: "#6C6C6C" }}
              >
                <Clock
                  size={9}
                  style={{
                    display: "inline",
                    marginRight: "4px",
                    verticalAlign: "middle",
                  }}
                />
                {timeAgo(article.publishedAt)}
              </p>

              {/* Description */}
              {article.description && (
                <p
                  className="mt-2.5 line-clamp-4"
                  style={{
                    fontSize: "13px",
                    color: "#9A9A9A",
                    lineHeight: "1.55",
                  }}
                >
                  {article.description}
                </p>
              )}

              {/* Read Full Article button — ISSUE 5: always render, disable when no valid URL */}
              <button
                type="button"
                onClick={hasValidUrl ? handleReadFullArticle : undefined}
                disabled={!hasValidUrl}
                className="w-full mt-5 transition-opacity active:opacity-80"
                style={{
                  background: hasValidUrl ? "#D4AF37" : "transparent",
                  color: hasValidUrl ? "#111111" : "#5A5A5A",
                  fontWeight: 700,
                  borderRadius: "12px",
                  padding: "14px",
                  fontSize: "14px",
                  letterSpacing: "0.02em",
                  border: hasValidUrl ? "none" : "1px solid #3A3A3A",
                  cursor: hasValidUrl ? "pointer" : "not-allowed",
                  opacity: hasValidUrl ? 1 : 0.6,
                }}
                data-ocid="news.read_article.button"
              >
                {hasValidUrl
                  ? "Read Full Article"
                  : "Article link not available"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── News Card ────────────────────────────────────────────────────────────────

function NewsCard({
  article,
  onOpen,
}: {
  article: NewsArticle;
  onOpen: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const showFallback = imgError || !article.urlToImage;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: "#0F0F0F",
        border: "1px solid #1A1A1A",
      }}
    >
      {/* Thumbnail */}
      {showFallback ? (
        <div style={{ height: "144px", overflow: "hidden" }}>
          <div
            className="w-full h-36 flex flex-col items-center justify-center gap-2"
            style={{
              background: "#1A1400",
              border: "1px solid #2A2000",
            }}
          >
            <Newspaper size={24} style={{ color: "#D4AF37", opacity: 0.5 }} />
            <span
              className="text-xs font-semibold text-center px-3 truncate max-w-full"
              style={{ color: "#D4AF37" }}
            >
              {article.source}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img
            src={article.urlToImage}
            alt={article.title}
            className="w-full h-36 object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(15,15,15,0.6) 0%, transparent 50%)",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Source + Time row */}
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: "#1A1400",
              border: "1px solid #2A2000",
              color: "#D4AF37",
            }}
          >
            {article.source}
          </span>
          <span
            className="flex items-center gap-1 text-[10px]"
            style={{ color: "#6C6C6C" }}
          >
            <Clock size={9} />
            {timeAgo(article.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <p
          className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: "#E8E8E8" }}
        >
          {article.title}
        </p>

        {/* Description */}
        {article.description && (
          <p
            className="text-xs mt-1.5 line-clamp-2"
            style={{ color: "#6C6C6C" }}
          >
            {article.description}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Main NewsSection ─────────────────────────────────────────────────────────

// "Last updated X ago" label helper (local to this module)
function updatedAgoLabel(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export const NewsSection = forwardRef<HTMLElement, NewsSectionProps>(
  ({ articles, isLoading, lastUpdatedAt, isRefreshing, onRefresh }, ref) => {
    const [activeCategory, setActiveCategory] =
      useState<NewsCategory>("Global");
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
      null,
    );
    const [selectedCategory, setSelectedCategory] = useState<string>("Global");
    // Fix 2: tick every minute so "X minutes ago" label stays live
    const [, forceRender] = useState(0);
    useEffect(() => {
      if (!lastUpdatedAt) return;
      const id = setInterval(() => forceRender((n) => n + 1), 60_000);
      return () => clearInterval(id);
    }, [lastUpdatedAt]);

    const filtered = filterArticles(articles, activeCategory);
    const articleCount = filtered.length;

    function openArticle(article: NewsArticle) {
      setSelectedArticle(article);
      setSelectedCategory(getArticleCategory(article));
    }

    function closeArticle() {
      setSelectedArticle(null);
    }

    return (
      <section ref={ref} className="mb-6" data-ocid="news.section">
        {/* Section heading + refresh row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Globe size={16} style={{ color: "#D4AF37" }} />
            <h2
              className="text-base font-semibold"
              style={{ color: "#D4AF37" }}
            >
              Explore
            </h2>
            {!isLoading && articleCount > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: "#1A1400",
                  border: "1px solid #2A2000",
                  color: "#D4AF37",
                }}
              >
                {articleCount}
              </span>
            )}
          </div>
          {/* Fix 3: Refresh button in Explore section header */}
          <div className="flex items-center gap-2">
            {lastUpdatedAt && (
              <span className="text-[10px]" style={{ color: "#6C6C6C" }}>
                Updated {updatedAgoLabel(lastUpdatedAt)}
              </span>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 text-[10px] font-semibold transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ color: "#D4AF37" }}
                aria-label="Refresh news"
                data-ocid="news.explore_refresh.button"
              >
                <RefreshCw
                  size={10}
                  className={isRefreshing ? "animate-spin" : ""}
                  style={{ color: "#D4AF37" }}
                />
                {isRefreshing ? "Refreshing…" : "Refresh"}
              </button>
            )}
          </div>
        </div>

        {/* Category filter pills */}
        <div
          className="flex gap-2 mb-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
          data-ocid="news.tab"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: activeCategory === cat ? "#1A1400" : "#1A1A1A",
                border:
                  activeCategory === cat
                    ? "1px solid #D4AF37"
                    : "1px solid #2A2A2A",
                color: activeCategory === cat ? "#D4AF37" : "#6C6C6C",
              }}
              data-ocid={`news.${cat.toLowerCase()}.tab`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Article cards */}
        <div className="flex flex-col gap-4" data-ocid="news.list">
          {isLoading ? (
            SKELETON_IDS.map((id) => <NewsSkeleton key={id} />)
          ) : filtered.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "#0F0F0F", border: "1px solid #1A1A1A" }}
              data-ocid="news.empty_state"
            >
              <Newspaper
                size={32}
                className="mx-auto mb-3"
                style={{ color: "#2A2A2A" }}
              />
              <p className="text-sm" style={{ color: "#6C6C6C" }}>
                No {activeCategory} articles available
              </p>
            </div>
          ) : (
            filtered.map((article, i) => (
              <div key={`${article.url}-${i}`} data-ocid={`news.item.${i + 1}`}>
                <NewsCard
                  article={article}
                  onOpen={() => openArticle(article)}
                />
              </div>
            ))
          )}
        </div>

        {/* Article Preview Modal */}
        <ArticlePreviewModal
          article={selectedArticle}
          category={selectedCategory}
          onClose={closeArticle}
        />
      </section>
    );
  },
);

NewsSection.displayName = "NewsSection";
