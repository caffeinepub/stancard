import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AddToHomeScreen } from "./components/AddToHomeScreen";
import type { Alert } from "./components/AlertsScreen";
import { AlertsScreen } from "./components/AlertsScreen";
import { AppHeader } from "./components/AppHeader";
import { BottomNav, type TabId } from "./components/BottomNav";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { HomeScreen } from "./components/HomeScreen";
import { MarketsScreen } from "./components/MarketsScreen";
import { MoveScreen } from "./components/MoveScreen";
import { PayScreen } from "./components/PayScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { TrackingPage } from "./components/TrackingPage";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UserProfile {
  displayName: string;
  preferredCurrency: string;
  language: string;
  hideBalance: boolean;
  hideTransactions: boolean;
  avatarUrl?: string;
}

interface ExtendedActor {
  getUserProfile: () => Promise<UserProfile | undefined>;
  saveUserProfile: (
    displayName: string,
    preferredCurrency: string,
    language: string,
    hideBalance: boolean,
    hideTransactions: boolean,
    avatarUrl?: string,
  ) => Promise<UserProfile>;
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
  registerRoute: (
    vehicleType: string,
    departureCity: string,
    departureCountry: string,
    destinationCity: string,
    destinationCountry: string,
    travelDate: string,
    cargoSpace: string,
  ) => Promise<{ ok: string } | { err: string }>;
  updateRoute: (
    routeId: string,
    vehicleType: string,
    departureCity: string,
    departureCountry: string,
    destinationCity: string,
    destinationCountry: string,
    travelDate: string,
    cargoSpace: string,
  ) => Promise<{ ok: string } | { err: string }>;
  deleteRoute: (routeId: string) => Promise<{ ok: string } | { err: string }>;
  getRiderRoutes: () => Promise<unknown[]>;
  getAllRoutes: () => Promise<unknown[]>;
  postPackage: (
    pickupLocation: string,
    destinationCity: string,
    destinationCountry: string,
    size: string,
    weightKg: number,
    description: string,
  ) => Promise<{ ok: string } | { err: string }>;
  getSenderPackages: () => Promise<unknown[]>;
  getMatchedRiders: (
    destinationCity: string,
    destinationCountry: string,
  ) => Promise<unknown[]>;
  sendDeliveryRequest: (
    packageId: string,
    routeId: string,
    riderPrincipalText: string,
  ) => Promise<{ ok: string } | { err: string }>;
  getIncomingRequests: () => Promise<unknown[]>;
  respondToRequest: (
    requestId: string,
    accept: boolean,
  ) => Promise<{ ok: string } | { err: string }>;
  getSenderRequests: () => Promise<unknown[]>;
  getAcceptedDeliveries: () => Promise<unknown[]>;
  getTrackingByCode: (code: string) => Promise<unknown>;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

// Static browser detection — evaluated once at module level, never changes
const isIOS =
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as Window & { MSStream?: unknown }).MSStream;

