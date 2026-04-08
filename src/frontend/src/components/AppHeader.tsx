import { Shield, User } from "lucide-react";

interface AppHeaderProps {
  displayName?: string;
  isLoggedIn?: boolean;
  avatarUrl?: string;
  onAvatarClick?: () => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
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
  avatarUrl,
  onAvatarClick,
  isAdmin,
  onAdminClick,
}: AppHeaderProps) {
  const initials = displayName ? getInitials(displayName) : "";
  const showImage = isLoggedIn && !!avatarUrl;
  const showInitials = isLoggedIn && !avatarUrl && !!initials;

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
          src="/assets/stancard-logo.svg"
          alt="Stancard logo"
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

      {/* Right side: admin button (if admin) + avatar */}
      <div className="flex items-center gap-3">
        {/* Admin Button — visible only when isAdmin is true */}
        {isAdmin && (
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 h-8 rounded-full transition-all duration-200"
            style={{
              border: "1px solid rgba(212,175,55,0.5)",
              background: "rgba(212,175,55,0.08)",
              color: "#D4AF37",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
            aria-label="Admin Dashboard"
            data-ocid="header.admin_button"
            onClick={onAdminClick}
          >
            <Shield size={12} strokeWidth={2} />
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}

        {/* Avatar — all screen sizes */}
        <button
          type="button"
          onClick={onAvatarClick}
          className="flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: showImage
              ? "transparent"
              : showInitials
                ? "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)"
                : "transparent",
            border:
              showImage || showInitials
                ? showImage
                  ? "1.5px solid #D4AF37"
                  : "none"
                : "1.5px solid #D4AF37",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
          }}
          aria-label={isLoggedIn ? "Profile" : "Sign in"}
          data-ocid="header.avatar_button"
        >
          {showImage ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          ) : showInitials ? (
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
