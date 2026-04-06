import { Bell, User } from "lucide-react";

interface AppHeaderProps {
  displayName?: string;
  isLoggedIn?: boolean;
  onAvatarClick?: () => void;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function AppHeader({
  displayName,
  isLoggedIn,
  onAvatarClick,
}: AppHeaderProps) {
  const initials = displayName ? getInitials(displayName) : "";

  return (
    <header
      className="fixed top-0 z-50 flex items-center justify-between px-5 py-3
        left-1/2 -translate-x-1/2 w-full max-w-[430px]
        lg:left-0 lg:right-0 lg:max-w-none lg:translate-x-0 lg:px-8"
      style={{
        background: "#0A0A0A",
        borderBottom: "1px solid #1A1A1A",
        height: "60px",
      }}
      aria-label="Stancard app header"
    >
      {/* Logo + Wordmark */}
      <div className="flex items-center gap-2.5">
        <img
          src="/assets/generated/stancard-horse-logo-transparent.dim_120x120.png"
          alt="Stancard horse logo"
          className="h-8 w-8 object-contain"
          draggable={false}
        />
        <span
          className="font-semibold tracking-widest text-sm uppercase"
          style={{ color: "#D4AF37", letterSpacing: "0.18em" }}
        >
          stancard
        </span>
      </div>

      {/* Right side: bell + avatar (desktop) or just bell (mobile) */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
          style={{
            border: "1px solid #D4AF37",
            background: "transparent",
            color: "#D4AF37",
          }}
          aria-label="Notifications"
          data-ocid="header.bell_button"
        >
          <Bell size={16} strokeWidth={1.75} />
        </button>

        {/* Avatar — desktop only */}
        <button
          type="button"
          onClick={onAvatarClick}
          className="hidden lg:flex items-center justify-center flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background:
              isLoggedIn && initials
                ? "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)"
                : "transparent",
            border: isLoggedIn && initials ? "none" : "1.5px solid #D4AF37",
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label={isLoggedIn ? "Profile" : "Sign in"}
          data-ocid="header.avatar_button"
        >
          {isLoggedIn && initials ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#111",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {initials}
            </span>
          ) : (
            <User size={16} strokeWidth={1.5} style={{ color: "#D4AF37" }} />
          )}
        </button>
      </div>
    </header>
  );
}
