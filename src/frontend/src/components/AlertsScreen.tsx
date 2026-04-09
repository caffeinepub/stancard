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
  AlertTriangle,
  BellOff,
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
import type { SetAlertPayload } from "./Sparkline";

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
  /** When set, opens CreateAlertModal with this pre-filled data from Markets */
  pendingAlert?: SetAlertPayload | null;
  onClearPendingAlert?: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000;
const NOTIF_REQUESTED_KEY = "stancard_notif_requested";

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
const ALERT_SKELETON_KEYS = ["as-1", "as-2", "as-3"];

// ── Helpers ────────────────────────────────────────────────────────────────────

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

/** Request notification permission once (first alert creation only). */
async function requestNotificationPermissionOnce(): Promise<void> {
  if (typeof Notification === "undefined") return;
  if (localStorage.getItem(NOTIF_REQUESTED_KEY)) return;
  localStorage.setItem(NOTIF_REQUESTED_KEY, "1");
  try {
    await Notification.requestPermission();
  } catch {
    // permission denied or API unavailable — silently continue
  }
}

/** Fire a push/local notification for a triggered alert. */
function fireAlertNotification(symbol: string, targetPrice: number): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const title = "Stancard Alert";
  const body = `${symbol} has reached your target price of $${targetPrice.toLocaleString()}`;
  try {
    // Use service worker if available for background support
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, { body, icon: "/icon-192.png" });
        })
        .catch(() => {
          new Notification(title, { body });
        });
    } else {
      new Notification(title, { body });
    }
  } catch {
    // Notification API unavailable — silently ignore
  }
}

// ── Market Price Indicator ─────────────────────────────────────────────────────