// Extract tracking code from URL on initial load
function getInitialTrackingCode(): string | null {
  const search = window.location.search;
  const hash = window.location.hash;
  const pathname = window.location.pathname;

  // Check ?code= in query string
  const params = new URLSearchParams(search);
  if (params.get("code")) return params.get("code");

  // Check #/track?code= in hash
  if (hash.includes("/track")) {
    const hashParams = new URLSearchParams(hash.split("?")[1] || "");
    if (hashParams.get("code")) return hashParams.get("code");
  }

  // Check /track in pathname
  if (pathname === "/track" || pathname.startsWith("/track?")) {
    const pathParams = new URLSearchParams(pathname.split("?")[1] || search);
    if (pathParams.get("code")) return pathParams.get("code");
    return ""; // show tracking page with empty input
  }

  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [alertBadge, setAlertBadge] = useState(false);
  const [activeBanner, setActiveBanner] = useState<Alert | null>(null);

  // ── Tracking page state ──
  // null = not showing, string (empty or code) = showing tracking page
  const [trackingCode, setTrackingCode] = useState<string | null>(() =>
    getInitialTrackingCode(),
  );

  // ── Add to Home Screen state ──
  const [showA2HS, setShowA2HS] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // ── Internet Identity (global context — shared across all tabs) ──
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { actor: rawActor } = useActor();
  const actor = rawActor as (typeof rawActor & ExtendedActor) | null;

  // ── Global preference state (persisted to localStorage) ──
  const [hideBalance, setHideBalanceState] = useState<boolean>(() =>
    loadFromStorage("stancard_hide_balance", false),
  );
  const [hideTransactions, setHideTransactionsState] = useState<boolean>(() =>
    loadFromStorage("stancard_hide_transactions", false),
  );
  const [preferredCurrency, setPreferredCurrencyState] = useState<string>(() =>
    loadFromStorage("stancard_preferred_currency", "NGN"),
  );
  const [language, setLanguageState] = useState<string>(() =>
    loadFromStorage("stancard_language", "english"),
  );
  const [displayName, setDisplayNameState] = useState<string>(
    () => localStorage.getItem("stancard_display_name") || "",
  );
  const [avatarUrl, setAvatarUrlState] = useState<string>(
    () => localStorage.getItem("stancard_avatar_url") || "",
  );

  const prevIdentityRef = useRef<typeof identity>(identity);
  const prefsRef = useRef({
    displayName,
    preferredCurrency,
    language,
    hideBalance,
    hideTransactions,
    avatarUrl,
  });
  prefsRef.current = {
    displayName,
    preferredCurrency,
    language,
    hideBalance,
    hideTransactions,
    avatarUrl,
  };

  // Issue 28: guard to prevent preference sync double-firing within the same login session
  const syncDoneRef = useRef(false);

  function setHideBalance(v: boolean) {
    setHideBalanceState(v);
    localStorage.setItem("stancard_hide_balance", JSON.stringify(v));
  }
  function setHideTransactions(v: boolean) {
    setHideTransactionsState(v);
    localStorage.setItem("stancard_hide_transactions", JSON.stringify(v));
  }
  function setPreferredCurrency(v: string) {
    setPreferredCurrencyState(v);
    localStorage.setItem("stancard_preferred_currency", JSON.stringify(v));
  }
  function setLanguage(v: string) {
    setLanguageState(v);
    localStorage.setItem("stancard_language", JSON.stringify(v));
  }

  // ── Add to Home Screen effect ──
  useEffect(() => {
    if (localStorage.getItem("stancard_a2hs_dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      if (isIOS) {
        const isStandalone =
          (window.navigator as Navigator & { standalone?: boolean })
            .standalone === true;
        if (!isStandalone) setShowA2HS(true);
      } else {
        if (deferredPromptRef.current) setShowA2HS(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  async function handleA2HSInstall() {
    if (!deferredPromptRef.current) return;
    await deferredPromptRef.current.prompt();
    deferredPromptRef.current = null;
    setShowA2HS(false);
    localStorage.setItem("stancard_a2hs_dismissed", "1");
  }

  function handleA2HSDismiss() {
    setShowA2HS(false);
    localStorage.setItem("stancard_a2hs_dismissed", "1");
  }

  // ── Preference sync on login ──
  // Issue 28: removed `actor` from deps; sync only fires on identity change (login/logout),
  // not on every actor re-instantiation. syncDoneRef prevents double execution.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — actor accessed via closure, not dep
  useEffect(() => {
    const wasLoggedOut = !prevIdentityRef.current;
    const isNowLoggedIn = !!identity;
    prevIdentityRef.current = identity;

    // On logout, reset syncDoneRef so next login syncs again
    if (!isNowLoggedIn) {
      syncDoneRef.current = false;
      return;
    }

    if (!wasLoggedOut || !isNowLoggedIn || !actor) return;
    // Guard: only sync once per login session
    if (syncDoneRef.current) return;
    syncDoneRef.current = true;

    const prefs = prefsRef.current;
    void (async () => {
      try {
        const profile = await actor.getUserProfile();
        if (profile) {
          setHideBalanceState(profile.hideBalance);
          setHideTransactionsState(profile.hideTransactions);
          setPreferredCurrencyState(profile.preferredCurrency);
          setLanguageState(profile.language);
          setDisplayNameState(profile.displayName);
          if (profile.avatarUrl) {
            setAvatarUrlState(profile.avatarUrl);
            localStorage.setItem("stancard_avatar_url", profile.avatarUrl);
          }
          localStorage.setItem(
            "stancard_hide_balance",
            JSON.stringify(profile.hideBalance),
          );
          localStorage.setItem(
            "stancard_hide_transactions",
            JSON.stringify(profile.hideTransactions),
          );
          localStorage.setItem(
            "stancard_preferred_currency",
            JSON.stringify(profile.preferredCurrency),
          );
          localStorage.setItem(
            "stancard_language",
            JSON.stringify(profile.language),
          );
          localStorage.setItem("stancard_display_name", profile.displayName);
        } else {
          await actor.saveUserProfile(
            prefs.displayName,
            prefs.preferredCurrency,
            prefs.language,
            prefs.hideBalance,
            prefs.hideTransactions,
            prefs.avatarUrl,
          );
        }
      } catch (err) {
        console.error("Profile sync failed:", err);
      }
    })();
  }, [identity]);

  async function onSaveDisplayName(name: string) {
    setDisplayNameState(name);
    localStorage.setItem("stancard_display_name", name);
    if (actor) {
      const prefs = prefsRef.current;
      try {
        await actor.saveUserProfile(
          name,
          prefs.preferredCurrency,
          prefs.language,
          prefs.hideBalance,
          prefs.hideTransactions,
          prefs.avatarUrl,
        );
      } catch (err) {
        console.error("Failed to save profile:", err);
      }
    }
  }

  async function onSaveAvatarUrl(url: string) {
    setAvatarUrlState(url);
    localStorage.setItem("stancard_avatar_url", url);
    if (actor) {
      const prefs = prefsRef.current;
      try {
        await actor.saveUserProfile(
          prefs.displayName,
          prefs.preferredCurrency,
          prefs.language,
          prefs.hideBalance,
          prefs.hideTransactions,
          url,
        );
      } catch (err) {
        console.error("Failed to save avatar:", err);
      }
    }
  }

  function handleLogout() {
    clear();
  }

  useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => setActiveBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [activeBanner]);

  function handleAlertTriggered(alert: Alert) {
    setActiveBanner(alert);
    setAlertBadge(true);
  }

  function handleTrackShipment(code: string) {
    setTrackingCode(code);
  }

  function handleExitTracking() {
    setTrackingCode(null);
    // Clean up URL params if they were set
    if (window.location.search.includes("code=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
    }
  }

  // Issue 18: screenContent rendered ONCE. CSS handles mobile vs desktop layout.
  // Both layout containers share this single instance — no duplicate effects.
  const screenContent = (
    <>
      {activeTab === "home" && (
        <HomeScreen
          hideBalance={hideBalance}
          isLoggedIn={!!identity}
          displayName={displayName}
          actor={actor}
          identity={identity}
        />
      )}
      {activeTab === "markets" && (
        <MarketsScreen
          isActive={activeTab === "markets"}
          onSetAlert={() => setActiveTab("alerts")}
        />
      )}
      {activeTab === "pay" && (
        <PayScreen
          hideBalance={hideBalance}
          hideTransactions={hideTransactions}
          identity={identity}
          actor={actor}
          isActive={activeTab === "pay"}
          displayName={displayName}
        />
      )}
      {activeTab === "alerts" && (
        <AlertsScreen
          isActive={activeTab === "alerts"}
          onAlertTriggered={handleAlertTriggered}
          identity={identity}
        />
      )}
      {activeTab === "move" && (
        <MoveScreen
          identity={identity}
          actor={actor as any}
          onTrackShipment={handleTrackShipment}
          displayName={displayName}
        />
      )}
      {activeTab === "profile" && (
        <ProfileScreen
          hideBalance={hideBalance}
          setHideBalance={setHideBalance}
          hideTransactions={hideTransactions}
          setHideTransactions={setHideTransactions}
          preferredCurrency={preferredCurrency}
          setPreferredCurrency={setPreferredCurrency}
          language={language}
          setLanguage={setLanguage}
          identity={identity}
          login={login}
          isLoggingIn={isLoggingIn}
          isInitializing={isInitializing}
          displayName={displayName}
          avatarUrl={avatarUrl}
          onSaveDisplayName={onSaveDisplayName}
          onSaveAvatarUrl={onSaveAvatarUrl}
          onLogout={handleLogout}
        />
      )}
    </>
  );

  return (
    <>
      {/* Full-screen background */}
      <div
        className="min-h-screen"
        style={{ background: "#050505" }}
        aria-hidden="true"
      />

      {/* Header - mobile: 430px centered fixed; desktop: full-width fixed */}
      <AppHeader
        displayName={displayName}
        isLoggedIn={!!identity}
        avatarUrl={avatarUrl}
        onAvatarClick={() => setActiveTab("profile")}
        onBellClick={() => setActiveTab("alerts")}
      />

      {/* Desktop Sidebar - only visible on lg+ */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertBadge={alertBadge}
        onClearBadge={() => setAlertBadge(false)}
      />

      {/* ===== MOBILE layout (< 1024px) ===== */}
      {/* Fixed 430px centered column, unchanged from original */}
      <div
        className="fixed inset-0 left-1/2 -translate-x-1/2 flex flex-col lg:hidden"
        style={{
          maxWidth: "430px",
          width: "100%",
          background: "#0A0A0A",
          boxShadow: "0 0 80px rgba(0,0,0,0.8), 0 0 1px rgba(212,175,55,0.08)",
        }}
      >
        {/* Alert banner */}
        <AnimatePresence>
          {activeBanner && (
            <AlertBannerToast
              banner={activeBanner}
              onClose={() => setActiveBanner(null)}
            />
          )}
        </AnimatePresence>

        {/* Issue 35: overflow-y:auto only on the innermost scrollable container */}
        <div
          className="flex-1 min-h-0 flex flex-col overflow-y-auto"
          style={{ paddingTop: "60px", paddingBottom: "64px" }}
        >
          {screenContent}
        </div>

        <AnimatePresence>
          {showA2HS && (
            <AddToHomeScreen
              isIOS={isIOS}
              onInstall={handleA2HSInstall}
              onDismiss={handleA2HSDismiss}
            />
          )}
        </AnimatePresence>

        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          alertBadge={alertBadge}
          onClearBadge={() => setAlertBadge(false)}
        />
      </div>

      {/* ===== DESKTOP layout (>= 1024px) ===== */}
      {/* Full-width content, offset by sidebar */}
      <div
        className="hidden lg:block"
        style={{
          marginLeft: "240px",
          paddingTop: "60px",
          minHeight: "100vh",
          background: "#0A0A0A",
        }}
      >
        {/* Alert banner - desktop */}
        <AnimatePresence>
          {activeBanner && (
            <div
              style={{
                position: "fixed",
                top: 68,
                right: 32,
                zIndex: 100,
                width: 380,
              }}
            >
              <AlertBannerToast
                banner={activeBanner}
                onClose={() => setActiveBanner(null)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Scrollable content container */}
        <div
          style={{
            height: "calc(100vh - 60px)",
            overflowY: "auto",
          }}
        >
          <div
            className="w-full mx-auto"
            style={{
              maxWidth: "1280px",
              padding: "0 40px",
              minHeight: "calc(100% - 40px)",
            }}
          >
            {screenContent}
          </div>
          {/* Desktop footer — inside scroll container so it's reachable */}
          <div
            className="text-center py-3 text-[10px]"
            style={{
              color: "#3A3A3A",
              borderTop: "1px solid #1A1A1A",
            }}
          >
            © {new Date().getFullYear()} Stancard Space Ltd.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4A4A4A", textDecoration: "underline" }}
            >
              Built with caffeine.ai
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 text-center py-2 text-[10px] pointer-events-none lg:hidden"
        style={{ color: "#3A3A3A", zIndex: 1 }}
      >
        © {new Date().getFullYear()} Stancard Space Ltd.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto"
          style={{ color: "#4A4A4A", textDecoration: "underline" }}
        >
          Built with caffeine.ai
        </a>
      </div>

      {/* ===== TRACKING PAGE OVERLAY ===== */}
      <AnimatePresence>
        {trackingCode !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ position: "fixed", inset: 0, zIndex: 500 }}
          >
            <TrackingPage
              code={trackingCode}
              onBack={handleExitTracking}
              actor={actor as any}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" />
    </>
  );
}

// ─── Alert Banner Toast (shared mobile + desktop) ───────────────────────────────────────────────────────────────────────────────────────
function AlertBannerToast({
  banner,
  onClose,
}: {
  banner: Alert;
  onClose: () => void;
}) {
  return (
    <motion.div
      key={banner.id}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      data-ocid="alerts.banner.toast"
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 8px",
      }}
    >
      <div
        style={{
          background: "#1A1A1A",
          borderLeft: "3px solid #D4AF37",
          borderRadius: "0 10px 10px 0",
          border: "1px solid rgba(212,175,55,0.25)",
          borderLeftWidth: 3,
          borderLeftColor: "#D4AF37",
          padding: "11px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.6), 0 0 12px rgba(212,175,55,0.1)",
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>🔔</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#D4AF37",
              letterSpacing: "0.04em",
              marginBottom: 2,
            }}
          >
            Alert Triggered
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#E8E8E8",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {banner.symbol}{" "}
            {banner.condition === "above" ? "went above" : "dropped below"}{" "}
            <span style={{ color: "#D4AF37", fontWeight: 700 }}>
              ${banner.targetPrice.toLocaleString()}
            </span>
          </div>
        </div>
        <button
          type="button"
          data-ocid="alerts.banner.close_button"
          onClick={onClose}
          aria-label="Dismiss alert"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#5A5A5A",
            padding: 4,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
