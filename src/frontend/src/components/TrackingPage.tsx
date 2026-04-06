import {
  Check,
  ChevronLeft,
  Copy,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrackingEntry {
  status: string;
  timestamp: bigint;
}

interface ShipmentTracking {
  trackingCode: string;
  requestId: string;
  packageId: string;
  entries: TrackingEntry[];
  currentStatus: string;
}

interface TrackingPageProps {
  code: string;
  onBack: () => void;
  actor: {
    getTrackingByCode: (code: string) => Promise<ShipmentTracking | undefined>;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUSES = ["Pending", "Accepted", "In Transit", "Delivered"];

function statusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "Accepted":
      return {
        bg: "rgba(74,144,217,0.12)",
        text: "#4A90D9",
        border: "rgba(74,144,217,0.3)",
      };
    case "In Transit":
      return {
        bg: "rgba(245,166,35,0.12)",
        text: "#F5A623",
        border: "rgba(245,166,35,0.3)",
      };
    case "Delivered":
      return {
        bg: "rgba(126,211,33,0.12)",
        text: "#7ED321",
        border: "rgba(126,211,33,0.3)",
      };
    default:
      return {
        bg: "rgba(150,150,150,0.1)",
        text: "#9A9A9A",
        border: "rgba(150,150,150,0.2)",
      };
  }
}

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStepIndex(status: string): number {
  return STATUSES.indexOf(status);
}

// ─── Step Tracker ─────────────────────────────────────────────────────────────

function StepTracker({ currentStatus }: { currentStatus: string }) {
  const currentIdx = getStepIndex(currentStatus);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        position: "relative",
        padding: "4px 0 0",
        marginBottom: 8,
      }}
    >
      {STATUSES.map((step, i) => {
        const isCompleted = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const isFirst = i === 0;
        const isLast = i === STATUSES.length - 1;

        return (
          <div
            key={step}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              position: "relative",
            }}
          >
            {/* Connector line — left */}
            {!isFirst && (
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: 0,
                  right: "50%",
                  height: 2,
                  background:
                    i <= currentIdx
                      ? "linear-gradient(90deg, #D4AF37, #D4AF37)"
                      : "#2A2A2A",
                  transition: "background 0.4s ease",
                  zIndex: 0,
                }}
              />
            )}
            {/* Connector line — right */}
            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: "50%",
                  right: 0,
                  height: 2,
                  background:
                    i < currentIdx
                      ? "linear-gradient(90deg, #D4AF37, #D4AF37)"
                      : "#2A2A2A",
                  transition: "background 0.4s ease",
                  zIndex: 0,
                }}
              />
            )}

            {/* Circle */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 1,
                background: isCompleted
                  ? isCurrent
                    ? "#D4AF37"
                    : "rgba(212,175,55,0.25)"
                  : "#1A1A1A",
                border: isCompleted
                  ? isCurrent
                    ? "2px solid #D4AF37"
                    : "2px solid rgba(212,175,55,0.5)"
                  : "2px solid #2A2A2A",
                boxShadow: isCurrent ? "0 0 12px rgba(212,175,55,0.5)" : "none",
                transition: "all 0.4s ease",
                flexShrink: 0,
              }}
            >
              {isCompleted && !isCurrent ? (
                <Check size={13} style={{ color: "#D4AF37" }} />
              ) : isCurrent ? (
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#111",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#2A2A2A",
                  }}
                />
              )}
            </motion.div>

            {/* Label */}
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                fontWeight: isCurrent ? 700 : 500,
                color: isCompleted
                  ? isCurrent
                    ? "#D4AF37"
                    : "#9A9A9A"
                  : "#4A4A4A",
                textAlign: "center",
                lineHeight: 1.3,
                letterSpacing: "0.03em",
                maxWidth: 64,
              }}
            >
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ entries }: { entries: TrackingEntry[] }) {
  if (entries.length === 0) return null;

  // Sort newest first
  const sorted = [...entries].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {sorted.map((entry, i) => {
        const colors = statusColor(entry.status);
        return (
          <motion.div
            key={`${entry.status}-${String(entry.timestamp)}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              paddingBottom: i < sorted.length - 1 ? 0 : 0,
              position: "relative",
            }}
          >
            {/* Timeline line */}
            {i < sorted.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 11,
                  top: 24,
                  bottom: 0,
                  width: 2,
                  background: "#1A1A1A",
                }}
              />
            )}

            {/* Dot */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: colors.text,
                }}
              />
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                borderBottom:
                  i < sorted.length - 1 ? "1px solid #1A1A1A" : "none",
                paddingBottom: 14,
                paddingTop: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  {entry.status}
                </span>
                {i === 0 && (
                  <span
                    style={{
                      background: "rgba(212,175,55,0.1)",
                      color: "#D4AF37",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    Latest
                  </span>
                )}
              </div>
              <div style={{ color: "#6C6C6C", fontSize: 12 }}>
                {formatTimestamp(entry.timestamp)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrackingPage({
  code: initialCode,
  onBack,
  actor,
}: TrackingPageProps) {
  const [inputCode, setInputCode] = useState(initialCode || "");
  const [activeCode, setActiveCode] = useState(initialCode || "");
  const [tracking, setTracking] = useState<ShipmentTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searched, setSearched] = useState(false);

  // Auto-fetch if code was pre-supplied
  useEffect(() => {
    if (initialCode?.trim()) {
      void fetchTracking(initialCode.trim() ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function fetchTracking(code: string) {
    if (!actor) {
      setNotFound(true);
      setSearched(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setTracking(null);
    setSearched(false);
    try {
      const result = await actor.getTrackingByCode(code.trim().toUpperCase());
      if (result) {
        setTracking(result);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = inputCode.trim().toUpperCase();
    if (!code) return;
    setActiveCode(code);
    void fetchTracking(code);
  }

  function handleCopyCode(code: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        toast.success("Tracking code copied!");
      })
      .catch(() => {
        toast.error("Failed to copy code");
      });
  }

  const statusColors = tracking ? statusColor(tracking.currentStatus) : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050505",
        zIndex: 300,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
      data-ocid="move.tracking.page"
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "rgba(5,5,5,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1A1A1A",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#D4AF37",
            padding: 6,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
          data-ocid="move.tracking.back_button"
        >
          <ChevronLeft size={18} />
          <span>Back</span>
        </button>
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#E8E8E8",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            Track Shipment
          </div>
          <div style={{ color: "#4A4A4A", fontSize: 11, marginTop: 1 }}>
            Stancard Move · Real-time tracking
          </div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(212,175,55,0.1)",
            border: "1px solid rgba(212,175,55,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Package size={16} style={{ color: "#D4AF37" }} />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "24px 16px 48px",
          maxWidth: 560,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Search form */}
        <form onSubmit={handleSearch} style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 8 }}>
            <label
              htmlFor="tracking-code-input"
              style={{
                color: "#9A9A9A",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 8,
              }}
            >
              Enter Tracking Code
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="tracking-code-input"
                type="text"
                placeholder="MOVE-XXXXXXXX"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  background: "#111",
                  border: "1px solid #2A2A2A",
                  borderRadius: 10,
                  color: "#D4AF37",
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "11px 14px",
                  outline: "none",
                  letterSpacing: "0.06em",
                  fontFamily: "monospace",
                }}
                data-ocid="move.tracking.code.input"
                spellCheck={false}
                autoCapitalize="characters"
              />
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                style={{
                  background:
                    "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
                  color: "#111",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 18px",
                  cursor:
                    loading || !inputCode.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !inputCode.trim() ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  flexShrink: 0,
                }}
                data-ocid="move.tracking.search.button"
              >
                {loading ? (
                  <Loader2
                    size={16}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                ) : (
                  <Search size={16} />
                )}
                Track
              </button>
            </div>
          </div>
        </form>

        {/* Loading state */}
        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "48px 0",
            }}
            data-ocid="move.tracking.loading_state"
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "2px solid rgba(212,175,55,0.2)",
                borderTopColor: "#D4AF37",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ color: "#6C6C6C", fontSize: 13 }}>
              Looking up shipment…
            </p>
          </div>
        )}

        {/* Not found */}
        {!loading && notFound && searched && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "#111",
              border: "1px solid #1A1A1A",
              borderRadius: 14,
              padding: 32,
              textAlign: "center",
            }}
            data-ocid="move.tracking.error_state"
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#1A0A0A",
                border: "1px solid rgba(248,113,113,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Package size={24} style={{ color: "#F87171" }} />
            </div>
            <h3
              style={{
                color: "#E8E8E8",
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Shipment Not Found
            </h3>
            <p style={{ color: "#6C6C6C", fontSize: 13, marginBottom: 20 }}>
              No shipment found for code{" "}
              <span
                style={{
                  color: "#D4AF37",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                {activeCode}
              </span>
              . Please check the code and try again.
            </p>
            <button
              type="button"
              onClick={() => {
                setNotFound(false);
                setSearched(false);
                setInputCode("");
              }}
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 8,
                color: "#D4AF37",
                fontWeight: 600,
                fontSize: 13,
                padding: "9px 18px",
                cursor: "pointer",
              }}
              data-ocid="move.tracking.try_again.button"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Tracking result */}
        <AnimatePresence>
          {!loading && tracking && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              data-ocid="move.tracking.success_state"
            >
              {/* Tracking code card */}
              <div
                style={{
                  background: "#111",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    color: "#6C6C6C",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  Tracking Code
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      color: "#D4AF37",
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {tracking.trackingCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(tracking.trackingCode)}
                    style={{
                      background: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.25)",
                      borderRadius: 8,
                      color: "#D4AF37",
                      cursor: "pointer",
                      padding: "7px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                    data-ocid="move.tracking.copy.button"
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                </div>
              </div>

              {/* Current status badge */}
              {statusColors && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: statusColors.bg,
                    border: `1px solid ${statusColors.border}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: statusColors.text,
                      boxShadow: `0 0 8px ${statusColors.text}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: statusColors.text,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {tracking.currentStatus}
                  </span>
                  {tracking.entries.length > 0 && (
                    <span
                      style={{
                        color: "#4A4A4A",
                        fontSize: 12,
                        marginLeft: "auto",
                      }}
                    >
                      Updated{" "}
                      {formatTimestamp(
                        tracking.entries[tracking.entries.length - 1].timestamp,
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Step tracker */}
              <div
                style={{
                  background: "#111",
                  border: "1px solid #1A1A1A",
                  borderRadius: 14,
                  padding: "20px 20px 16px",
                }}
              >
                <div
                  style={{
                    color: "#6C6C6C",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 18,
                  }}
                >
                  Shipment Progress
                </div>
                <StepTracker currentStatus={tracking.currentStatus} />
              </div>

              {/* Status history timeline */}
              {tracking.entries.length > 0 && (
                <div
                  style={{
                    background: "#111",
                    border: "1px solid #1A1A1A",
                    borderRadius: 14,
                    padding: "20px 20px 6px",
                  }}
                >
                  <div
                    style={{
                      color: "#6C6C6C",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 16,
                    }}
                  >
                    Status History
                  </div>
                  <StatusTimeline entries={tracking.entries} />
                </div>
              )}

              {/* Package meta */}
              <div
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #1A1A1A",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{ color: "#4A4A4A", fontSize: 10, marginBottom: 3 }}
                  >
                    Package ID
                  </div>
                  <div
                    style={{
                      color: "#6C6C6C",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  >
                    #{tracking.packageId.slice(-8)}
                  </div>
                </div>
                <div>
                  <div
                    style={{ color: "#4A4A4A", fontSize: 10, marginBottom: 3 }}
                  >
                    Request ID
                  </div>
                  <div
                    style={{
                      color: "#6C6C6C",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  >
                    #{tracking.requestId.slice(-8)}
                  </div>
                </div>
                <div>
                  <div
                    style={{ color: "#4A4A4A", fontSize: 10, marginBottom: 3 }}
                  >
                    Total Updates
                  </div>
                  <div
                    style={{ color: "#9A9A9A", fontSize: 12, fontWeight: 600 }}
                  >
                    {tracking.entries.length}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state — no code entered yet */}
        {!loading && !tracking && !notFound && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "40px 0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Package size={28} style={{ color: "#D4AF37", opacity: 0.7 }} />
            </div>
            <h3 style={{ color: "#5A5A5A", fontSize: 15, fontWeight: 600 }}>
              Enter a tracking code above
            </h3>
            <p style={{ color: "#3A3A3A", fontSize: 13, maxWidth: 280 }}>
              Your tracking code looks like{" "}
              <span
                style={{
                  color: "#D4AF37",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                MOVE-XXXXXXXX
              </span>
              . You can find it on your delivery confirmation.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
