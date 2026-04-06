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
  Check,
  Clock,
  Copy,
  CreditCard,
  Download,
  Lock,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

          <div style={{ opacity: 0.4 }}>
            <svg
              role="img"
              aria-label="Contactless payment"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 2C10.5 5.5 10.5 18.5 12 22"
                stroke="rgba(0,0,0,0.8)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M8.5 5C5.5 8 5.5 16 8.5 19"
                stroke="rgba(0,0,0,0.8)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M15.5 5C18.5 8 18.5 16 15.5 19"
                stroke="rgba(0,0,0,0.8)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
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
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
  onSuccess: (amount: number, currency: Currency) => Promise<void>;
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
        email: "user@stancard.space",
        name: "Stancard User",
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
  ) => Promise<string>;
}) {
  const [view, setView] = useState<"form" | "success">("form");
  const [principalId, setPrincipalId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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
      const reference = await onSuccess(
        principalId.trim(),
        Number.parseFloat(amount),
        currency,
      );
      setSuccessData({
        recipientId: principalId.trim(),
        amount: Number.parseFloat(amount),
        currency,
        timestamp: new Date().toLocaleString(),
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
                <Input
                  data-ocid="pay.send.recipient.input"
                  placeholder="e.g. abc12-xyz34-..."
                  value={principalId}
                  onChange={(e) => {
                    setPrincipalId(e.target.value);
                    setErrors((p) => ({ ...p, principalId: "" }));
                  }}
                  style={{ ...fieldStyle, marginTop: 6 }}
                />
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
}: {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
  onSuccess: (amount: number, currency: Currency) => Promise<void>;
  isLoggedIn: boolean;
  actor?: ActorLike | null;
  displayName?: string;
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

  // Sync currency when defaultCurrency changes
  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

  // Reset VA state on close
  function handleClose() {
    setVaLoading(false);
    setVaError("");
    setVaExpired(false);
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
    try {
      const existing = await actor.getVirtualAccount();
      if (existing) {
        if (isAccountExpired(existing.expiresAt)) {
          setVirtualAccount(existing);
          setVaExpired(true);
        } else {
          setVirtualAccount(existing);
        }
      } else {
        // No account yet — create one
        const result = await actor.createVirtualAccount(
          displayName || "Stancard User",
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

  useEffect(() => {
    if (open && currency === "NGN" && isLoggedIn && !virtualAccount) {
      void loadVirtualAccount();
    }
  }, [open, currency, isLoggedIn, virtualAccount, loadVirtualAccount]);

  async function handleRefresh() {
    if (!actor) return;
    setVaLoading(true);
    setVaError("");
    setVaExpired(false);
    setVirtualAccount(null);
    try {
      const result = await actor.refreshVirtualAccount(
        displayName || "Stancard User",
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
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(224,82,82,0.1)",
              border: "1px solid rgba(224,82,82,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 20 }}>⚠️</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#E05252" }}>
            Unable to generate account number.
          </div>
          <div style={{ fontSize: 12, color: "#7A7A7A" }}>
            Please try again.
          </div>
          <button
            type="button"
            data-ocid="pay.receive.retry_button"
            onClick={() => {
              setVaError("");
              void loadVirtualAccount();
            }}
            style={{
              background: "transparent",
              border: "1px solid #D4AF37",
              borderRadius: 8,
              padding: "8px 20px",
              color: "#D4AF37",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.2s ease",
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
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

        <div className="flex flex-col gap-4 mt-2">
          {currency === "NGN" ? (
            renderNGNSection()
          ) : (
            /* Non-NGN: international virtual accounts coming soon */
            <div
              style={{
                background: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: 12,
                padding: "28px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* Icon */}
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
                  flexShrink: 0,
                }}
              >
                <Clock size={28} color="#D4AF37" />
              </div>

              {/* Heading */}
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#E8E8E8",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                International virtual accounts coming soon.
              </div>

              {/* Body */}
              <div
                style={{
                  fontSize: 13,
                  color: "#7A7A7A",
                  textAlign: "center",
                  maxWidth: 280,
                  lineHeight: 1.6,
                }}
              >
                Currently you can receive{" "}
                <span style={{ color: "#D4AF37", fontWeight: 700 }}>
                  {currency}
                </span>{" "}
                by requesting a direct transfer from another Stancard user.
              </div>
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

          {/* Amount field — shown for all currencies; hidden when NGN+not logged in */}
          {!(currency === "NGN" && !isLoggedIn) && (
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

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("NGN");
  const [balances, setBalances] =
    useState<Record<Currency, number>>(ZERO_BALANCES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const hasFetchedRef = useRef(false);

  const fetchWalletData = useCallback(async () => {
    if (!actor || !isLoggedIn) return;
    setLoadingBalances(true);
    setBalanceError(false);
    try {
      const [bals, txs] = await Promise.all([
        actor.getWalletBalances(),
        actor.getWalletTransactions(),
      ]);

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

  // Fetch when tab becomes active and user is logged in
  useEffect(() => {
    if (isActive && isLoggedIn && actor && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchWalletData();
    }
    // Reset fetch flag when logged out so next login triggers a fresh fetch
    if (!isLoggedIn) {
      hasFetchedRef.current = false;
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
  ): Promise<string> {
    if (!actor) return "";
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
    return result.ok.reference;
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
      className="flex flex-col overflow-y-auto h-full lg:overflow-visible"
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
      />
    </div>
  );
}
