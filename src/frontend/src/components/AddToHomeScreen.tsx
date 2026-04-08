import { X } from "lucide-react";
import { motion } from "motion/react";

interface AddToHomeScreenProps {
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function AddToHomeScreen({
  isIOS,
  onInstall,
  onDismiss,
}: AddToHomeScreenProps) {
  return (
    <motion.div
      data-ocid="a2hs.panel"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        position: "absolute",
        bottom: 64,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "#1A1A1A",
        borderTop: "3px solid #D4AF37",
        border: "1px solid rgba(212,175,55,0.25)",
        borderTopWidth: 3,
        borderTopColor: "#D4AF37",
        borderRadius: "16px 16px 0 0",
        padding: "16px",
        boxShadow:
          "0 -8px 40px rgba(0,0,0,0.7), 0 -2px 12px rgba(212,175,55,0.08)",
      }}
    >
      {/* Dismiss X button */}
      <button
        type="button"
        data-ocid="a2hs.close_button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#5A5A5A",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={16} />
      </button>

      {/* Row 1: icon + text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          paddingRight: 24,
        }}
      >
        <img
          src="/assets/stancard-logo.svg"
          alt="Stancard"
          style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#E8E8E8",
              lineHeight: 1.3,
              marginBottom: 2,
            }}
          >
            Add Stancard to Home Screen
          </div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>
            Access your wallet instantly from your home screen.
          </div>
        </div>
      </div>

      {/* Row 2: action area */}
      {isIOS ? (
        <div
          data-ocid="a2hs.panel"
          style={{
            fontSize: 12,
            color: "#B8A040",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>⬆</span>
          <span>
            Tap the <strong style={{ color: "#D4AF37" }}>Share</strong> icon,
            then select{" "}
            <strong style={{ color: "#D4AF37" }}>'Add to Home Screen'</strong>
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            data-ocid="a2hs.primary_button"
            onClick={onInstall}
            style={{
              background: "#D4AF37",
              color: "#000",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 8,
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Add to Home Screen
          </button>
          <button
            type="button"
            data-ocid="a2hs.cancel_button"
            onClick={onDismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#5A5A5A",
              fontSize: 13,
              padding: 0,
            }}
          >
            Not now
          </button>
        </div>
      )}
    </motion.div>
  );
}
