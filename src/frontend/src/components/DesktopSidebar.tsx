import { Bell, CreditCard, Home, TrendingUp, User } from "lucide-react";
import type { TabId } from "./BottomNav";

interface DesktopSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  alertBadge: boolean;
  onClearBadge: () => void;
}

const tabs: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>;
  isPay?: boolean;
}> = [
  { id: "home", label: "Home", icon: Home },
  { id: "markets", label: "Markets", icon: TrendingUp },
  { id: "pay", label: "Pay", icon: CreditCard, isPay: true },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
];

export function DesktopSidebar({
  activeTab,
  onTabChange,
  alertBadge,
  onClearBadge,
}: DesktopSidebarProps) {
  function handleTabClick(tabId: TabId) {
    if (tabId === "alerts") {
      onClearBadge();
    }
    onTabChange(tabId);
  }

  return (
    <aside
      className="hidden lg:flex flex-col fixed top-[60px] left-0 z-40"
      style={{
        width: "240px",
        height: "calc(100vh - 60px)",
        background: "#111111",
        borderRight: "1px solid #1A1A1A",
      }}
      aria-label="Desktop navigation"
      data-ocid="sidebar.panel"
    >
      <nav className="flex flex-col pt-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const showBadge = tab.id === "alerts" && alertBadge;

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="flex items-center gap-3 transition-all duration-200 relative"
              style={{
                paddingTop: 14,
                paddingBottom: 14,
                paddingLeft: isActive ? 20 : 24,
                paddingRight: 24,
                borderLeft: isActive
                  ? "4px solid #D4AF37"
                  : "4px solid transparent",
                color: isActive ? "#D4AF37" : "#6C6C6C",
                background: isActive ? "rgba(212,175,55,0.06)" : "transparent",
                border: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(212,175,55,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              data-ocid={`sidebar.${tab.id}.link`}
            >
              {tab.isPay ? (
                <span
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)"
                      : "#1C1C1C",
                    border: `1.5px solid ${isActive ? "#D4AF37" : "#2A2A2A"}`,
                    width: 36,
                    height: 36,
                    color: isActive ? "#111" : "#6C6C6C",
                    boxShadow: isActive
                      ? "0 4px 16px rgba(212,175,55,0.3)"
                      : "none",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
              ) : (
                <div
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    flexShrink: 0,
                  }}
                >
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
                      data-ocid="sidebar.alerts.badge"
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
                        border: "1.5px solid #111",
                      }}
                    />
                  )}
                </div>
              )}

              <span
                className="text-sm font-medium"
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
    </aside>
  );
}
