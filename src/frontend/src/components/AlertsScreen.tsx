import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  BellOff,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";

// ── Local type definitions (mirrors backend.d.ts) ────────────────────────────────

export interface Alert {
  id: string;
  assetType: string;
  symbol: string;
  condition: string;
  targetPrice: number;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: bigint;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
}

interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
}

interface ForexRate {
  symbol: string;
  rate: number;
}

interface MarketData {
  stocks: StockQuote[];
  forex: ForexRate[];
  crypto: CryptoQuote[];
  lastUpdated: bigint;
  success: boolean;
}

interface FullBackend {
  getMarketData: () => Promise<MarketData>;
  getYouTubeVideosByQuery: (query: string) => Promise<YouTubeVideo[]>;
  addAlert: (
    assetType: string,
    symbol: string,
    condition: string,
    targetPrice: number,
  ) => Promise<Alert>;
  getAlerts: () => Promise<Alert[]>;
  updateAlert: (id: string, isActive: boolean) => Promise<boolean>;
  deleteAlert: (id: string) => Promise<boolean>;
  markAlertTriggered: (id: string) => Promise<boolean>;
  clearAlertTriggered: (id: string) => Promise<boolean>;
}

export interface AlertsScreenProps {
  isActive: boolean;
  onAlertTriggered: (alert: Alert) => void;
  // ISSUE 2: identity prop to detect logged-out state
  identity?: unknown;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000;

const STOCK_SYMBOLS = [
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
];
const CRYPTO_SYMBOLS = ["BTC", "ETH", "BNB"];
const FOREX_PAIRS = ["USD/NGN", "EUR/NGN", "GBP/NGN", "CNY/NGN", "JPY/NGN"];

const GOLD_GRADIENT =
  "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)";

const PULSE_SKELETON_KEYS = ["ps-1", "ps-2", "ps-3", "ps-4", "ps-5"];
const VIDEO_SKELETON_KEYS = ["vs-1", "vs-2", "vs-3", "vs-4", "vs-5", "vs-6"];
const ALERT_SKELETON_KEYS = ["as-1", "as-2", "as-3"];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Races a promise against an 8-second timeout.
 * On timeout or error, resolves to the provided fallback value instead of throwing.
 */
function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  const timeout = new Promise<T>((resolve) =>
    setTimeout(() => resolve(fallback), FETCH_TIMEOUT_MS),
  );
  return Promise.race([promise.catch(() => fallback), timeout]);
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === "BTC")
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function deriveYouTubeQuery(alerts: Alert[]): string {
  const hasStock = alerts.some((a) => a.assetType === "stock");
  const hasCrypto = alerts.some((a) => a.assetType === "crypto");
  const hasCurrency = alerts.some((a) => a.assetType === "currency");

  const parts: string[] = [];
  if (hasStock) parts.push("stock");
  if (hasCrypto) parts.push("crypto");
  if (hasCurrency) parts.push("forex");

  if (parts.length === 0) return "global financial markets today";
  if (parts.length === 1) {
    if (hasStock) return "stock market analysis today";
    if (hasCrypto) return "crypto market update today";
    return "forex market update today";
  }
  return `${parts.join(" ")} market update today`;
}

// ── Create Alert Modal ─────────────────────────────────────────────────────────

function CreateAlertModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (alert: Alert) => void;
}) {
  const { actor: rawActor } = useActor();
  const actor = rawActor as unknown as FullBackend | null;
  const [assetType, setAssetType] = useState<"stock" | "crypto" | "currency">(
    "stock",
  );
  const [symbol, setSymbol] = useState("AAPL");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const symbols =
    assetType === "stock"
      ? STOCK_SYMBOLS
      : assetType === "crypto"
        ? CRYPTO_SYMBOLS
        : FOREX_PAIRS;

  // Reset symbol when asset type changes
  useEffect(() => {
    setSymbol(
      assetType === "stock"
        ? "AAPL"
        : assetType === "crypto"
          ? "BTC"
          : "USD/NGN",
    );
  }, [assetType]);

  async function handleSubmit() {
    if (!actor) {
      setError("You must be signed in to create alerts.");
      return;
    }
    const parsed = Number.parseFloat(targetPrice);
    if (!targetPrice || Number.isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid target price.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const newAlert = await actor.addAlert(
        assetType,
        symbol,
        condition,
        parsed,
      );
      onCreated(newAlert);
      onClose();
      setTargetPrice("");
    } catch {
      setError("Failed to create alert. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldStyle = {
    background: "#1A1A1A",
    border: "1px solid #2A2A2A",
    color: "#E8E8E8",
    borderRadius: 10,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="alerts.create.modal"
        style={{
          background: "#0F0F0F",
          border: "1px solid #2A2A2A",
          borderRadius: 16,
          maxWidth: 360,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              background: GOLD_GRADIENT,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Set New Alert
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Asset Type */}
          <div>
            <Label
              style={{
                color: "#7A7A7A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              ASSET TYPE
            </Label>
            <div className="flex gap-2 mt-2">
              {(["stock", "crypto", "currency"] as const).map((type) => (
                <button
                  type="button"
                  key={type}
                  data-ocid={`alerts.create.assettype.${type}.toggle`}
                  onClick={() => setAssetType(type)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    border: assetType === type ? "none" : "1px solid #2A2A2A",
                    background: assetType === type ? GOLD_GRADIENT : "#1A1A1A",
                    color: assetType === type ? "rgba(0,0,0,0.8)" : "#7A7A7A",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textTransform: "capitalize",
                  }}
                >
                  {type === "stock"
                    ? "📈 Stock"
                    : type === "crypto"
                      ? "₿ Crypto"
                      : "💱 Currency"}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol */}
          <div>
            <Label
              style={{
                color: "#7A7A7A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              SYMBOL
            </Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger
                data-ocid="alerts.create.symbol.select"
                style={{ ...fieldStyle, marginTop: 6 }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              >
                {symbols.map((s) => (
                  <SelectItem key={s} value={s} style={{ color: "#E8E8E8" }}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div>
            <Label
              style={{
                color: "#7A7A7A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              CONDITION
            </Label>
            <Select
              value={condition}
              onValueChange={(v) => setCondition(v as "above" | "below")}
            >
              <SelectTrigger
                data-ocid="alerts.create.condition.select"
                style={{ ...fieldStyle, marginTop: 6 }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              >
                <SelectItem value="above" style={{ color: "#E8E8E8" }}>
                  📈 Goes above
                </SelectItem>
                <SelectItem value="below" style={{ color: "#E8E8E8" }}>
                  📉 Drops below
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Price */}
          <div>
            <Label
              style={{
                color: "#7A7A7A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              TARGET PRICE (USD)
            </Label>
            <div className="relative mt-1.5">
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#D4AF37",
                  fontWeight: 700,
                  fontSize: 16,
                  pointerEvents: "none",
                }}
              >
                $
              </span>
              <Input
                data-ocid="alerts.create.price.input"
                type="number"
                placeholder="0.00"
                value={targetPrice}
                onChange={(e) => {
                  setTargetPrice(e.target.value);
                  setError("");
                }}
                style={{
                  ...fieldStyle,
                  paddingLeft: 28,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              />
            </div>
            {error && (
              <p
                data-ocid="alerts.create.price.error_state"
                style={{ color: "#E05252", fontSize: 12, marginTop: 4 }}
              >
                {error}
              </p>
            )}
          </div>

          <Button
            data-ocid="alerts.create.submit_button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            style={{
              background: GOLD_GRADIENT,
              color: "rgba(0,0,0,0.85)",
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 12,
              padding: "12px 0",
              height: "auto",
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
              border: "none",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Creating..." : "Create Alert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Alert Card ─────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  index,
  onToggle,
  onDelete,
}: {
  alert: Alert;
  index: number;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      data-ocid={`alerts.alert.item.${index + 1}`}
      style={{
        background: "#1A1A1A",
        border: alert.isTriggered
          ? "1px solid rgba(212,175,55,0.5)"
          : "1px solid #2A2A2A",
        borderRadius: 12,
        padding: "14px 14px",
        marginBottom: 10,
        position: "relative",
        boxShadow: alert.isTriggered
          ? "0 0 16px rgba(212,175,55,0.12)"
          : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Triggered Badge */}
      {alert.isTriggered && (
        <div
          style={{
            position: "absolute",
            top: -8,
            right: 12,
            background: GOLD_GRADIENT,
            borderRadius: 20,
            padding: "2px 10px",
            fontSize: 10,
            fontWeight: 800,
            color: "rgba(0,0,0,0.85)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Zap size={9} />
          TRIGGERED
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Left: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#E8E8E8",
                letterSpacing: "0.02em",
              }}
            >
              {alert.symbol}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: alert.assetType === "crypto" ? "#D4AF37" : "#7A7A7A",
                background:
                  alert.assetType === "crypto"
                    ? "rgba(212,175,55,0.1)"
                    : "rgba(255,255,255,0.06)",
                border:
                  alert.assetType === "crypto"
                    ? "1px solid rgba(212,175,55,0.3)"
                    : "1px solid #2A2A2A",
                borderRadius: 20,
                padding: "2px 7px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {alert.assetType}
            </span>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#7A7A7A",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {alert.condition === "above" ? (
              <TrendingUp size={13} color="#4CAF7A" />
            ) : (
              <TrendingDown size={13} color="#E05252" />
            )}
            <span>
              {alert.condition === "above" ? "Goes above" : "Drops below"}{" "}
              <span style={{ color: "#D4AF37", fontWeight: 700 }}>
                ${alert.targetPrice.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        {/* Right: toggle + delete */}
        <div className="flex items-center gap-3">
          <Switch
            data-ocid={`alerts.alert.toggle.${index + 1}`}
            checked={alert.isActive}
            onCheckedChange={(checked) => onToggle(alert.id, checked)}
          />
          <button
            type="button"
            data-ocid={`alerts.alert.delete_button.${index + 1}`}
            onClick={() => onDelete(alert.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#4A4A4A",
              transition: "color 0.2s",
            }}
            aria-label={`Delete alert for ${alert.symbol}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Market Pulse Card ──────────────────────────────────────────────────────────

function PulseCard({
  symbol,
  name,
  price,
  change,
  index,
}: {
  symbol: string;
  name: string;
  price: number;
  change: number;
  index: number;
}) {
  const isPos = change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      data-ocid={`alerts.pulse.item.${index + 1}`}
      style={{
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        borderRadius: 12,
        padding: "12px 14px",
        minWidth: 130,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#E8E8E8",
          letterSpacing: "0.02em",
          marginBottom: 2,
        }}
      >
        {symbol}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#5A5A5A",
          marginBottom: 8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 110,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#E8E8E8",
          marginBottom: 4,
        }}
      >
        {formatPrice(price, symbol)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          fontSize: 12,
          fontWeight: 700,
          color: isPos ? "#4CAF7A" : "#E05252",
        }}
      >
        {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {isPos ? "+" : ""}
        {change.toFixed(2)}%
      </div>
    </motion.div>
  );
}

// ── Video Card ─────────────────────────────────────────────────────────────────

function VideoCard({
  video,
  index,
  onClick,
}: {
  video: YouTubeVideo;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      data-ocid={`alerts.video.item.${index + 1}`}
      onClick={onClick}
      style={{
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        display: "block",
        width: "100%",
        padding: 0,
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          background: "#111",
        }}
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        {/* Play overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: GOLD_GRADIENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 12px rgba(212,175,55,0.4)",
            }}
          >
            <Play size={14} color="rgba(0,0,0,0.8)" style={{ marginLeft: 2 }} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "10px 10px 12px" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#E8E8E8",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
            marginBottom: 5,
          }}
        >
          {video.title}
        </div>
        <div style={{ fontSize: 10, color: "#5A5A5A", fontWeight: 500 }}>
          {video.channelTitle}
        </div>
      </div>
    </motion.button>
  );
}

// ── Video Player Modal ─────────────────────────────────────────────────────────

function VideoPlayerModal({
  video,
  onClose,
}: {
  video: YouTubeVideo | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!video} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="alerts.video.modal"
        style={{
          background: "#0A0A0A",
          border: "1px solid #2A2A2A",
          borderRadius: 14,
          maxWidth: 420,
          padding: "0",
          overflow: "hidden",
        }}
      >
        {video && (
          <>
            {/* 16:9 iframe container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingBottom: "56.25%",
              }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
            {/* Video info */}
            <div style={{ padding: "14px 16px 16px" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#E8E8E8",
                  lineHeight: 1.4,
                  marginBottom: 4,
                }}
              >
                {video.title}
              </div>
              <div style={{ fontSize: 11, color: "#5A5A5A" }}>
                {video.channelTitle}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Full Empty State ───────────────────────────────────────────────────────────

function FullEmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div
      data-ocid="alerts.full.empty_state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        textAlign: "center",
      }}
    >
      <BellOff size={48} color="#3A3A3A" style={{ marginBottom: 16 }} />
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#5A5A5A",
          marginBottom: 8,
        }}
      >
        Nothing to show yet
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#3A3A3A",
          lineHeight: 1.6,
          marginBottom: 24,
          maxWidth: 260,
        }}
      >
        Sign in and set your first alert, or tap Refresh to try loading market
        data again.
      </div>
      <button
        type="button"
        onClick={onRefresh}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: GOLD_GRADIENT,
          border: "none",
          borderRadius: 12,
          padding: "10px 22px",
          fontSize: 14,
          fontWeight: 700,
          color: "rgba(0,0,0,0.85)",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(212,175,55,0.3)",
        }}
      >
        <RefreshCw size={15} />
        Refresh
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AlertsScreen({
  isActive,
  onAlertTriggered,
  identity: _identity,
}: AlertsScreenProps) {
  const { actor: rawActor } = useActor();
  const actor = rawActor as unknown as FullBackend | null;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  // Tracks whether the initial load has been attempted at least once
  const loadAttemptedRef = useRef(false);

  // Keep a ref to latest alerts for the interval callback
  const alertsRef = useRef<Alert[]>([]);
  alertsRef.current = alerts;

  // Track the current YouTube query to avoid redundant re-fetches
  const currentQueryRef = useRef<string>("global financial markets today");

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchVideos = useCallback(
    async (query?: string) => {
      if (!actor) {
        setLoadingVideos(false);
        return;
      }
      const q = query ?? currentQueryRef.current;
      try {
        const data = await withTimeout(
          actor.getYouTubeVideosByQuery(q),
          [] as YouTubeVideo[],
        );
        setVideos(data.slice(0, 6));
      } finally {
        setLoadingVideos(false);
      }
    },
    [actor],
  );

  // Core load function — called on initial tab open and on manual refresh
  const loadAll = useCallback(async () => {
    setLoadingAlerts(true);
    setLoadingMarket(true);
    setLoadingVideos(true);

    // If no actor (logged out), stop spinners immediately — no canister calls
    if (!actor) {
      setLoadingAlerts(false);
      setLoadingMarket(false);
      setLoadingVideos(false);
      return;
    }

    // Fetch alerts and market data in parallel, each with an 8s timeout
    const [alertData, marketResult] = await Promise.all([
      withTimeout(actor.getAlerts(), [] as Alert[]),
      withTimeout(actor.getMarketData(), null as MarketData | null),
    ]);

    setAlerts(alertData);
    setLoadingAlerts(false);

    if (marketResult) setMarketData(marketResult);
    setLoadingMarket(false);

    // Derive YouTube query from loaded alerts, then fetch videos
    const q = deriveYouTubeQuery(alertData);
    currentQueryRef.current = q;

    const videoData = await withTimeout(
      actor.getYouTubeVideosByQuery(q),
      [] as YouTubeVideo[],
    );
    setVideos(videoData.slice(0, 6));
    setLoadingVideos(false);
  }, [actor]);

  // Initial load when tab becomes active — run once per actor instance
  // biome-ignore lint/correctness/useExhaustiveDependencies: actor reset is intentional
  useEffect(() => {
    if (!isActive) return;
    // Re-run whenever actor changes or tab becomes active
    loadAttemptedRef.current = false;
  }, [actor, isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (loadAttemptedRef.current) return;
    loadAttemptedRef.current = true;
    loadAll();
  }, [isActive, loadAll]);

  // ── Alert checking logic ──────────────────────────────────────────────────────

  const checkAlerts = useCallback(
    async (currentMarketData: MarketData) => {
      if (!actor) return;

      const currentAlerts = alertsRef.current;
      const activeUntriggered = currentAlerts.filter(
        (a) => a.isActive && !a.isTriggered,
      );

      for (const alert of activeUntriggered) {
        let currentPrice: number | null = null;

        if (alert.assetType === "stock") {
          const match = currentMarketData.stocks.find(
            (s) => s.symbol === alert.symbol,
          );
          if (match) currentPrice = match.price;
        } else if (alert.assetType === "crypto") {
          const match = currentMarketData.crypto.find(
            (c) => c.symbol === alert.symbol,
          );
          if (match) currentPrice = match.price;
        }

        if (currentPrice === null) continue;

        const shouldTrigger =
          (alert.condition === "above" && currentPrice > alert.targetPrice) ||
          (alert.condition === "below" && currentPrice < alert.targetPrice);

        if (shouldTrigger) {
          try {
            await withTimeout(actor.markAlertTriggered(alert.id), false);
            setAlerts((prev) =>
              prev.map((a) =>
                a.id === alert.id ? { ...a, isTriggered: true } : a,
              ),
            );
            onAlertTriggered({ ...alert, isTriggered: true });
          } catch {
            // silently fail
          }
        }
      }
    },
    [actor, onAlertTriggered],
  );

  // Market data + alert checking interval (every 60s)
  useEffect(() => {
    if (!isActive || !actor) return;

    const interval = setInterval(async () => {
      try {
        const freshMarket = await withTimeout(
          actor.getMarketData(),
          null as MarketData | null,
        );
        if (freshMarket) {
          setMarketData(freshMarket);
          await checkAlerts(freshMarket);
        }
      } catch {
        // silently fail
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isActive, actor, checkAlerts]);

  // ── Alert actions ────────────────────────────────────────────────────────────

  async function handleToggle(id: string, active: boolean) {
    if (!actor) return;
    try {
      await actor.updateAlert(id, active);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: active } : a)),
      );
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    if (!actor) return;
    try {
      await actor.deleteAlert(id);
      setAlerts((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        const newQuery = deriveYouTubeQuery(updated);
        if (newQuery !== currentQueryRef.current) {
          currentQueryRef.current = newQuery;
          setLoadingVideos(true);
          fetchVideos(newQuery);
        }
        return updated;
      });
    } catch {
      // silently fail
    }
  }

  // ── Market Pulse — top 5 movers (stocks + crypto only) ──────────────────────

  const topMovers = marketData
    ? [
        ...marketData.stocks.map((s) => ({
          symbol: s.symbol,
          name: s.name,
          price: s.price,
          change: s.changesPercentage,
        })),
        ...marketData.crypto.map((c) => ({
          symbol: c.symbol,
          name: c.name,
          price: c.price,
          change: c.changesPercentage,
        })),
      ]
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5)
    : [];

  // Determine if everything finished loading and nothing came back
  const allLoaded = !loadingAlerts && !loadingMarket && !loadingVideos;
  const nothingLoaded =
    allLoaded &&
    alerts.length === 0 &&
    !marketData &&
    videos.length === 0 &&
    !actor;

  // ── Render ────────────────────────────────────────────────────────────────────

  const alertsSection = (
    <section className="mb-8">
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#7A7A7A",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        My Alerts
      </div>
      {loadingAlerts ? (
        <div
          className="flex flex-col gap-3"
          data-ocid="alerts.list.loading_state"
        >
          {ALERT_SKELETON_KEYS.map((k) => (
            <Skeleton
              key={k}
              style={{ height: 70, borderRadius: 12, background: "#1A1A1A" }}
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div
          data-ocid="alerts.list.empty_state"
          style={{ textAlign: "center", padding: "36px 0", color: "#4A4A4A" }}
        >
          <div style={{ marginBottom: 12 }}>
            <BellOff size={36} color="#3A3A3A" />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#5A5A5A",
              marginBottom: 6,
            }}
          >
            No alerts set yet
          </div>
          <div style={{ fontSize: 13, color: "#3A3A3A", lineHeight: 1.5 }}>
            {actor ? (
              <>
                Tap <span style={{ color: "#D4AF37" }}>+</span> to create your
                first price alert
              </>
            ) : (
              "Sign in to create price alerts"
            )}
          </div>
        </div>
      ) : (
        <div data-ocid="alerts.list">
          <AnimatePresence>
            {alerts.map((alert, i) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                index={i}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );

  const pulseAndVideosSection = (
    <>
      <section className="mb-8">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 3,
              height: 16,
              borderRadius: 2,
              background: GOLD_GRADIENT,
              flexShrink: 0,
            }}
          />
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#E8E8E8",
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            Market Pulse
          </h2>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#D4AF37",
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 20,
              padding: "2px 8px",
              letterSpacing: "0.06em",
            }}
          >
            TOP 5 MOVERS
          </span>
        </div>
        {loadingMarket ? (
          <div
            data-ocid="alerts.pulse.loading_state"
            className="flex gap-3 overflow-x-auto pb-2"
          >
            {PULSE_SKELETON_KEYS.map((k) => (
              <Skeleton
                key={k}
                style={{
                  minWidth: 130,
                  height: 90,
                  borderRadius: 12,
                  background: "#1A1A1A",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        ) : topMovers.length > 0 ? (
          <div
            data-ocid="alerts.pulse.list"
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            {topMovers.map((mover, i) => (
              <PulseCard
                key={mover.symbol}
                symbol={mover.symbol}
                name={mover.name}
                price={mover.price}
                change={mover.change}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div
            data-ocid="alerts.pulse.empty_state"
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "#4A4A4A",
              fontSize: 13,
            }}
          >
            Market data unavailable
          </div>
        )}
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 3,
              height: 16,
              borderRadius: 2,
              background: GOLD_GRADIENT,
              flexShrink: 0,
            }}
          />
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#E8E8E8",
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            Financial Education
          </h2>
        </div>
        {loadingVideos ? (
          <div
            data-ocid="alerts.video.loading_state"
            className="grid grid-cols-2 gap-3"
          >
            {VIDEO_SKELETON_KEYS.map((k) => (
              <Skeleton
                key={k}
                style={{ height: 140, borderRadius: 10, background: "#1A1A1A" }}
              />
            ))}
          </div>
        ) : videos.length > 0 ? (
          <div data-ocid="alerts.video.list" className="grid grid-cols-2 gap-3">
            {videos.map((video, i) => (
              <VideoCard
                key={video.videoId}
                video={video}
                index={i}
                onClick={() => setSelectedVideo(video)}
              />
            ))}
          </div>
        ) : (
          <div
            data-ocid="alerts.video.empty_state"
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "#4A4A4A",
              fontSize: 13,
            }}
          >
            Videos unavailable
          </div>
        )}
      </section>
    </>
  );

  return (
    <div
      data-ocid="alerts.page"
      className="flex flex-col overflow-y-auto h-full lg:overflow-visible"
      style={{ background: "#0A0A0A" }}
    >
      <div className="flex flex-col px-4 pt-5 pb-10 lg:pt-6">
        {/* ── Page heading ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: GOLD_GRADIENT,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                margin: 0,
              }}
            >
              Smart Alerts
            </h1>
            <p style={{ fontSize: 13, color: "#6C6C6C", marginTop: 2 }}>
              Never miss a market move
            </p>
          </div>
          <button
            type="button"
            data-ocid="alerts.create.open_modal_button"
            onClick={() => {
              if (!actor) {
                import("sonner").then(({ toast }) =>
                  toast.error("Sign in to create alerts"),
                );
                return;
              }
              setCreateOpen(true);
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: GOLD_GRADIENT,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(212,175,55,0.35)",
              flexShrink: 0,
            }}
            aria-label="Set new alert"
          >
            <Plus size={20} color="rgba(0,0,0,0.8)" strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Full empty state when logged out and nothing loaded ── */}
        {nothingLoaded ? (
          <FullEmptyState onRefresh={loadAll} />
        ) : (
          <>
            {/* Mobile: single column */}
            <div className="lg:hidden">
              {alertsSection}
              {pulseAndVideosSection}
            </div>

            {/* Desktop: two-column grid */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_400px] lg:gap-8 lg:items-start">
              <div>{alertsSection}</div>
              <div>{pulseAndVideosSection}</div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <CreateAlertModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(alert) => {
          setAlerts((prev) => {
            const updated = [alert, ...prev];
            const newQuery = deriveYouTubeQuery(updated);
            if (newQuery !== currentQueryRef.current) {
              currentQueryRef.current = newQuery;
              setLoadingVideos(true);
              fetchVideos(newQuery);
            }
            return updated;
          });
        }}
      />

      <VideoPlayerModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}
