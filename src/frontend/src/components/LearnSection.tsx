import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Newspaper } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RssArticle {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  thumbnail: string;
  author: string;
}

interface WikiSuggestion {
  title: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SKELETON_IDS = ["sk-l1", "sk-l2", "sk-l3"];

// Primary: rss2json.com with a well-known working Investopedia feed URL
const RSS_PRIMARY =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.investopedia.com%2Ffeeds%2Frss.aspx&count=10";

// Fallback: allorigins CORS proxy that returns raw XML for DOMParser
const RSS_FALLBACK =
  "https://api.allorigins.win/get?url=https%3A%2F%2Fwww.investopedia.com%2Ffeeds%2Frss.aspx";

const FALLBACK_ARTICLES: RssArticle[] = [
  {
    title: "What Is Compound Interest?",
    description:
      "Compound interest is the addition of interest to the principal sum of a loan or deposit, or in other words, interest on principal plus interest.",
    pubDate: "",
    link: "https://www.investopedia.com/terms/c/compoundinterest.asp",
    thumbnail: "",
    author: "Investopedia",
  },
  {
    title: "Understanding ETFs",
    description:
      "An exchange-traded fund (ETF) is a type of pooled investment security that operates much like a mutual fund.",
    pubDate: "",
    link: "https://www.investopedia.com/terms/e/etf.asp",
    thumbnail: "",
    author: "Investopedia",
  },
  {
    title: "How the Stock Market Works",
    description:
      "The stock market allows buyers and sellers of securities to meet, interact, and transact. Learn the fundamentals.",
    pubDate: "",
    link: "https://www.investopedia.com/articles/investing/082614/how-stock-market-works.asp",
    thumbnail: "",
    author: "Investopedia",
  },
  {
    title: "Forex Trading Basics",
    description:
      "Forex (FX) is the market where currencies are traded. Learn the basics of foreign exchange trading.",
    pubDate: "",
    link: "https://www.investopedia.com/terms/f/forex.asp",
    thumbnail: "",
    author: "Investopedia",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  } catch {
    return "";
  }
}

function updatedAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/** Parse raw RSS XML string into RssArticle array */
function parseRssXml(xml: string): RssArticle[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, 10);
    return items.map((item) => {
      const getText = (tag: string) =>
        item.querySelector(tag)?.textContent?.trim() ?? "";
      const enclosure = item.querySelector("enclosure");
      const mediaThumbnail = item.querySelector("media\\:thumbnail, thumbnail");
      const thumbnail =
        enclosure?.getAttribute("url") ??
        mediaThumbnail?.getAttribute("url") ??
        "";
      return {
        title: getText("title"),
        description: getText("description"),
        pubDate: getText("pubDate"),
        link: getText("link"),
        thumbnail,
        author: getText("author") || getText("dc\\:creator") || "Investopedia",
      };
    });
  } catch {
    return [];
  }
}

// ─── Two-stage RSS fetch ──────────────────────────────────────────────────────

async function fetchRssArticles(): Promise<RssArticle[]> {
  // Stage 1: rss2json.com — returns JSON directly
  try {
    const res = await withTimeout(fetch(RSS_PRIMARY), 10000);
    if (res.ok) {
      const data = (await res.json()) as {
        status?: string;
        items?: RssArticle[];
      };
      const items = (data.items ?? []).slice(0, 6).filter((a) => !!a.title);
      if (items.length >= 2) return items;
    }
  } catch {
    // stage 1 failed — continue to stage 2
  }

  // Stage 2: allorigins.win — returns {contents: "<raw xml>"}
  try {
    const res = await withTimeout(fetch(RSS_FALLBACK), 10000);
    if (res.ok) {
      const data = (await res.json()) as { contents?: string };
      const xml = data.contents ?? "";
      const items = parseRssXml(xml)
        .slice(0, 6)
        .filter((a) => !!a.title);
      if (items.length >= 2) return items;
    }
  } catch {
    // stage 2 failed — fall through to hardcoded stubs
  }

  // Stage 3: hardcoded fallback stubs so the section is never empty
  return FALLBACK_ARTICLES;
}

// ─── Article Preview Modal ────────────────────────────────────────────────────

