import { Switch } from "@/components/ui/switch";
import { ChevronRight, Loader2, User } from "lucide-react";
import { useRef, useState } from "react";
import { AboutScreen } from "./AboutScreen";

interface ProfileScreenProps {
  hideBalance: boolean;
  setHideBalance: (v: boolean) => void;
  hideTransactions: boolean;
  setHideTransactions: (v: boolean) => void;
  preferredCurrency: string;
  setPreferredCurrency: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  // Auth props
  identity?: unknown; // truthy = logged in
  login: () => void;
  isLoggingIn: boolean;
  isInitializing: boolean;
  displayName: string;
  onSaveDisplayName: (name: string) => Promise<void>;
  onLogout: () => void;
}

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "CNY"];
const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "chinese", label: "Chinese" },
  { value: "french", label: "French" },
];

/** Compute initials from a display name */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#D4AF37",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function PillRow({
  options,
  selected,
  onSelect,
  ocidPrefix,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  ocidPrefix: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <button
            type="button"
            key={opt.value}
            data-ocid={`${ocidPrefix}.toggle`}
            onClick={() => onSelect(opt.value)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.03em",
              border: isSelected ? "none" : "1px solid #2A2A2A",
              background: isSelected
                ? "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)"
                : "#0F0F0F",
              color: isSelected ? "rgba(0,0,0,0.85)" : "#7A7A7A",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileScreen({
  hideBalance,
  setHideBalance,
  hideTransactions,
  setHideTransactions,
  preferredCurrency,
  setPreferredCurrency,
  language,
  setLanguage,
  identity,
  login,
  isLoggingIn,
  isInitializing,
  displayName,
  onSaveDisplayName,
  onLogout,
}: ProfileScreenProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoggedIn = !!identity;
  const initials = getInitials(displayName);

  async function handleSaveName() {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      await onSaveDisplayName(nameInput);
      setSaveStatus("saved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2200);
    } catch {
      setSaveStatus("idle");
    }
  }

  if (showAbout) {
    return <AboutScreen onBack={() => setShowAbout(false)} />;
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto lg:overflow-visible"
      style={{ background: "#0A0A0A" }}
      data-ocid="profile.page"
    >
      <div
        className="lg:max-w-[640px] lg:mx-auto lg:w-full"
        style={{ padding: "24px 16px 60px" }}
      >
        {/* ── User identity section ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
            paddingTop: 8,
          }}
        >
          {/* Avatar */}
          {isLoggedIn ? (
            /* Logged-in avatar: gold gradient with initials */
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                boxShadow:
                  "0 0 28px rgba(212,175,55,0.35), 0 4px 16px rgba(0,0,0,0.5)",
                flexShrink: 0,
              }}
              data-ocid="profile.avatar"
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "rgba(0,0,0,0.85)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                {initials || <User size={28} color="rgba(0,0,0,0.75)" />}
              </span>
            </div>
          ) : (
            /* Logged-out avatar: grey user icon */
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#0F0F0F",
                border: "2px solid #D4AF37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                boxShadow: "0 0 20px rgba(212,175,55,0.15)",
                flexShrink: 0,
              }}
              data-ocid="profile.avatar"
            >
              <User size={28} color="#6A6A6A" />
            </div>
          )}

          {/* Logged-in: display name + name input row */}
          {isLoggedIn ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                gap: 10,
              }}
            >
              {/* Display name text */}
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: displayName ? "#E8E8E8" : "rgba(212,175,55,0.6)",
                  letterSpacing: "0.02em",
                  marginBottom: 2,
                }}
              >
                {displayName || "Set your name"}
              </p>

              {/* Name input + Save button */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 8,
                  width: "100%",
                  maxWidth: 320,
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleSaveName()}
                  placeholder="Your display name"
                  data-ocid="profile.display_name.input"
                  maxLength={40}
                  style={{
                    flex: 1,
                    background: "#0F0F0F",
                    border: "1px solid #D4AF37",
                    borderRadius: 10,
                    color: "#E8E8E8",
                    padding: "8px 12px",
                    fontSize: 14,
                    outline: "none",
                    minWidth: 0,
                  }}
                />
                <button
                  type="button"
                  data-ocid="profile.save_name.button"
                  onClick={() => void handleSaveName()}
                  disabled={saveStatus === "saving"}
                  style={{
                    background:
                      "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(0,0,0,0.85)",
                    cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    opacity: saveStatus === "saving" ? 0.7 : 1,
                    transition: "opacity 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  {saveStatus === "saving" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : saveStatus === "saved" ? (
                    "Saved ✓"
                  ) : (
                    "Save"
                  )}
                </button>
              </div>

              {/* Sign Out button */}
              <button
                type="button"
                data-ocid="profile.sign_out.button"
                onClick={onLogout}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#888",
                  fontSize: 13,
                  padding: "4px 8px",
                  marginTop: 4,
                  borderRadius: 6,
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#E05252";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#888";
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            /* Logged-out: Sign In button */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              {isInitializing ? (
                /* Brief initializing state: show subtle loader */
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#5A5A5A",
                    fontSize: 12,
                  }}
                  data-ocid="profile.loading_state"
                >
                  <Loader2 size={13} className="animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <button
                  type="button"
                  data-ocid="profile.sign_in.button"
                  onClick={login}
                  disabled={isLoggingIn}
                  style={{
                    background: "none",
                    border: "1px solid #D4AF37",
                    borderRadius: 20,
                    padding: "8px 28px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#D4AF37",
                    cursor: isLoggingIn ? "not-allowed" : "pointer",
                    letterSpacing: "0.06em",
                    opacity: isLoggingIn ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {isLoggingIn && (
                    <Loader2 size={13} className="animate-spin" />
                  )}
                  {isLoggingIn ? "Signing in..." : "Sign In"}
                </button>
              )}
              {!isInitializing && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#5A5A5A",
                    letterSpacing: "0.02em",
                    textAlign: "center",
                  }}
                >
                  Sign in to sync your preferences across devices
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Preferences card ── */}
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: "18px 16px",
            marginBottom: 14,
          }}
          data-ocid="profile.preferences.card"
        >
          {/* Currency */}
          <SectionLabel>Preferred Currency</SectionLabel>
          <div style={{ marginBottom: 20 }}>
            <PillRow
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              selected={preferredCurrency}
              onSelect={setPreferredCurrency}
              ocidPrefix="profile.currency"
            />
          </div>

          {/* Divider */}
          <div
            style={{
              width: "100%",
              height: 1,
              background: "#252525",
              marginBottom: 18,
            }}
          />

          {/* Language */}
          <SectionLabel>Language</SectionLabel>
          <PillRow
            options={LANGUAGES}
            selected={language}
            onSelect={setLanguage}
            ocidPrefix="profile.language"
          />
          <p
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "#6C6C6C",
              letterSpacing: "0.02em",
            }}
          >
            Preferences saved — full translation coming soon.
          </p>
        </div>

        {/* ── Privacy card ── */}
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: "18px 16px",
            marginBottom: 14,
          }}
          data-ocid="profile.privacy.card"
        >
          <SectionLabel>Privacy</SectionLabel>

          {/* Hide Balance row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div style={{ flex: 1, marginRight: 16 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#E8E8E8",
                  marginBottom: 3,
                }}
              >
                Hide Balance
              </p>
              <p style={{ fontSize: 11, color: "#6A6A6A", lineHeight: 1.4 }}>
                Hides your balance across all screens
              </p>
            </div>
            <Switch
              data-ocid="profile.hide_balance.switch"
              checked={hideBalance}
              onCheckedChange={setHideBalance}
              aria-label="Hide balance"
              style={{
                flexShrink: 0,
              }}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              width: "100%",
              height: 1,
              background: "#252525",
              marginBottom: 18,
            }}
          />

          {/* Hide Transactions row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1, marginRight: 16 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#E8E8E8",
                  marginBottom: 3,
                }}
              >
                Hide Transaction History
              </p>
              <p style={{ fontSize: 11, color: "#6A6A6A", lineHeight: 1.4 }}>
                Hides transaction list on Pay tab
              </p>
            </div>
            <Switch
              data-ocid="profile.hide_transactions.switch"
              checked={hideTransactions}
              onCheckedChange={setHideTransactions}
              aria-label="Hide transaction history"
              style={{
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* ── About Stancard row ── */}
        <button
          type="button"
          data-ocid="profile.about.button"
          onClick={() => setShowAbout(true)}
          style={{
            width: "100%",
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 16,
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#E8E8E8",
            }}
          >
            About Stancard
          </span>
          <ChevronRight size={18} color="#D4AF37" />
        </button>
      </div>
    </div>
  );
}
