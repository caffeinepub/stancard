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
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Check,
  Copy,
  CreditCard,
  Download,
  Lock,
  QrCode,
  RefreshCw,
  Send,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import QRCodeLib from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── QR Code Generation ─────────────────────────────────────────────────────────

function QRCodeDisplay({
  value,
  size = 200,
}: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    setGenerated(false);
    const timeout = setTimeout(() => {
      // 8-second timeout on QR generation
      const timer = setTimeout(() => setGenerated(true), 8000);
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#D4AF37",
          light: "#0F0F0F",
        },
        errorCorrectionLevel: "M",
      })
        .then(() => {
          clearTimeout(timer);
          setGenerated(true);
        })
        .catch(() => {
          clearTimeout(timer);
          setGenerated(true);
        });
    }, 50);
    return () => clearTimeout(timeout);
  }, [value, size]);

  return (
    <div
      style={{
        background: "#0F0F0F",
        border: "2px solid rgba(212,175,55,0.4)",
        borderRadius: 12,
        padding: 12,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 24px rgba(212,175,55,0.12)",
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          borderRadius: 6,
          display: "block",
          opacity: generated ? 1 : 0.3,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}

// ── QR Code Scanner ────────────────────────────────────────────────────────────

function QRScanner({
  onScan,
  onClose,
}: {
  onScan: (result: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const animFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      setError("");
      setScanning(false);
      try {
        const stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          }),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("Camera timeout")), 8000),
          ),
        ]);
        if (!mounted) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
          startDecode();
        }
      } catch {
        if (mounted)
          setError(
            "Camera not accessible. Please paste the principal ID manually.",
          );
      }
    }

    void startCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }

  function startDecode() {
    // Use @zxing/browser dynamically to decode QR code frames
    import("@zxing/browser")
      .then(({ BrowserMultiFormatReader }) => {
        const reader = new BrowserMultiFormatReader();

        function tick() {
          if (!videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(tick);
            return;
          }
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 320;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            animFrameRef.current = requestAnimationFrame(tick);
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const result = reader.decodeFromCanvas(canvas);
            if (result) {
              stopCamera();
              onScan(result.getText());
              return;
            }
          } catch {
            // No QR code found in this frame — keep scanning
          }
          animFrameRef.current = requestAnimationFrame(tick);
        }
        animFrameRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        setError(
          "QR scanner unavailable. Please paste the principal ID manually.",
        );
      });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            background:
              "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Scan QR Code
        </span>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          aria-label="Close scanner"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} color="#E8E8E8" />
        </button>
      </div>

      {/* Video / Error */}
      {error ? (
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid rgba(224,82,82,0.3)",
            borderRadius: 14,
            padding: "24px 20px",
            maxWidth: 320,
            textAlign: "center",
            color: "#E8E8E8",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: 300,
              height: 300,
              borderRadius: 16,
              objectFit: "cover",
              border: "2px solid rgba(212,175,55,0.5)",
              display: "block",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {/* Corner guides */}
          {scanning && (
            <>
              {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                <div
                  key={pos}
                  style={{
                    position: "absolute",
                    width: 24,
                    height: 24,
                    borderColor: "#D4AF37",
                    borderStyle: "solid",
                    borderWidth: 0,
                    ...(pos === "tl"
                      ? {
                          top: 12,
                          left: 12,
                          borderTopWidth: 3,
                          borderLeftWidth: 3,
                          borderTopLeftRadius: 4,
                        }
                      : {}),
                    ...(pos === "tr"
                      ? {
                          top: 12,
                          right: 12,
                          borderTopWidth: 3,
                          borderRightWidth: 3,
                          borderTopRightRadius: 4,
                        }
                      : {}),
                    ...(pos === "bl"
                      ? {
                          bottom: 12,
                          left: 12,
                          borderBottomWidth: 3,
                          borderLeftWidth: 3,
                          borderBottomLeftRadius: 4,
                        }
                      : {}),
                    ...(pos === "br"
                      ? {
                          bottom: 12,
                          right: 12,
                          borderBottomWidth: 3,
                          borderRightWidth: 3,
                          borderBottomRightRadius: 4,
                        }
                      : {}),
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  padding: "8px 0",
                  fontSize: 12,
                  color: "rgba(212,175,55,0.8)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                Point at a Stancard QR code
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── QR Receive Section ─────────────────────────────────────────────────────────

function QRReceiveSection({
  principalId,
}: {
  principalId: string;
}) {
  const [copiedPrincipal, setCopiedPrincipal] = useState(false);

  function handleCopyPrincipal() {
    navigator.clipboard.writeText(principalId);
    setCopiedPrincipal(true);
    setTimeout(() => setCopiedPrincipal(false), 2000);
  }

  return (
    <div
      data-ocid="pay.receive.qr_section"
      style={{
        background: "#1A1A1A",
        border: "1px solid rgba(212,175,55,0.25)",
        borderRadius: 14,
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginBottom: 4,
          }}
        >
          <QrCode size={16} color="#D4AF37" />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#E8E8E8",
              letterSpacing: "0.02em",
            }}
          >
            Receive via QR Code
          </span>
        </div>
        <p
          style={{
            fontSize: 11,
            color: "#6C6C6C",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Anyone can scan this to send you money directly
        </p>
      </div>

      {/* QR Code */}
      <QRCodeDisplay value={principalId} size={180} />

      {/* Copy Principal ID */}
      <button
        type="button"
        data-ocid="pay.receive.copy_principal.button"
        onClick={handleCopyPrincipal}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: copiedPrincipal
            ? "rgba(212,175,55,0.15)"
            : "rgba(212,175,55,0.07)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: 10,
          padding: "9px 18px",
          cursor: "pointer",
          color: "#D4AF37",
          fontSize: 13,
          fontWeight: 600,
          transition: "all 0.2s ease",
          width: "100%",
          justifyContent: "center",
          maxWidth: 240,
        }}
      >
        {copiedPrincipal ? <Check size={14} /> : <Copy size={14} />}
        {copiedPrincipal ? "Copied!" : "Copy Principal ID"}
      </button>

      {/* Truncated ID preview */}
      <div
        style={{
          fontSize: 11,
          color: "#4A4A4A",
          fontFamily: "monospace",
          textAlign: "center",
          wordBreak: "break-all",
          padding: "0 8px",
        }}
      >
        {principalId.length > 30
          ? `${principalId.slice(0, 15)}...${principalId.slice(-15)}`
          : principalId}
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Currency = "NGN" | "USD" | "EUR" | "GBP" | "CNY";
type TxType = "fund" | "send" | "receive";
type TxStatus = "completed" | "pending" | "failed";

interface Transaction {
  id: string;
  type: TxType;
  currency: Currency;
  amount: number;
  date: string;
  desc: string;
  status: TxStatus;
}

interface ActorLike {
  getWalletBalances: () => Promise<{ currency: string; amount: number }[]>;
  getWalletTransactions: () => Promise<
    {
      id: string;
      txType: string;
      currency: string;
      amount: number;
      date: string;
      desc: string;
      status: string;
    }[]
  >;
  updateWalletBalance: (
    currency: string,
    newAmount: number,
  ) => Promise<{ currency: string; amount: number }>;
  addWalletTransaction: (
    txType: string,
    currency: string,
    amount: number,
    date: string,
    desc: string,
    status: string,
  ) => Promise<{
    id: string;
    txType: string;
    currency: string;
    amount: number;
    date: string;
    desc: string;
    status: string;
  }>;
  getVirtualAccount: () => Promise<
    | {
        accountNumber: string;
        bankName: string;
        accountName: string;
        expiresAt: string;
        reference: string;
      }
    | undefined
  >;
  createVirtualAccount: (displayName: string) => Promise<{
    ok?: {
      accountNumber: string;
      bankName: string;
      accountName: string;
      expiresAt: string;
      reference: string;
    };
    err?: string;
  }>;
  refreshVirtualAccount: (displayName: string) => Promise<{
    ok?: {
      accountNumber: string;
      bankName: string;
      accountName: string;
      expiresAt: string;
      reference: string;
    };
    err?: string;
  }>;
  sendMoney: (
    recipientPrincipal: string,
    amount: number,
    currency: string,
    dateStr: string,
  ) => Promise<
    | {
        ok: {
          txId: string;
          reference: string;
          recipientId: string;
          amount: number;
          currency: string;
          timestamp: string;
        };
      }
    | { err: string }
  >;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENCIES: Currency[] = ["NGN", "USD", "EUR", "GBP", "CNY"];

const CURRENCY_SYMBOL: Record<Currency, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
};

const ZERO_BALANCES: Record<Currency, number> = {
  NGN: 0,
  USD: 0,
  EUR: 0,
  GBP: 0,
  CNY: 0,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBalance(currency: Currency, amount: number): string {
  const sym = CURRENCY_SYMBOL[currency];
  return `${sym}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTxAmount(tx: Transaction): string {
  const sym = CURRENCY_SYMBOL[tx.currency];
  const prefix = tx.type === "send" ? "-" : "+";
  return `${prefix}${sym}${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Wallet Card ────────────────────────────────────────────────────────────────

function WalletCard({
  currency,
  balance,
  hideBalance = false,
  loading = false,
  loadError = false,
  onRetry,
}: {
  currency: Currency;
  balance: number;
  hideBalance?: boolean;
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-gold-gradient shadow-gold select-none"
      style={{
        width: "100%",
        aspectRatio: "1.586 / 1",
        minHeight: "180px",
      }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.08) 10px, rgba(0,0,0,0.08) 11px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%, rgba(0,0,0,0.12) 100%)",
        }}
      />
      <div className="relative z-10 flex flex-col justify-between h-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 14 }}>🐴</span>
            </div>
            <span
              style={{
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.08em",
                color: "rgba(0,0,0,0.75)",
                textTransform: "uppercase",
              }}
            >
              Stancard
            </span>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,0.2)",
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(0,0,0,0.7)",
              letterSpacing: "0.1em",
            }}
          >
            {currency}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <svg
              role="img"
              aria-label="Card chip"
              width="32"
              height="26"
              viewBox="0 0 32 26"
              style={{ marginBottom: 10 }}
            >
              <rect
                x="0.5"
                y="0.5"
                width="31"
                height="25"
                rx="4"
                ry="4"
                fill="rgba(0,0,0,0.3)"
                stroke="rgba(0,0,0,0.4)"
              />
              <rect
                x="10"
                y="0.5"
                width="12"
                height="25"
                fill="rgba(0,0,0,0.15)"
              />
              <rect
                x="0.5"
                y="8"
                width="31"
                height="10"
                fill="rgba(0,0,0,0.15)"
              />
              <rect
                x="13"
                y="8"
                width="6"
                height="10"
                fill="rgba(0,0,0,0.25)"
                rx="1"
              />
            </svg>

            <div
              style={{
                fontSize: 10,
                color: "rgba(0,0,0,0.6)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Available Balance
            </div>

            {loading ? (
              <Skeleton
                style={{
                  width: 120,
                  height: 28,
                  borderRadius: 6,
                  background: "rgba(0,0,0,0.2)",
                }}
              />
            ) : loadError ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "rgba(0,0,0,0.6)",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.1,
                  }}
                >
                  {CURRENCY_SYMBOL[currency]}0.00
                </span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    title="Retry loading balance"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <RefreshCw size={13} color="rgba(0,0,0,0.65)" />
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "rgba(0,0,0,0.82)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                {hideBalance ? "••••••" : formatBalance(currency, balance)}
              </div>
            )}
          </div>

          {/* Issue 27: contactless icon removed — no real card network */}
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "rgba(0,0,0,0.6)",
            fontFamily: "inherit",
          }}
        >
          Stancard Pay · {CURRENCY_SYMBOL[currency]}
        </div>
      </div>
    </div>
  );
}

// ── Currency Tabs ──────────────────────────────────────────────────────────────

function CurrencyTabs({
  selected,
  onSelect,
}: {
  selected: Currency;
  onSelect: (c: Currency) => void;
}) {
  return (
    <div className="flex gap-1.5 mt-4 flex-wrap">
      {CURRENCIES.map((c) => (
        <button
          type="button"
          key={c}
          data-ocid="pay.currency.tab"
          onClick={() => onSelect(c)}
          style={{
            flex: "1 1 0",
            minWidth: 48,
            padding: "7px 0",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            border: selected === c ? "none" : "1px solid #2A2A2A",
            background:
              selected === c
                ? "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)"
                : "#0F0F0F",
            color: selected === c ? "rgba(0,0,0,0.8)" : "#7A7A7A",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

// ── Action Buttons ─────────────────────────────────────────────────────────────

function ActionButtons({
  onSend,
  onReceive,
  onFund,
  disabled = false,
}: {
  onSend: () => void;
  onReceive: () => void;
  onFund: () => void;
  disabled?: boolean;
}) {
  const btn = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    ocid: string,
    primary = false,
  ) => (
    <button
      type="button"
      data-ocid={ocid}
      onClick={disabled ? undefined : onClick}
      title={disabled ? "Sign in to access" : undefined}
      aria-disabled={disabled}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        flex: 1,
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        style={{
          width: primary ? 58 : 52,
          height: primary ? 58 : 52,
          borderRadius: "50%",
          background: primary
            ? "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)"
            : "#1A1A1A",
          border: primary ? "none" : "1px solid #2A2A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: primary
            ? "0 4px 20px rgba(212,175,55,0.35)"
            : "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: primary ? 12 : 11,
          fontWeight: primary ? 700 : 600,
          color: primary ? "#D4AF37" : "#9A9A9A",
          letterSpacing: "0.03em",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex justify-around mt-6 px-2">
      {btn(
        <Send size={20} color="#9A9A9A" />,
        "Send",
        onSend,
        "pay.send.button",
      )}
      {btn(
        <Download size={20} color="#9A9A9A" />,
        "Receive",
        onReceive,
        "pay.receive.button",
      )}
      {btn(
        <Wallet size={22} color="rgba(0,0,0,0.75)" />,
        "Fund Wallet",
        onFund,
        "pay.fund.button",
        true,
      )}
    </div>
  );
}

// ── Sign-in Prompt ─────────────────────────────────────────────────────────────

function SignInPrompt() {
  return (
    <div
      data-ocid="pay.signin.prompt"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        gap: 14,
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        borderRadius: 16,
        marginTop: 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Lock size={22} color="#D4AF37" />
      </div>
      <div>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#E8E8E8",
            marginBottom: 6,
          }}
        >
          Sign in to view your wallet
        </p>
        <p style={{ fontSize: 13, color: "#6C6C6C", lineHeight: 1.5 }}>
          Your balances and transactions are tied to your identity. Sign in on
          the Profile tab to access your wallet.
        </p>
      </div>
    </div>
  );
}

// ── Fund Wallet Modal ──────────────────────────────────────────────────────────

function FundWalletModal({
  open,
  onClose,
  defaultCurrency,
  onSuccess,
  displayName,
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
  onSuccess: (amount: number, currency: Currency) => Promise<void>;
  // ISSUE 9: use real display name in Flutterwave customer object
  displayName?: string;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [error, setError] = useState("");

  function handlePayNow() {
    const parsed = Number.parseFloat(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setError("");

    const fw = (window as any).FlutterwaveCheckout;
    if (!fw) {
      toast.error("Payment gateway not loaded. Please refresh.");
      return;
    }

    fw({
      public_key: "FLWPUBK-811e445867156c0d669a1d1c7876bcb7-X",
      tx_ref: `SC-${Date.now()}`,
      amount: parsed,
      currency: currency,
      customer: {
        // Use displayName-derived email — cleaner than a static placeholder
        email: displayName
          ? `${displayName.toLowerCase().replace(/\s+/g, ".")}@stancard.app`
          : "wallet@stancard.app",
        name: displayName || "Stancard User",
      },
      customizations: {
        title: "Stancard Wallet",
        description: "Fund your Stancard wallet",
        logo: "",
      },
      callback: (response: any) => {
        if (
          response.status === "successful" ||
          response.status === "completed"
        ) {
          void onSuccess(parsed, currency).then(() => {
            onClose();
            setAmount("");
          });
        }
      },
      onclose: () => {},
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="pay.fund.modal"
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
              background:
                "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Fund Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div>
            <Label
              style={{
                color: "#7A7A7A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              CURRENCY
            </Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
            >
              <SelectTrigger
                data-ocid="pay.fund.select"
                style={{
                  background: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                  color: "#E8E8E8",
                  borderRadius: 10,
                  marginTop: 6,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              >
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c} style={{ color: "#E8E8E8" }}>
                    {c} — {CURRENCY_SYMBOL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label
              style={{
                color: "#7A7A7A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              AMOUNT
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
                {CURRENCY_SYMBOL[currency]}
              </span>
              <Input
                data-ocid="pay.fund.input"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                style={{
                  background: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                  color: "#E8E8E8",
                  borderRadius: 10,
                  paddingLeft: 32,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              />
            </div>
            {error && (
              <p
                data-ocid="pay.fund.error_state"
                style={{ color: "#E05252", fontSize: 12, marginTop: 4 }}
              >
                {error}
              </p>
            )}
          </div>

          <Button
            data-ocid="pay.fund.submit_button"
            onClick={handlePayNow}
            className="w-full"
            style={{
              background:
                "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
              color: "rgba(0,0,0,0.85)",
              fontWeight: 700,
              fontSize: 15,
              borderRadius: 12,
              padding: "12px 0",
              height: "auto",
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
              border: "none",
            }}
          >
            Pay Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ── truncateId ─────────────────────────────────────────────────────

function truncateId(id: string): string {
  if (id.length <= 13) return id;
  return `${id.slice(0, 5)}...${id.slice(-5)}`;
}

// ── Principal ID validation ────────────────────────────────────────────────────

function isValidPrincipalId(id: string): boolean {
  return /^[a-z0-9]{5}(-[a-z0-9]{5}){0,9}(-[a-z0-9]{3})?$/i.test(id.trim());
}

// ── Send Modal ─────────────────────────────────────────────────────────────────

function SendModal({
  open,
  onClose,
  defaultCurrency,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
  onSuccess: (
    recipientPrincipalId: string,
    amount: number,
    currency: Currency,
  ) => Promise<{ reference: string; timestamp: string }>;
}) {
  const [view, setView] = useState<"form" | "success">("form");
  const [principalId, setPrincipalId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Success state
  const [successData, setSuccessData] = useState<{
    recipientId: string;
    amount: number;
    currency: Currency;
    timestamp: string;
    reference: string;
  } | null>(null);

  // Sync currency when defaultCurrency changes
  useEffect(() => {
    if (view === "form") setCurrency(defaultCurrency);
  }, [defaultCurrency, view]);

  function resetForm() {
    setPrincipalId("");
    setAmount("");
    setCurrency(defaultCurrency);
    setErrors({});
    setSubmitting(false);
    setView("form");
    setSuccessData(null);
  }

  function handleClose() {
    onClose();
    // Delay reset so animation completes
    setTimeout(resetForm, 300);
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const trimmed = principalId.trim();
    if (!trimmed) {
      e.principalId = "Recipient Stancard ID is required.";
    } else if (!isValidPrincipalId(trimmed)) {
      e.principalId = "Invalid Stancard ID format.";
    }
    const parsed = Number.parseFloat(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      e.amount = "Enter a valid amount.";
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const { reference, timestamp } = await onSuccess(
        principalId.trim(),
        Number.parseFloat(amount),
        currency,
      );
      // Issue 31: use canister timestamp instead of client clock
      setSuccessData({
        recipientId: principalId.trim(),
        amount: Number.parseFloat(amount),
        currency,
        timestamp,
        reference,
      });
      setView("success");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Transfer failed. Please try again.";
      setErrors({ principalId: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    background: "#1A1A1A",
    border: "1px solid #2A2A2A",
    color: "#E8E8E8",
    borderRadius: 10,
  };

  const goldGradient =
    "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)";

  return (
    <>
      {showQRScanner && (
        <QRScanner
          onScan={(result) => {
            const trimmed = result.trim();
            if (isValidPrincipalId(trimmed)) {
              setPrincipalId(trimmed);
              setErrors((p) => ({ ...p, principalId: "" }));
              setShowQRScanner(false);
              toast.success("Recipient ID filled from QR code");
            } else {
              toast.error(
                "Invalid QR code — does not contain a valid Stancard principal ID",
              );
              setShowQRScanner(false);
            }
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent
          data-ocid="pay.send.modal"
          style={{
            background: "#0F0F0F",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            maxWidth: 380,
          }}
        >
          {view === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle
                  style={{
                    background: goldGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Send Money
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-2">
                {/* Recipient Stancard ID */}
                <div>
                  <Label
                    style={{
                      color: "#7A7A7A",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                  >
                    RECIPIENT STANCARD ID
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      data-ocid="pay.send.recipient.input"
                      placeholder="e.g. abc12-xyz34-..."
                      value={principalId}
                      onChange={(e) => {
                        setPrincipalId(e.target.value);
                        setErrors((p) => ({ ...p, principalId: "" }));
                      }}
                      style={{ ...fieldStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      data-ocid="pay.send.scan_qr.button"
                      onClick={() => setShowQRScanner(true)}
                      aria-label="Scan QR code"
                      title="Scan QR code"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        background: "rgba(212,175,55,0.1)",
                        border: "1px solid rgba(212,175,55,0.35)",
                        borderRadius: 10,
                        padding: "0 12px",
                        cursor: "pointer",
                        color: "#D4AF37",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                        height: "100%",
                        minWidth: 72,
                        transition: "background 0.2s ease",
                      }}
                    >
                      <Camera size={15} />
                      <span>Scan</span>
                    </button>
                  </div>
                  {errors.principalId && (
                    <p
                      data-ocid="pay.send.error_state"
                      style={{ color: "#E05252", fontSize: 12, marginTop: 4 }}
                    >
                      {errors.principalId}
                    </p>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <Label
                    style={{
                      color: "#7A7A7A",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                  >
                    CURRENCY
                  </Label>
                  <Select
                    value={currency}
                    onValueChange={(v) => setCurrency(v as Currency)}
                  >
                    <SelectTrigger
                      data-ocid="pay.send.currency.select"
                      style={{ ...fieldStyle, marginTop: 6 }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      style={{
                        background: "#1A1A1A",
                        border: "1px solid #2A2A2A",
                      }}
                    >
                      {CURRENCIES.map((c) => (
                        <SelectItem
                          key={c}
                          value={c}
                          style={{ color: "#E8E8E8" }}
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div>
                  <Label
                    style={{
                      color: "#7A7A7A",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                  >
                    AMOUNT
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
                      {CURRENCY_SYMBOL[currency]}
                    </span>
                    <Input
                      data-ocid="pay.send.amount.input"
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setErrors((p) => ({ ...p, amount: "" }));
                      }}
                      style={{
                        ...fieldStyle,
                        paddingLeft: 32,
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  {errors.amount && (
                    <p style={{ color: "#E05252", fontSize: 12, marginTop: 4 }}>
                      {errors.amount}
                    </p>
                  )}
                </div>

                <Button
                  data-ocid="pay.send.submit_button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="w-full"
                  style={{
                    background: goldGradient,
                    color: "rgba(0,0,0,0.85)",
                    fontWeight: 700,
                    fontSize: 15,
                    borderRadius: 12,
                    padding: "12px 0",
                    height: "auto",
                    boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
                    border: "none",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Sending..." : "Send Money"}
                </Button>
              </div>
            </>
          ) : (
            /* ── Success Screen ── */
            <div className="flex flex-col items-center gap-5 py-4">
              {/* Gold checkmark circle */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: goldGradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 32px rgba(212,175,55,0.45)",
                }}
              >
                <span
                  style={{
                    color: "rgba(0,0,0,0.85)",
                    fontSize: 36,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  ✓
                </span>
              </div>

              <div className="text-center">
                <h2
                  style={{
                    background: goldGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    fontSize: 22,
                    fontWeight: 800,
                    margin: "0 0 4px",
                  }}
                >
                  Transfer Successful
                </h2>
                <p style={{ color: "#7A7A7A", fontSize: 13, margin: 0 }}>
                  Your funds have been sent
                </p>
              </div>

              {successData && (
                <div
                  className="w-full flex flex-col gap-3"
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid #2A2A2A",
                    borderRadius: 12,
                    padding: "16px",
                  }}
                >
                  <SuccessRow
                    label="Recipient"
                    value={truncateId(successData.recipientId)}
                  />
                  <SuccessRow
                    label="Amount"
                    value={`${CURRENCY_SYMBOL[successData.currency]}${successData.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    gold
                  />
                  <SuccessRow label="Timestamp" value={successData.timestamp} />
                  <SuccessRow
                    label="Reference"
                    value={successData.reference}
                    mono
                  />
                </div>
              )}

              <Button
                data-ocid="pay.send.success.close_button"
                onClick={handleClose}
                className="w-full"
                style={{
                  background: goldGradient,
                  color: "rgba(0,0,0,0.85)",
                  fontWeight: 700,
                  fontSize: 15,
                  borderRadius: 12,
                  padding: "12px 0",
                  height: "auto",
                  boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
                  border: "none",
                }}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── SuccessRow helper ──────────────────────────────────────────────────────────

function SuccessRow({
  label,
  value,
  gold = false,
  mono = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        style={{
          color: "#7A7A7A",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: gold ? "#D4AF37" : "#E8E8E8",
          fontSize: 13,
          fontWeight: gold ? 700 : 500,
          fontFamily: mono ? "monospace" : undefined,
          maxWidth: "60%",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Receive Modal ──────────────────────────────────────────────────────────────

// ── Virtual Account helpers ───────────────────────────────────────────────────

interface VirtualAccountData {
  accountNumber: string;
  bankName: string;
  accountName: string;
  expiresAt: string;
  reference: string;
}

function isAccountExpired(expiresAt: string): boolean {
  if (!expiresAt) return false;
  try {
    return new Date(expiresAt) < new Date();
  } catch {
    return false;
  }
}

function ReceiveModal({
  open,
  onClose,
  defaultCurrency,
  onSuccess,
  isLoggedIn,
  actor,
  displayName,
  principalId,
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
  onSuccess: (amount: number, currency: Currency) => Promise<void>;
  isLoggedIn: boolean;
  actor?: ActorLike | null;
  displayName?: string;
  principalId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // NGN virtual account state
  const [vaLoading, setVaLoading] = useState(false);
  const [vaError, setVaError] = useState("");
  const [virtualAccount, setVirtualAccount] =
    useState<VirtualAccountData | null>(null);
  const [vaExpired, setVaExpired] = useState(false);
  const [vaRetryCount, setVaRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  // Track the last currency for which we initiated a VA load, to avoid re-triggering
  const vaLoadedForCurrencyRef = useRef<string | null>(null);

  // Sync currency when defaultCurrency changes
  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

  // Reset VA state on close
  function handleClose() {
    setVaLoading(false);
    setVaError("");
    setVaExpired(false);
    setVaRetryCount(0);
    setVirtualAccount(null);
    vaLoadedForCurrencyRef.current = null;
    setAmount("");
    setError("");
    onClose();
  }

  // Load virtual account on open for NGN + logged in
  const loadVirtualAccount = useCallback(async () => {
    if (!actor || !isLoggedIn) return;
    setVaLoading(true);
    setVaError("");
    setVaExpired(false);
    // 8-second timeout on all VA canister calls
    const timeout = <T,>(p: Promise<T>): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("VA timeout")), 8000),
        ),
      ]);
    try {
      const existing = await timeout(actor.getVirtualAccount());
      if (existing) {
        if (isAccountExpired(existing.expiresAt)) {
          setVirtualAccount(existing);
          setVaExpired(true);
        } else {
          setVirtualAccount(existing);
        }
      } else {
        // No account yet — create one
        const result = await timeout(
          actor.createVirtualAccount(displayName || "Stancard User"),
        );
        if (result.ok) {
          setVirtualAccount(result.ok);
        } else {
          setVaError(result.err || "Unable to generate account number.");
        }
      }
    } catch {
      setVaError("Unable to generate account number. Please try again.");
    } finally {
      setVaLoading(false);
    }
  }, [actor, isLoggedIn, displayName]);

  // Trigger VA load when opening for NGN, or when switching back to NGN with an expired account.
  // Uses vaLoadedForCurrencyRef to prevent re-triggering on every render cycle.
  useEffect(() => {
    if (!open || currency !== "NGN" || !isLoggedIn) {
      // Reset the load-tracker when modal closes or currency switches away from NGN
      if (!open) vaLoadedForCurrencyRef.current = null;
      return;
    }

    // Check if the cached account is expired
    const expired = virtualAccount
      ? isAccountExpired(virtualAccount.expiresAt)
      : false;

    const needsLoad = !virtualAccount || expired;
    const alreadyLoading = vaLoading;
    const sessionKey = `${open}-${currency}`;
    const alreadyTriggered = vaLoadedForCurrencyRef.current === sessionKey;

    if (needsLoad && !alreadyLoading && !alreadyTriggered) {
      vaLoadedForCurrencyRef.current = sessionKey;
      if (expired) {
        setVirtualAccount(null);
        setVaExpired(false);
      }
      void loadVirtualAccount();
    }
  }, [
    open,
    currency,
    isLoggedIn,
    virtualAccount,
    vaLoading,
    loadVirtualAccount,
  ]);

  async function handleRefresh() {
    if (!actor) return;
    setVaLoading(true);
    setVaError("");
    setVaExpired(false);
    setVirtualAccount(null);
    vaLoadedForCurrencyRef.current = null;
    // 8-second timeout on refresh
    const timeout = <T,>(p: Promise<T>): Promise<T> =>
      Promise.race([
        p,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("VA timeout")), 8000),
        ),
      ]);
    try {
      const result = await timeout(
        actor.refreshVirtualAccount(displayName || "Stancard User"),
      );
      if (result.ok) {
        setVirtualAccount(result.ok);
      } else {
        setVaError(result.err || "Unable to refresh account number.");
      }
    } catch {
      setVaError("Unable to refresh account number. Please try again.");
    } finally {
      setVaLoading(false);
    }
  }

  function handleCopyVA() {
    if (!virtualAccount) return;
    navigator.clipboard.writeText(
      virtualAccount.accountNumber.replace(/\s/g, ""),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirm() {
    const parsed = Number.parseFloat(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSuccess(parsed, currency);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }

  // ── NGN virtual account UI section ───────────────────────────────────────

  function renderNGNSection() {
    // Not logged in
    if (!isLoggedIn) {
      return (
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 12,
            padding: "28px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={22} color="#D4AF37" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E8E8" }}>
            Sign in to receive payments
          </div>
          <div style={{ fontSize: 12, color: "#5A5A5A", maxWidth: 240 }}>
            Your NGN virtual account will be generated when you sign in.
          </div>
        </div>
      );
    }

    // Loading skeleton
    if (vaLoading) {
      return (
        <div
          data-ocid="pay.receive.loading_state"
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Skeleton
            className="h-3 w-24"
            style={{ background: "#2A2A2A", borderRadius: 4 }}
          />
          <Skeleton
            className="h-5 w-40"
            style={{ background: "#2A2A2A", borderRadius: 4 }}
          />
          <div style={{ height: 8 }} />
          <Skeleton
            className="h-3 w-28"
            style={{ background: "#2A2A2A", borderRadius: 4 }}
          />
          <div className="flex items-center gap-3">
            <Skeleton
              className="h-7 w-44"
              style={{ background: "#2A2A2A", borderRadius: 4 }}
            />
            <Skeleton
              className="h-7 w-16"
              style={{ background: "#2A2A2A", borderRadius: 6 }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#4A4A4A",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Generating your account...
          </div>
        </div>
      );
    }

    // Error state
    if (vaError && !vaLoading) {
      const isMaxRetries = vaRetryCount >= MAX_RETRIES;
      return (
        <div
          data-ocid="pay.receive.error_state"
          style={{
            background: "#1A1A1A",
            border: "1px solid rgba(224,82,82,0.3)",
            borderRadius: 12,
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(224,82,82,0.1)",
              border: "1px solid rgba(224,82,82,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 22 }}>⚠️</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E05252" }}>
            Unable to generate your NGN account
          </div>
          {vaError !==
            "Unable to generate account number. Please try again." && (
            <div
              style={{
                fontSize: 12,
                color: "#9A9A9A",
                fontStyle: "italic",
                maxWidth: 260,
              }}
            >
              {vaError}
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              color: "#9A9A9A",
              lineHeight: 1.6,
              maxWidth: 280,
            }}
          >
            This may be a temporary issue with our banking partner. Please try
            again in a moment.
          </div>
          {isMaxRetries ? (
            <div
              style={{
                background: "rgba(224,82,82,0.08)",
                border: "1px solid rgba(224,82,82,0.2)",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 13,
                color: "#E8E8E8",
                lineHeight: 1.6,
              }}
            >
              Maximum retries reached. Please contact support at{" "}
              <a
                href="mailto:stancardcreativeagency@gmail.com"
                style={{ color: "#D4AF37", fontWeight: 700 }}
              >
                stancardcreativeagency@gmail.com
              </a>
            </div>
          ) : (
            <>
              <button
                type="button"
                data-ocid="pay.receive.retry_button"
                onClick={() => {
                  setVaError("");
                  setVirtualAccount(null);
                  setVaRetryCount((c) => c + 1);
                  vaLoadedForCurrencyRef.current = null;
                  void loadVirtualAccount();
                }}
                style={{
                  background:
                    "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 24px",
                  color: "rgba(0,0,0,0.85)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "opacity 0.2s ease",
                  boxShadow: "0 4px 16px rgba(212,175,55,0.3)",
                }}
              >
                <RefreshCw size={15} />
                Try Again
              </button>
              <div style={{ fontSize: 11, color: "#5A5A5A" }}>
                Attempt {vaRetryCount + 1} of {MAX_RETRIES}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#4A4A4A",
                  lineHeight: 1.5,
                  maxWidth: 260,
                }}
              >
                If this persists after multiple retries, please contact support
                at{" "}
                <a
                  href="mailto:stancardcreativeagency@gmail.com"
                  style={{ color: "#D4AF37" }}
                >
                  stancardcreativeagency@gmail.com
                </a>
              </div>
            </>
          )}
        </div>
      );
    }

    // Expired state
    if (vaExpired && virtualAccount && !vaLoading) {
      return (
        <div
          data-ocid="pay.receive.expired_state"
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#7A7A7A",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Bank Name
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#4A4A4A",
              marginBottom: 12,
              textDecoration: "line-through",
            }}
          >
            {virtualAccount.bankName}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#7A7A7A",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Account Number
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#4A4A4A",
              letterSpacing: "0.08em",
              fontFamily: "monospace",
              textDecoration: "line-through",
              marginBottom: 16,
            }}
          >
            {virtualAccount.accountNumber}
          </div>
          <div
            style={{
              background: "rgba(212,175,55,0.06)",
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "rgba(212,175,55,0.8)",
                fontWeight: 600,
              }}
            >
              Account expired — tap to refresh
            </span>
            <button
              type="button"
              data-ocid="pay.receive.refresh_button"
              onClick={() => void handleRefresh()}
              style={{
                background: "rgba(212,175,55,0.12)",
                border: "1px solid rgba(212,175,55,0.35)",
                borderRadius: 8,
                padding: "6px 14px",
                color: "#D4AF37",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
                transition: "background 0.2s ease",
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>
      );
    }

    // Success state — real virtual account
    if (virtualAccount && !vaExpired && !vaLoading && !vaError) {
      return (
        <div
          data-ocid="pay.receive.success_state"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#7A7A7A",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Bank Name
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#E8E8E8",
                marginBottom: 14,
              }}
            >
              {virtualAccount.bankName}
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#7A7A7A",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Account Name
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#E8E8E8",
                marginBottom: 14,
              }}
            >
              {virtualAccount.accountName}
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#7A7A7A",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Account Number
            </div>
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#D4AF37",
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                {virtualAccount.accountNumber}
              </span>
              <button
                type="button"
                data-ocid="pay.receive.copy.button"
                onClick={handleCopyVA}
                style={{
                  background: copied ? "rgba(212,175,55,0.15)" : "#0F0F0F",
                  border: "1px solid #2A2A2A",
                  borderRadius: 8,
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  color: copied ? "#D4AF37" : "#7A7A7A",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* BVN upgrade note */}
          <div
            style={{
              fontSize: 12,
              color: "rgba(212,175,55,0.7)",
              background: "rgba(212,175,55,0.06)",
              border: "1px solid rgba(212,175,55,0.15)",
              borderRadius: 8,
              padding: "8px 12px",
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 1 }}>ℹ️</span>
            <span>
              Upgrade to a permanent account by verifying your BVN in Settings.
            </span>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="pay.receive.modal"
        style={{
          background: "#0F0F0F",
          border: "1px solid #2A2A2A",
          borderRadius: 16,
          maxWidth: 380,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              background:
                "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Receive Funds
          </DialogTitle>
        </DialogHeader>

        <div
          className="flex flex-col gap-4 mt-2"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          {currency === "NGN" ? (
            <>
              {renderNGNSection()}
              {/* QR code section below virtual account — always shown when logged in */}
              {isLoggedIn && principalId && (
                <QRReceiveSection principalId={principalId} />
              )}
            </>
          ) : /* Non-NGN: QR code as primary receive method */
          isLoggedIn && principalId ? (
            <QRReceiveSection principalId={principalId} />
          ) : !isLoggedIn ? (
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: 12,
                padding: "28px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={22} color="#D4AF37" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E8E8" }}>
                Sign in to receive payments
              </div>
              <div style={{ fontSize: 12, color: "#5A5A5A", maxWidth: 240 }}>
                Sign in to generate your QR code for receiving{" "}
                <span style={{ color: "#D4AF37", fontWeight: 700 }}>
                  {currency}
                </span>
                .
              </div>
            </div>
          ) : (
            /* Logged in but no principal yet — show note */
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: 12,
                padding: "24px 16px",
                textAlign: "center",
                color: "#7A7A7A",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Ask the sender to use your Stancard ID for a direct transfer.
            </div>
          )}

          {/* Currency selector — shown for all currencies */}
          <div>
            <Label
              style={{
                color: "#7A7A7A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              CURRENCY
            </Label>
            <Select
              value={currency}
              onValueChange={(v) => {
                setCurrency(v as Currency);
                // Reset VA state when switching to/from NGN
                setVaError("");
                setVaExpired(false);
                if (v !== "NGN") {
                  // keep virtualAccount cached for NGN
                }
              }}
            >
              <SelectTrigger
                style={{
                  background: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                  color: "#E8E8E8",
                  borderRadius: 10,
                  marginTop: 6,
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              >
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c} style={{ color: "#E8E8E8" }}>
                    {c} — {CURRENCY_SYMBOL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount field + Confirm Receipt — ISSUE 3: only shown for NGN when logged in */}
          {/* Non-NGN currencies show only a Close button (the coming-soon message is above) */}
          {currency === "NGN" && isLoggedIn && (
            <>
              <div>
                <Label
                  style={{
                    color: "#7A7A7A",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                  }}
                >
                  AMOUNT RECEIVED
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
                    {CURRENCY_SYMBOL[currency]}
                  </span>
                  <Input
                    data-ocid="pay.receive.amount.input"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError("");
                    }}
                    style={{
                      background: "#1A1A1A",
                      border: "1px solid #2A2A2A",
                      color: "#E8E8E8",
                      borderRadius: 10,
                      paddingLeft: 32,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  />
                </div>
                {error && (
                  <p
                    data-ocid="pay.receive.error_state"
                    style={{ color: "#E05252", fontSize: 12, marginTop: 4 }}
                  >
                    {error}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(212,175,55,0.08)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <CreditCard size={16} color="#D4AF37" />
                <span
                  style={{ fontSize: 13, color: "#D4AF37", fontWeight: 600 }}
                >
                  {currency} wallet
                </span>
              </div>

              <Button
                data-ocid="pay.receive.confirm_button"
                onClick={() => void handleConfirm()}
                disabled={submitting}
                className="w-full"
                style={{
                  background:
                    "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
                  color: "rgba(0,0,0,0.85)",
                  fontWeight: 700,
                  fontSize: 15,
                  borderRadius: 12,
                  padding: "12px 0",
                  height: "auto",
                  boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
                  border: "none",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Logging..." : "Confirm Receipt"}
              </Button>
            </>
          )}

          {/* ISSUE 3: Close button for non-NGN currencies only when not showing QR */}
          {currency !== "NGN" && !isLoggedIn && (
            <Button
              data-ocid="pay.receive.close_button"
              onClick={onClose}
              className="w-full"
              style={{
                background: "transparent",
                color: "#D4AF37",
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 12,
                padding: "12px 0",
                height: "auto",
                border: "1px solid rgba(212,175,55,0.4)",
              }}
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Transaction Row ────────────────────────────────────────────────────────────

function TxRow({ tx, index }: { tx: Transaction; index: number }) {
  const isCredit = tx.type !== "send";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      data-ocid={`pay.tx.item.${index + 1}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid #1A1A1A",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: isCredit
            ? "rgba(212,175,55,0.1)"
            : "rgba(255,255,255,0.05)",
          border: isCredit
            ? "1px solid rgba(212,175,55,0.2)"
            : "1px solid #2A2A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isCredit ? (
          <ArrowDownLeft size={18} color="#D4AF37" />
        ) : (
          <ArrowUpRight size={18} color="#7A7A7A" />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#E8E8E8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tx.desc}
        </div>
        <div style={{ fontSize: 12, color: "#6C6C6C", marginTop: 2 }}>
          {formatDate(tx.date)}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: isCredit ? "#D4AF37" : "#7A7A7A",
          }}
        >
          {formatTxAmount(tx)}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color:
              tx.status === "completed"
                ? "#4CAF7A"
                : tx.status === "pending"
                  ? "#D4AF37"
                  : "#E05252",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginTop: 2,
          }}
        >
          {tx.status}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function PayScreen({
  hideBalance = false,
  hideTransactions = false,
  identity,
  actor,
  isActive = false,
  displayName,
}: {
  hideBalance?: boolean;
  hideTransactions?: boolean;
  identity?: unknown;
  actor?: ActorLike | null;
  isActive?: boolean;
  displayName?: string;
}) {
  const isLoggedIn = !!identity;

  // Extract principal ID from identity for QR code generation
  const principalId = (() => {
    try {
      if (!identity) return undefined;
      const id = identity as { getPrincipal?: () => { toText?: () => string } };
      return id.getPrincipal?.()?.toText?.();
    } catch {
      return undefined;
    }
  })();

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("NGN");
  const [balances, setBalances] =
    useState<Record<Currency, number>>(ZERO_BALANCES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const fetchWalletData = useCallback(async () => {
    if (!actor || !isLoggedIn) return;
    setLoadingBalances(true);
    setBalanceError(false);
    try {
      // 8-second timeout on wallet data fetch
      const fetchPromise = Promise.all([
        actor.getWalletBalances(),
        actor.getWalletTransactions(),
      ]);
      const timeoutPromise = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 8000),
      );
      const [bals, txs] = await Promise.race([fetchPromise, timeoutPromise]);

      const newBalances = { ...ZERO_BALANCES };
      for (const b of bals) {
        if (b.currency in newBalances) {
          newBalances[b.currency as Currency] = b.amount;
        }
      }
      setBalances(newBalances);

      const mapped: Transaction[] = txs.map((t) => ({
        id: t.id,
        type: t.txType as TxType,
        currency: t.currency as Currency,
        amount: t.amount,
        date: t.date,
        desc: t.desc,
        status: t.status as TxStatus,
      }));
      setTransactions(mapped);
    } catch {
      setBalanceError(true);
    } finally {
      setLoadingBalances(false);
    }
  }, [actor, isLoggedIn]);

  // Re-fetch wallet data every time the Pay tab becomes active — no caching across visits.
  const prevIsActiveRef = useRef(false);
  useEffect(() => {
    const becameActive = isActive && !prevIsActiveRef.current;
    prevIsActiveRef.current = isActive;

    if (becameActive && isLoggedIn && actor) {
      void fetchWalletData();
    }
    // Clear stale data when logged out
    if (!isLoggedIn) {
      setBalances(ZERO_BALANCES);
      setTransactions([]);
      setBalanceError(false);
    }
  }, [isActive, isLoggedIn, actor, fetchWalletData]);

  const balance = balances[selectedCurrency];
  const filtered = transactions.filter(
    (tx) => tx.currency === selectedCurrency,
  );

  // ── Fund success ──
  async function handleFundSuccess(amount: number, currency: Currency) {
    if (!actor) return;
    const newBal = balances[currency] + amount;
    try {
      await actor.updateWalletBalance(currency, newBal);
      const newTx = await actor.addWalletTransaction(
        "fund",
        currency,
        amount,
        today(),
        "Wallet Top-up",
        "completed",
      );
      setBalances((prev) => ({ ...prev, [currency]: newBal }));
      setTransactions((prev) => [
        {
          id: newTx.id,
          type: "fund",
          currency: newTx.currency as Currency,
          amount: newTx.amount,
          date: newTx.date,
          desc: newTx.desc,
          status: newTx.status as TxStatus,
        },
        ...prev,
      ]);
      toast.success(
        `Wallet funded with ${CURRENCY_SYMBOL[currency]}${amount.toLocaleString()}`,
      );
    } catch {
      toast.error("Failed to update wallet. Please try again.");
    }
  }

  // ── Send success ──
  async function handleSendSuccess(
    recipientPrincipalId: string,
    amount: number,
    currency: Currency,
  ): Promise<{ reference: string; timestamp: string }> {
    if (!actor)
      return { reference: "", timestamp: new Date().toLocaleString() };
    const dateStr = today();
    const result = await actor.sendMoney(
      recipientPrincipalId,
      amount,
      currency,
      dateStr,
    );
    if ("err" in result) {
      throw new Error(result.err);
    }
    // Update local sender balance
    const newBal = balances[currency] - amount;
    setBalances((prev) => ({ ...prev, [currency]: newBal }));
    // Add sender tx to local state
    setTransactions((prev) => [
      {
        id: `${result.ok.txId}-s`,
        type: "send" as TxType,
        currency,
        amount,
        date: dateStr,
        desc: `Sent to ${truncateId(recipientPrincipalId)}`,
        status: "completed" as TxStatus,
      },
      ...prev,
    ]);
    // Issue 31: return canister timestamp alongside reference
    const canisterTimestamp = result.ok.timestamp
      ? new Date(result.ok.timestamp).toLocaleString()
      : new Date().toLocaleString();
    return { reference: result.ok.reference, timestamp: canisterTimestamp };
  }

  // ── Receive success ──
  async function handleReceiveSuccess(amount: number, currency: Currency) {
    if (!actor) return;
    const newBal = balances[currency] + amount;
    try {
      await actor.updateWalletBalance(currency, newBal);
      const newTx = await actor.addWalletTransaction(
        "receive",
        currency,
        amount,
        today(),
        "Received funds",
        "completed",
      );
      setBalances((prev) => ({ ...prev, [currency]: newBal }));
      setTransactions((prev) => [
        {
          id: newTx.id,
          type: "receive",
          currency: newTx.currency as Currency,
          amount: newTx.amount,
          date: newTx.date,
          desc: newTx.desc,
          status: newTx.status as TxStatus,
        },
        ...prev,
      ]);
      toast.success(
        `Logged ${CURRENCY_SYMBOL[currency]}${amount.toLocaleString()} receive entry`,
      );
    } catch {
      toast.error("Failed to record transaction. Please try again.");
    }
  }

  return (
    <div
      className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-visible lg:flex-none"
      style={{ background: "#0A0A0A" }}
    >
      <div className="flex flex-col px-4 pt-5 pb-8 lg:pt-6">
        {/* Page heading */}
        <div className="mb-5">
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              background:
                "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              margin: 0,
            }}
          >
            Stancard Pay
          </h1>
          <p style={{ fontSize: 13, color: "#6C6C6C", marginTop: 2 }}>
            Your multi-currency wallet
          </p>
        </div>

        {isLoggedIn ? (
          <>
            {/* Mobile: single column */}
            <div className="lg:hidden">
              <WalletCard
                currency={selectedCurrency}
                balance={balance}
                hideBalance={hideBalance}
                loading={loadingBalances}
                loadError={balanceError}
                onRetry={() => void fetchWalletData()}
              />
              <CurrencyTabs
                selected={selectedCurrency}
                onSelect={setSelectedCurrency}
              />
              <ActionButtons
                onSend={() => setSendOpen(true)}
                onReceive={() => setReceiveOpen(true)}
                onFund={() => setFundOpen(true)}
              />
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h2
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#E8E8E8",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Transaction History
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#D4AF37",
                      letterSpacing: "0.06em",
                      background: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      borderRadius: 20,
                      padding: "2px 10px",
                    }}
                  >
                    {selectedCurrency}
                  </span>
                </div>
                {hideTransactions ? (
                  <div
                    data-ocid="pay.tx.hidden_state"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "40px 0",
                      gap: 10,
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        stroke="#7A5A00"
                        strokeWidth="2"
                      />
                      <path
                        d="M7 11V7a5 5 0 0 1 10 0v4"
                        stroke="#7A5A00"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#7A5A00",
                        fontWeight: 600,
                      }}
                    >
                      Transaction history is hidden
                    </span>
                  </div>
                ) : loadingBalances ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      paddingTop: 8,
                    }}
                  >
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        style={{
                          height: 52,
                          borderRadius: 10,
                          background: "#1A1A1A",
                        }}
                      />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div
                    data-ocid="pay.tx.empty_state"
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#4A4A4A",
                      fontSize: 14,
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
                    No transactions for {selectedCurrency} yet
                  </div>
                ) : (
                  <div data-ocid="pay.tx.list">
                    <AnimatePresence initial={false}>
                      {filtered.map((tx, i) => (
                        <TxRow key={tx.id} tx={tx} index={i} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop: two-column layout */}
            <div className="hidden lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:items-start">
              {/* Left: wallet card + currency tabs + action buttons */}
              <div>
                <WalletCard
                  currency={selectedCurrency}
                  balance={balance}
                  hideBalance={hideBalance}
                  loading={loadingBalances}
                  loadError={balanceError}
                  onRetry={() => void fetchWalletData()}
                />
                <CurrencyTabs
                  selected={selectedCurrency}
                  onSelect={setSelectedCurrency}
                />
                <ActionButtons
                  onSend={() => setSendOpen(true)}
                  onReceive={() => setReceiveOpen(true)}
                  onFund={() => setFundOpen(true)}
                />
              </div>

              {/* Right: transaction history */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#E8E8E8",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Transaction History
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#D4AF37",
                      letterSpacing: "0.06em",
                      background: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      borderRadius: 20,
                      padding: "2px 10px",
                    }}
                  >
                    {selectedCurrency}
                  </span>
                </div>
                {hideTransactions ? (
                  <div
                    data-ocid="pay.tx.hidden_state"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "40px 0",
                      gap: 10,
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        stroke="#7A5A00"
                        strokeWidth="2"
                      />
                      <path
                        d="M7 11V7a5 5 0 0 1 10 0v4"
                        stroke="#7A5A00"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#7A5A00",
                        fontWeight: 600,
                      }}
                    >
                      Transaction history is hidden
                    </span>
                  </div>
                ) : loadingBalances ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      paddingTop: 8,
                    }}
                  >
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        style={{
                          height: 52,
                          borderRadius: 10,
                          background: "#1A1A1A",
                        }}
                      />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div
                    data-ocid="pay.tx.empty_state"
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#4A4A4A",
                      fontSize: 14,
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
                    No transactions for {selectedCurrency} yet
                  </div>
                ) : (
                  <div data-ocid="pay.tx.list">
                    <AnimatePresence initial={false}>
                      {filtered.map((tx, i) => (
                        <TxRow key={tx.id} tx={tx} index={i} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Logged-out: show disabled wallet card shell + sign-in prompt */}
            <div style={{ opacity: 0.4, pointerEvents: "none" }}>
              <WalletCard currency={selectedCurrency} balance={0} hideBalance />
              <CurrencyTabs
                selected={selectedCurrency}
                onSelect={setSelectedCurrency}
              />
            </div>
            <ActionButtons
              onSend={() => {}}
              onReceive={() => {}}
              onFund={() => {}}
              disabled
            />
            <SignInPrompt />
          </>
        )}
      </div>

      {/* Modals */}
      <FundWalletModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        defaultCurrency={selectedCurrency}
        onSuccess={handleFundSuccess}
        displayName={displayName}
      />
      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        defaultCurrency={selectedCurrency}
        onSuccess={handleSendSuccess}
      />
      <ReceiveModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        defaultCurrency={selectedCurrency}
        onSuccess={handleReceiveSuccess}
        isLoggedIn={isLoggedIn}
        actor={actor}
        displayName={displayName}
        principalId={principalId}
      />
    </div>
  );
}