function MarketPriceIndicator({
  assetType,
  symbol,
  targetPrice,
  marketData,
}: {
  assetType: "stock" | "crypto" | "currency";
  symbol: string;
  targetPrice: string;
  marketData: MarketData | null;
}) {
  const parsed = Number.parseFloat(targetPrice);
  if (!marketData || !targetPrice || Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  let currentPrice: number | null = null;

  if (assetType === "stock") {
    const match = marketData.stocks.find((s) => s.symbol === symbol);
    if (match) currentPrice = match.price;
  } else if (assetType === "crypto") {
    const match = marketData.crypto.find((c) => c.symbol === symbol);
    if (match) currentPrice = match.price;
  } else if (assetType === "currency") {
    // symbol is like "USD/NGN" — forex rate represents 1 USD in NGN
    const match = marketData.forex.find((f) => f.symbol === symbol);
    if (match) currentPrice = match.rate;
  }

  if (currentPrice === null || currentPrice === 0) return null;

  const pctDiff = ((parsed - currentPrice) / currentPrice) * 100;
  const absPct = Math.abs(pctDiff).toFixed(2);
  const isAbove = pctDiff > 0;
  const isBelow = pctDiff < 0;
  const isSame = Math.abs(pctDiff) < 0.01;

  const currencySymbol = assetType === "currency" ? "₦" : "$";
  const formattedCurrent =
    assetType === "currency"
      ? `${currencySymbol}${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : formatPrice(currentPrice, symbol);

  return (
    <div
      data-ocid="alerts.create.market_indicator"
      style={{
        marginTop: 8,
        padding: "8px 12px",
        borderRadius: 8,
        background: isAbove
          ? "rgba(212,175,55,0.08)"
          : isBelow
            ? "rgba(224,82,82,0.08)"
            : "rgba(255,255,255,0.05)",
        border: isAbove
          ? "1px solid rgba(212,175,55,0.25)"
          : isBelow
            ? "1px solid rgba(224,82,82,0.25)"
            : "1px solid #2A2A2A",
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <span style={{ color: "#7A7A7A" }}>Current price: </span>
      <span style={{ color: "#E8E8E8", fontWeight: 600 }}>
        {formattedCurrent}
      </span>
      {!isSame && (
        <>
          <span style={{ color: "#7A7A7A" }}> — your alert triggers </span>
          <span
            style={{
              fontWeight: 700,
              color: isAbove ? "#D4AF37" : "#E05252",
            }}
          >
            {absPct}% {isAbove ? "above" : "below"} market
          </span>
        </>
      )}
      {isSame && (
        <span style={{ color: "#7A7A7A" }}> — at current market price</span>
      )}
    </div>
  );
}

// ── Create Alert Modal ─────────────────────────────────────────────────────────

function CreateAlertModal({
  open,
  onClose,
  onCreated,
  alertCount,
  marketData,
  presetSymbol,
  presetAssetType,
  presetPrice,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (alert: Alert) => void;
  alertCount: number;
  marketData: MarketData | null;
  presetSymbol?: string;
  presetAssetType?: "stock" | "crypto" | "currency";
  presetPrice?: string;
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

  // Apply preset values when the modal opens
  useEffect(() => {
    if (open && presetAssetType) {
      setAssetType(presetAssetType);
    }
  }, [open, presetAssetType]);

  useEffect(() => {
    if (open && presetSymbol) {
      setSymbol(presetSymbol);
    }
  }, [open, presetSymbol]);

  useEffect(() => {
    if (open && presetPrice) {
      // Strip "$" prefix if present, keep numeric string
      setTargetPrice(presetPrice.replace(/^\$/, "").replace(/,/g, ""));
    }
  }, [open, presetPrice]);

  const symbols =
    assetType === "stock"
      ? STOCK_SYMBOLS
      : assetType === "crypto"
        ? CRYPTO_SYMBOLS
        : FOREX_PAIRS;

  // Reset symbol when asset type changes — but not when a preset symbol is being applied
  const prevAssetTypeRef = useRef(assetType);
  useEffect(() => {
    // Only reset symbol if the assetType changed and the current symbol isn't a preset
    if (prevAssetTypeRef.current !== assetType) {
      prevAssetTypeRef.current = assetType;
      if (!presetSymbol) {
        setSymbol(
          assetType === "stock"
            ? "AAPL"
            : assetType === "crypto"
              ? "BTC"
              : "USD/NGN",
        );
      }
    }
  }, [assetType, presetSymbol]);

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

      // Request notification permission on first alert creation
      if (alertCount === 0) {
        requestNotificationPermissionOnce();
      }

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
              TARGET PRICE{assetType === "currency" ? " (NGN RATE)" : " (USD)"}
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
                {assetType === "currency" ? "₦" : "$"}
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
            {/* Above/Below market indicator */}
            <MarketPriceIndicator
              assetType={assetType}
              symbol={symbol}
              targetPrice={targetPrice}
              marketData={marketData}
            />
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
  pendingAlert,
  onClearPendingAlert,
}: AlertsScreenProps) {
  const { actor: rawActor } = useActor();
  const actor = rawActor as unknown as FullBackend | null;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  // Inline error indicator for the 60s alert-check interval
  const [alertCheckError, setAlertCheckError] = useState(false);
  // Tracks whether the initial load has been attempted at least once
  const loadAttemptedRef = useRef(false);
  // Issue 32: loadIdRef prevents stale loadAll from applying after tab switch
  const loadIdRef = useRef(0);

  // When a pending alert arrives from Markets, open the modal with pre-filled data
  useEffect(() => {
    if (pendingAlert) {
      setCreateOpen(true);
    }
  }, [pendingAlert]);
  // isMounted guard — prevents state updates after the component unmounts
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep a ref to latest alerts for the interval callback
  const alertsRef = useRef<Alert[]>([]);
  alertsRef.current = alerts;

  // ── Data fetching ────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const myId = ++loadIdRef.current;

    setLoadingAlerts(true);
    setLoadingMarket(true);
    setAlertCheckError(false);

    if (!actor) {
      setLoadingAlerts(false);
      setLoadingMarket(false);
      return;
    }

    const [alertData, marketResult] = await Promise.all([
      withTimeout(actor.getAlerts(), [] as Alert[]),
      withTimeout(actor.getMarketData(), null as MarketData | null),
    ]);

    if (loadIdRef.current !== myId || !isMountedRef.current) return;

    setAlerts(alertData);
    setLoadingAlerts(false);

    if (marketResult) setMarketData(marketResult);
    setLoadingMarket(false);
  }, [actor]);

  // Initial load when tab becomes active
  // biome-ignore lint/correctness/useExhaustiveDependencies: actor reset is intentional
  useEffect(() => {
    if (!isActive) return;
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
        try {
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
          } else if (alert.assetType === "currency") {
            const match = currentMarketData.forex.find(
              (f) => f.symbol === alert.symbol,
            );
            if (match) currentPrice = match.rate;
          }

          if (currentPrice === null) continue;

          const shouldTrigger =
            (alert.condition === "above" && currentPrice > alert.targetPrice) ||
            (alert.condition === "below" && currentPrice < alert.targetPrice);

          if (shouldTrigger) {
            await withTimeout(actor.markAlertTriggered(alert.id), false);
            setAlerts((prev) =>
              prev.map((a) =>
                a.id === alert.id ? { ...a, isTriggered: true } : a,
              ),
            );
            onAlertTriggered({ ...alert, isTriggered: true });
            // Fire push/local notification
            fireAlertNotification(alert.symbol, alert.targetPrice);
          }
        } catch (err) {
          console.error("Alert check error for", alert.id, err);
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
        if (!isMountedRef.current) return;
        if (freshMarket) {
          setMarketData(freshMarket);
          setAlertCheckError(false);
          try {
            await checkAlerts(freshMarket);
          } catch (err) {
            console.error("checkAlerts error:", err);
            if (isMountedRef.current) setAlertCheckError(true);
          }
        } else {
          if (isMountedRef.current) setAlertCheckError(true);
        }
      } catch (err) {
        console.error("Market data interval error:", err);
        if (isMountedRef.current) setAlertCheckError(true);
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isActive, actor, checkAlerts]);

  // ── Alert actions ────────────────────────────────────────────────────────────

  async function handleToggle(id: string, active: boolean) {
    if (!actor) return;
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: active } : a)),
    );
    try {
      await withTimeout(actor.updateAlert(id, active), false);
    } catch {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !active } : a)),
      );
      import("sonner").then(({ toast }) =>
        toast.error("Failed to update alert. Please try again."),
      );
    }
  }

  async function handleDelete(id: string) {
    if (!actor) return;
    try {
      await withTimeout(actor.deleteAlert(id), false);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      import("sonner").then(({ toast }) =>
        toast.error("Failed to delete alert. Please try again."),
      );
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

  const allLoaded = !loadingAlerts && !loadingMarket;
  const isLoggedIn = !!rawActor;
  const nothingLoaded =
    allLoaded && !isLoggedIn && alerts.length === 0 && !marketData;

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

  const pulseSection = (
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
            background: "#1A1A1A",
            border: "1px solid rgba(212,175,55,0.15)",
            borderRadius: 12,
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, lineHeight: 1 }}>📡</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E8E8" }}>
            Unable to fetch market data
          </div>
          <div style={{ fontSize: 12, color: "#5A5A5A", lineHeight: 1.5 }}>
            This may be a temporary connection issue. Tap to retry.
          </div>
          <button
            type="button"
            data-ocid="alerts.pulse.retry_button"
            onClick={() => {
              setLoadingMarket(true);
              if (actor) {
                withTimeout(actor.getMarketData(), null as MarketData | null)
                  .then((result) => {
                    if (result) setMarketData(result);
                  })
                  .finally(() => setLoadingMarket(false));
              } else {
                setLoadingMarket(false);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: GOLD_GRADIENT,
              border: "none",
              borderRadius: 10,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(0,0,0,0.85)",
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(212,175,55,0.3)",
            }}
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      )}
    </section>
  );

  return (
    <div
      data-ocid="alerts.page"
      className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-visible lg:flex-none"
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

        {/* ── Interval error banner ── */}
        {alertCheckError && (
          <div
            data-ocid="alerts.check.error_banner"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(212,175,55,0.07)",
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
            }}
          >
            <AlertTriangle
              size={14}
              style={{ color: "#D4AF37", flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: "#9A9A9A", flex: 1 }}>
              Alert check failed — will retry in 60s
            </span>
            <button
              type="button"
              onClick={() => {
                setAlertCheckError(false);
                loadAll();
              }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#D4AF37",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 2px",
                flexShrink: 0,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Full empty state when logged out and nothing loaded ── */}
        {nothingLoaded ? (
          <FullEmptyState onRefresh={loadAll} />
        ) : (
          <>
            {/* Mobile: single column */}
            <div className="lg:hidden">
              {alertsSection}
              {pulseSection}
            </div>

            {/* Desktop: two-column grid */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_400px] lg:gap-8 lg:items-start">
              <div>{alertsSection}</div>
              <div>{pulseSection}</div>
            </div>
          </>
        )}
      </div>

      {/* ── Create Alert Modal ── */}
      <CreateAlertModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          onClearPendingAlert?.();
        }}
        alertCount={alerts.length}
        marketData={marketData}
        presetSymbol={pendingAlert?.symbol}
        presetAssetType={
          pendingAlert?.assetType === "forex"
            ? "currency"
            : (pendingAlert?.assetType as
                | "stock"
                | "crypto"
                | "currency"
                | undefined)
        }
        presetPrice={pendingAlert?.currentPrice}
        onCreated={(alert) => {
          setAlerts((prev) => [alert, ...prev]);
        }}
      />
    </div>
  );
}
