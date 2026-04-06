import { useCallback, useEffect, useRef, useState } from "react";

const GOLD = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.15)";
const MODAL_BG = "#0F0F0F";
const MUTED = "#6C6C6C";
const WHITE = "#E8E8E8";
const GREEN = "#22C55E";
const RED = "#EF4444";

// ─── Data generator ────────────────────────────────────────────────────────────

function createRng(seed: number) {
  let s = seed | 0;
  if (s === 0) s = 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function symbolSeed(symbol: string): number {
  let n = 0;
  for (let i = 0; i < symbol.length; i++) {
    n += symbol.charCodeAt(i) * (i + 1);
  }
  return n || 1;
}

export function generateSparklineData(
  symbol: string,
  currentPrice: number,
  changePercent: number,
): number[] {
  if (symbol === "USD" && currentPrice === 1.0) {
    return [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
  }

  const rng = createRng(symbolSeed(symbol));
  const points = 7;
  const startPrice = currentPrice / (1 + changePercent / 100);
  const noiseScale = currentPrice * 0.012;
  const data: number[] = [];

  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const baseValue = startPrice + (currentPrice - startPrice) * t;
    const noise = (rng() - 0.5) * 2 * noiseScale;
    const noiseDamping = Math.sin(Math.PI * t);
    data.push(baseValue + noise * noiseDamping);
  }

  data[points - 1] = currentPrice;
  return data;
}

// ─── Sparkline (card-level, visual only) ──────────────────────────────────────

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 80, height = 30 }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const padY = 3;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => (i / (data.length - 1)) * width;
  const toY = (v: number) =>
    padY + (1 - (v - minVal) / range) * (height - padY * 2);

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={GOLD}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Interactive Chart ────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  price: number;
}

function InteractiveChart({
  data,
  symbol,
  priceUnit,
}: {
  data: number[];
  symbol: string;
  priceUnit?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    price: 0,
  });

  const SVG_WIDTH = 480;
  const SVG_HEIGHT = 160;
  const padX = 12;
  const padY = 16;
  const chartW = SVG_WIDTH - padX * 2;
  const chartH = SVG_HEIGHT - padY * 2;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const toX = useCallback(
    (i: number) => padX + (i / (data.length - 1)) * chartW,
    [data.length, chartW],
  );
  const toY = useCallback(
    (v: number) => padY + (1 - (v - minVal) / range) * chartH,
    [minVal, range, chartH],
  );

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  const areaPath = [
    `M ${toX(0)},${toY(data[0])}`,
    ...data.slice(1).map((v, i) => `L ${toX(i + 1)},${toY(v)}`),
    `L ${toX(data.length - 1)},${SVG_HEIGHT - padY}`,
    `L ${toX(0)},${SVG_HEIGHT - padY}`,
    "Z",
  ].join(" ");

  const getNearestIndex = useCallback(
    (rawX: number) =>
      Math.round(
        Math.max(
          0,
          Math.min(
            data.length - 1,
            ((rawX - padX) / chartW) * (data.length - 1),
          ),
        ),
      ),
    [data.length, chartW],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_WIDTH / rect.width;
      const rawX = (e.clientX - rect.left) * scaleX;
      const idx = getNearestIndex(rawX);
      setTooltip({
        visible: true,
        x: toX(idx),
        y: toY(data[idx]),
        price: data[idx],
      });
    },
    [data, toX, toY, getNearestIndex],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || e.touches.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_WIDTH / rect.width;
      const rawX = (e.touches[0].clientX - rect.left) * scaleX;
      const idx = getNearestIndex(rawX);
      setTooltip({
        visible: true,
        x: toX(idx),
        y: toY(data[idx]),
        price: data[idx],
      });
    },
    [data, toX, toY, getNearestIndex],
  );

  const handleLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  const formatTooltipPrice = (price: number): string => {
    if (priceUnit) {
      if (price >= 1000)
        return price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      if (price < 0.01) return price.toFixed(6);
      return price.toFixed(4);
    }
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const gradientId = `grad-${symbol}`;
  const tooltipLeftPct = `${(tooltip.x / SVG_WIDTH) * 100}%`;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        width="100%"
        height={SVG_HEIGHT}
        style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleLeave}
        aria-label={`7-day price chart for ${symbol}`}
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD_DIM} stopOpacity={1} />
            <stop
              offset="100%"
              stopColor="rgba(212,175,55,0)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

        <polyline
          points={points}
          fill="none"
          stroke={GOLD}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {tooltip.visible && (
          <>
            <line
              x1={tooltip.x}
              y1={padY}
              x2={tooltip.x}
              y2={SVG_HEIGHT - padY}
              stroke={GOLD}
              strokeWidth={1}
              strokeDasharray="4 3"
              strokeOpacity={0.7}
            />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={4}
              fill={GOLD}
              stroke="#0F0F0F"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: tooltipLeftPct,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            zIndex: 10,
            padding: "4px 8px",
            borderRadius: "6px",
            background: "#111",
            border: `1px solid ${GOLD}`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: GOLD }}>
            {formatTooltipPrice(tooltip.price)}
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
          paddingLeft: `${(padX / SVG_WIDTH) * 100}%`,
          paddingRight: `${(padX / SVG_WIDTH) * 100}%`,
        }}
      >
        <span style={{ fontSize: "10px", color: MUTED }}>7d ago</span>
        <span style={{ fontSize: "10px", color: MUTED }}>4d ago</span>
        <span style={{ fontSize: "10px", color: MUTED }}>Today</span>
      </div>
    </div>
  );
}