function ArticleModal({
  article,
  onClose,
}: {
  article: RssArticle | null;
  onClose: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <AnimatePresence>
      {article && (
        <motion.div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.8)", zIndex: 300 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-ocid="learn.modal"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="w-full overflow-y-auto"
            style={{
              maxWidth: "460px",
              maxHeight: "min(85dvh, calc(100dvh - 120px))",
              background: "#111111",
              borderRadius: "20px 20px 0 0",
              borderTop: "1px solid #2A2000",
            }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex justify-end px-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: "#1A1A1A" }}
                aria-label="Close"
                data-ocid="learn.modal_close"
              >
                <X size={14} style={{ color: "#6C6C6C" }} />
              </button>
            </div>

            <div
              className="w-full"
              style={{ height: "180px", overflow: "hidden" }}
            >
              {imgErr || !article.thumbnail ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-2"
                  style={{
                    background: "#1A1400",
                    borderBottom: "1px solid #2A2000",
                  }}
                >
                  <Newspaper
                    size={28}
                    style={{ color: "#D4AF37", opacity: 0.5 }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "#D4AF37" }}
                  >
                    Investopedia
                  </span>
                </div>
              ) : (
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="w-full object-cover"
                  style={{ height: "180px" }}
                  onError={() => setImgErr(true)}
                  loading="lazy"
                />
              )}
            </div>

            <div
              className="px-5 pt-4"
              style={{
                paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: "#1A1400",
                  border: "1px solid #2A2000",
                  color: "#D4AF37",
                }}
              >
                Investopedia
              </span>

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

              {article.pubDate && (
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
                  {timeAgo(article.pubDate)}
                </p>
              )}

              {article.description && (
                <p
                  className="mt-2.5"
                  style={{
                    fontSize: "13px",
                    color: "#9A9A9A",
                    lineHeight: "1.55",
                  }}
                >
                  {stripHtml(article.description)}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Skeleton Article Card ────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0F0F0F", border: "1px solid #1A1A1A" }}
    >
      <div className="animate-pulse">
        <div className="h-32 w-full" style={{ background: "#1A1A1A" }} />
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
            style={{ background: "#1A1A1A", width: "25%" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  onOpen,
}: {
  article: RssArticle;
  onOpen: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);
  const showFallback = imgErr || !article.thumbnail;

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
      style={{
        background: "#0F0F0F",
        border: hovered ? "1px solid #3A3000" : "1px solid #1A1A1A",
      }}
      data-ocid="learn.article_card"
    >
      {showFallback ? (
        <div
          className="w-full flex flex-col items-center justify-center gap-2"
          style={{
            background: "#1A1400",
            borderBottom: "1px solid #2A2000",
            height: "120px",
          }}
        >
          <Newspaper size={22} style={{ color: "#D4AF37", opacity: 0.5 }} />
          <span className="text-xs font-semibold" style={{ color: "#D4AF37" }}>
            Investopedia
          </span>
        </div>
      ) : (
        <div className="relative">
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full object-cover"
            style={{ height: "120px" }}
            onError={() => setImgErr(true)}
            loading="lazy"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(15,15,15,0.5) 0%, transparent 60%)",
            }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: "#1A1400",
              border: "1px solid #2A2000",
              color: "#D4AF37",
            }}
          >
            Investopedia
          </span>
          {article.pubDate && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "#6C6C6C" }}
            >
              <Clock size={9} />
              {timeAgo(article.pubDate)}
            </span>
          )}
        </div>

        <p
          className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: "#E8E8E8" }}
        >
          {article.title}
        </p>

        {article.description && (
          <p
            className="text-xs mt-1.5 line-clamp-2"
            style={{ color: "#6C6C6C" }}
          >
            {stripHtml(article.description)}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Wikipedia Glossary ───────────────────────────────────────────────────────

const DEFINITION_PREVIEW_LIMIT = 500;

function WikiGlossary() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<WikiSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [definition, setDefinition] = useState<{
    term: string;
    full: string;
    preview: string;
    expanded: boolean;
  } | null>(null);
  const [defLoading, setDefLoading] = useState(false);
  const [defError, setDefError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=5&format=json&origin=*`;
      const res = await withTimeout(fetch(url), 8000);
      const data = (await res.json()) as [string, string[]];
      const titles = data[1] ?? [];
      setSuggestions(titles.map((t) => ({ title: t })));
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const fetchDefinition = useCallback(async (term: string) => {
    setShowDropdown(false);
    setQuery(term);
    setDefLoading(true);
    setDefError(false);
    setDefinition(null);
    try {
      // Use Wikipedia REST summary API — returns full 'extract' paragraph
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
      const res = await withTimeout(fetch(url), 8000);
      if (!res.ok) throw new Error("not_found");
      const data = (await res.json()) as {
        title?: string;
        extract?: string;
        displaytitle?: string;
      };
      const fullText = data.extract?.trim() ?? "";
      if (!fullText || fullText.length < 10) {
        // Fallback: try the action API for broader coverage
        const fallbackUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(term)}&prop=extracts&exintro=true&explaintext=true&redirects=1&format=json&origin=*`;
        const res2 = await withTimeout(fetch(fallbackUrl), 8000);
        const data2 = (await res2.json()) as {
          query: { pages: Record<string, { extract?: string }> };
        };
        const pages = data2.query?.pages ?? {};
        const page = Object.values(pages)[0];
        const text2 = page?.extract?.trim() ?? "";
        if (!text2 || text2.length < 10) {
          setDefError(true);
          return;
        }
        const displayTerm = data.displaytitle ?? data.title ?? term;
        setDefinition({
          term: displayTerm,
          full: text2,
          preview:
            text2.length > DEFINITION_PREVIEW_LIMIT
              ? text2.slice(0, DEFINITION_PREVIEW_LIMIT)
              : text2,
          expanded: text2.length <= DEFINITION_PREVIEW_LIMIT,
        });
      } else {
        const displayTerm = data.displaytitle ?? data.title ?? term;
        setDefinition({
          term: displayTerm,
          full: fullText,
          preview:
            fullText.length > DEFINITION_PREVIEW_LIMIT
              ? fullText.slice(0, DEFINITION_PREVIEW_LIMIT)
              : fullText,
          expanded: fullText.length <= DEFINITION_PREVIEW_LIMIT,
        });
      }
    } catch {
      setDefError(true);
    } finally {
      setDefLoading(false);
    }
  }, []);

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setDefinition(null);
    setDefError(false);
    inputRef.current?.focus();
  };

  const toggleExpand = () => {
    if (!definition) return;
    setDefinition((d) => (d ? { ...d, expanded: !d.expanded } : d));
  };

  return (
    <div>
      {/* Search input — font-size 16px prevents iOS/Android zoom on focus */}
      <div className="relative">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "#0F0F0F", border: "1px solid #2A2A2A" }}
        >
          <Search size={14} style={{ color: "#6C6C6C", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search financial terms…"
            className="flex-1 bg-transparent outline-none"
            style={{
              color: "#E8E8E8",
              fontSize: "16px", // prevents iOS/Android zoom on focus
              lineHeight: "1.4",
            }}
            data-ocid="learn.glossary_input"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full"
              style={{ background: "#1A1A1A" }}
              aria-label="Clear search"
              data-ocid="learn.glossary_clear"
            >
              <X size={10} style={{ color: "#9A9A9A" }} />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10"
              style={{ background: "#111111", border: "1px solid #2A2000" }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {suggestions.length === 0 ? (
                <p
                  className="px-4 py-3 text-xs"
                  style={{ color: "#6C6C6C" }}
                  data-ocid="learn.glossary_no_results"
                >
                  No terms found
                </p>
              ) : (
                suggestions.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => fetchDefinition(s.title)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: "#E8E8E8",
                      borderBottom: "1px solid #1A1A1A",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#1A1400";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                    }}
                    data-ocid="learn.glossary_suggestion"
                  >
                    {s.title}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Definition loading skeleton */}
      {defLoading && (
        <div
          className="mt-3 rounded-xl p-4 animate-pulse"
          style={{ background: "#0F0F0F", border: "1px solid #2A2000" }}
        >
          <div
            className="h-4 rounded mb-2"
            style={{ background: "#1A1A1A", width: "40%" }}
          />
          <div
            className="h-3 rounded mb-1.5"
            style={{ background: "#1A1A1A", width: "100%" }}
          />
          <div
            className="h-3 rounded mb-1.5"
            style={{ background: "#1A1A1A", width: "90%" }}
          />
          <div
            className="h-3 rounded"
            style={{ background: "#1A1A1A", width: "75%" }}
          />
        </div>
      )}

      {/* Definition error */}
      {!defLoading && defError && (
        <div
          className="mt-3 rounded-xl p-4"
          style={{ background: "#0F0F0F", border: "1px solid #2A2000" }}
          data-ocid="learn.glossary_error"
        >
          <p className="text-xs" style={{ color: "#6C6C6C" }}>
            No definition found for this term. Try a different search.
          </p>
        </div>
      )}

      {/* Definition result — full text with expand/collapse */}
      {!defLoading && definition && (
        <motion.div
          className="mt-3 rounded-xl p-4"
          style={{ background: "#0F0F0F", border: "1px solid #2A2000" }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          data-ocid="learn.glossary_result"
        >
          <p className="text-sm font-bold mb-2" style={{ color: "#D4AF37" }}>
            {definition.term}
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "#9A9A9A", lineHeight: "1.6" }}
          >
            {definition.expanded ? definition.full : `${definition.preview}…`}
          </p>

          {/* Show "Read more" / "Show less" only when text exceeds limit */}
          {definition.full.length > DEFINITION_PREVIEW_LIMIT && (
            <button
              type="button"
              onClick={toggleExpand}
              className="mt-2 flex items-center gap-1 text-xs font-semibold transition-opacity active:opacity-60"
              style={{ color: "#D4AF37" }}
              data-ocid="learn.glossary_expand"
            >
              {definition.expanded ? (
                <>
                  Show less <ChevronUp size={11} />
                </>
              ) : (
                <>
                  Read more <ChevronDown size={11} />
                </>
              )}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main LearnSection ────────────────────────────────────────────────────────

export function LearnSection() {
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<RssArticle | null>(
    null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // tick every minute to keep "X min ago" live
  const [, forceRender] = useState(0);

  const articlesRef = useRef<RssArticle[]>([]);

  const fetchArticles = useCallback(async () => {
    setIsError(false);
    setIsLoading(true);
    try {
      const items = await fetchRssArticles();
      articlesRef.current = items;
      setArticles(items);
      setLastUpdated(new Date());
      setIsError(false);
    } catch {
      if (articlesRef.current.length === 0) {
        // Even if everything fails, show the hardcoded stubs
        articlesRef.current = FALLBACK_ARTICLES;
        setArticles(FALLBACK_ARTICLES);
        setIsError(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
    intervalRef.current = setInterval(fetchArticles, 10 * 60 * 1000);
    const tickId = setInterval(() => forceRender((n) => n + 1), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(tickId);
    };
  }, [fetchArticles]);

  return (
    <section data-ocid="learn.section">
      {/* ─── Financial Education ─────────────────────────────────────────── */}
      <div className="mb-6">
        {/* Section heading */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} style={{ color: "#D4AF37" }} />
            <div>
              <h2
                className="text-base font-semibold"
                style={{ color: "#D4AF37" }}
              >
                Financial Education
              </h2>
              <div
                className="h-0.5 mt-0.5 rounded-full"
                style={{ background: "#D4AF37", width: "100%" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px]" style={{ color: "#6C6C6C" }}>
                Updated {updatedAgo(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              onClick={fetchArticles}
              disabled={isLoading}
              className="flex items-center gap-1 text-[10px] font-semibold transition-opacity active:opacity-60 disabled:opacity-40"
              style={{ color: "#D4AF37" }}
              aria-label="Refresh articles"
              data-ocid="learn.refresh.button"
            >
              <RefreshCw
                size={10}
                className={isLoading ? "animate-spin" : ""}
              />
              {isLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Article cards */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {SKELETON_IDS.map((id) => (
              <ArticleSkeleton key={id} />
            ))}
          </div>
        ) : isError ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "#0F0F0F", border: "1px solid #1A1A1A" }}
            data-ocid="learn.error_state"
          >
            <Newspaper
              size={32}
              className="mx-auto mb-3"
              style={{ color: "#2A2A2A" }}
            />
            <p className="text-sm mb-3" style={{ color: "#6C6C6C" }}>
              Unable to load articles. Tap to retry.
            </p>
            <button
              type="button"
              onClick={fetchArticles}
              className="text-xs font-semibold px-4 py-2 rounded-full"
              style={{
                background: "#1A1400",
                border: "1px solid #2A2000",
                color: "#D4AF37",
              }}
              data-ocid="learn.retry.button"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-ocid="learn.articles_list">
            {articles.map((article, i) => (
              <div
                key={`${article.link}-${i}`}
                data-ocid={`learn.article.${i + 1}`}
              >
                <ArticleCard
                  article={article}
                  onOpen={() => setSelectedArticle(article)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Financial Glossary ──────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} style={{ color: "#D4AF37" }} />
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "#D4AF37" }}
            >
              Financial Glossary
            </h2>
            <div
              className="h-0.5 mt-0.5 rounded-full"
              style={{ background: "#D4AF37", width: "100%" }}
            />
          </div>
        </div>
        <WikiGlossary />
      </div>

      {/* Article preview modal */}
      <ArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </section>
  );
}
