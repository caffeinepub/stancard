import { Bell, CreditCard, Home, TrendingUp, Truck, User } from "lucide-react";

export type TabId = "home" | "markets" | "pay" | "alerts" | "profile" | "move";

interface NavTab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>;
  isPay?: boolean;
}

const tabs: NavTab[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "markets", label: "Markets", icon: TrendingUp },
  { id: "pay", label: "Pay", icon: CreditCard, isPay: true },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "move", label: "Move", icon: Truck },
  { id: "profile", label: "Profile", icon: User },
];

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  alertBadge: boolean;
  onClearBadge: () => void;
}

export function BottomNav({
  activeTab,
  onTabChange,
  alertBadge,
  onClearBadge,
}: BottomNavProps) {
  function handleTabClick(tabId: TabId) {
    if (tabId === "alerts") {
      onClearBadge();
    }
    onTabChange(tabId);
  }

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex items-stretch safe-area-pb"
      style={{
        background: "#0A0A0A",
        borderTop: "1px solid #1A1A1A",
      }}
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const showBadge = tab.id === "alerts" && alertBadge;

        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-all duration-200 relative"
            style={{
              color: isActive ? "#D4AF37" : "#6C6C6C",
              minHeight: tab.isPay ? "64px" : "56px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            data-ocid={`nav.${tab.id}_tab`}
          >
            {tab.isPay ? (
              <span
                className="flex items-center justify-center rounded-full mb-0.5"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)"
                    : "#1C1C1C",
                  border: `1.5px solid ${isActive ? "#D4AF37" : "#2A2A2A"}`,
                  width: 40,
                  height: 40,
                  color: isActive ? "#111" : "#6C6C6C",
                  boxShadow: isActive
                    ? "0 4px 16px rgba(212,175,55,0.35)"
                    : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={18} strokeWidth={1.75} />
              </span>
            ) : (
              <div style={{ position: "relative", display: "inline-flex" }}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{
                    color: isActive ? "#D4AF37" : "#6C6C6C",
                    transition: "color 0.2s",
                  }}
                />
                {showBadge && (
                  <span
                    data-ocid="nav.alerts.badge"
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -3,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
                      boxShadow: "0 0 6px rgba(212,175,55,0.8)",
                      border: "1.5px solid #0A0A0A",
                    }}
                  />
                )}
              </div>
            )}
            <span
              className="text-[9px] font-medium tracking-wide"
              style={{
                color: isActive ? "#D4AF37" : "#6C6C6C",
                transition: "color 0.2s",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