// ─── ExpandedChartModal ───────────────────────────────────────────────────────────

export interface ExpandedChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  currentPrice: string;
  changePercent: number;
  sparkData: number[];
  priceUnit?: string;
  // ISSUE 14: navigate to alerts tab
  onSetAlert?: () => void;
}

function OverlayBackdrop({ onClose }: { onClose: () => void }) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: ESC key is handled by a window keydown listener in ExpandedChartModal
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1000,
      }}
      onClick={onClose}
      data-ocid="markets.modal"
      aria-hidden="true"
    />
  );
}

export function ExpandedChartModal({
  isOpen,
  onClose,
  symbol,
  name,
  currentPrice,
  changePercent,
  sparkData,
  priceUnit,
  onSetAlert,
}: ExpandedChartModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const has7dChange = changePercent !== 0 && changePercent !== undefined;
  const isPositive = changePercent >= 0;
  const high7d = sparkData.length > 0 ? Math.max(...sparkData) : 0;
  const low7d = sparkData.length > 0 ? Math.min(...sparkData) : 0;

  const formatStat = (v: number): string => {
    if (priceUnit) {
      if (v >= 1000)
        return v.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      if (v < 0.01) return v.toFixed(6);
      return v.toFixed(4);
    }
    return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Backdrop (separate component to isolate biome-ignore) */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
        <OverlayBackdrop onClose={onClose} />
      </div>

      {/* Sheet / Dialog */}
      <div
        style={{
          background: MODAL_BG,
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px 20px 32px",
          position: "relative",
          pointerEvents: "auto",
        }}
        className="lg:rounded-2xl lg:max-w-[520px] lg:mb-0 lg:self-center"
        aria-modal="true"
        aria-label={`${symbol} expanded chart`}
        data-ocid="markets.expanded.panel"
      >
        {/* Handle bar (mobile only) */}
        <div className="lg:hidden flex justify-center mb-5">
          <div
            style={{
              width: "40px",
              height: "4px",
              borderRadius: "2px",
              background: "#2A2A2A",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: GOLD,
                lineHeight: 1.2,
              }}
            >
              {symbol}
            </p>
            <p style={{ fontSize: "13px", color: MUTED, marginTop: "2px" }}>
              {name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              color: MUTED,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              flexShrink: 0,
            }}
            aria-label="Close chart"
            data-ocid="markets.expanded.close_button"
          >
            ✕
          </button>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: has7dChange
              ? "1fr 1fr 1fr 1fr"
              : "1fr 1fr 1fr",
            gap: "12px",
            marginBottom: "20px",
            padding: "14px",
            background: "#0A0A0A",
            borderRadius: "12px",
            border: "1px solid #1A1A1A",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "9px",
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "4px",
              }}
            >
              Price
            </p>
            <p
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: WHITE,
                lineHeight: 1.2,
              }}
            >
              {currentPrice}
            </p>
            {priceUnit && (
              <p style={{ fontSize: "10px", color: MUTED }}>{priceUnit}</p>
            )}
          </div>

          {has7dChange && (
            <div>
              <p
                style={{
                  fontSize: "9px",
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "4px",
                }}
              >
                7d Change
              </p>
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: isPositive ? GREEN : RED,
                  lineHeight: 1.2,
                }}
              >
                {isPositive ? "▲" : "▼"} {Math.abs(changePercent).toFixed(2)}%
              </p>
            </div>
          )}

          <div>
            <p
              style={{
                fontSize: "9px",
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "4px",
              }}
            >
              7d High
            </p>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: GOLD,
                lineHeight: 1.2,
              }}
            >
              {formatStat(high7d)}
            </p>
          </div>

          <div>
            <p
              style={{
                fontSize: "9px",
                color: MUTED,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "4px",
              }}
            >
              7d Low
            </p>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: GOLD,
                lineHeight: 1.2,
              }}
            >
              {formatStat(low7d)}
            </p>
          </div>
        </div>

        {/* Interactive chart */}
        <InteractiveChart
          data={sparkData}
          symbol={symbol}
          priceUnit={priceUnit}
        />

        {/* ISSUE 14: Set Alert button */}
        {onSetAlert && (
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button
              type="button"
              onClick={() => {
                onSetAlert();
                onClose();
              }}
              style={{
                background: "transparent",
                border: "1px solid #D4AF37",
                borderRadius: 8,
                color: "#D4AF37",
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 14px",
                cursor: "pointer",
                letterSpacing: "0.04em",
              }}
              data-ocid="markets.expanded.set_alert_button"
            >
              🔔 Set Alert
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
