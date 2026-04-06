import { ArrowLeft, Mail } from "lucide-react";

interface AboutScreenProps {
  onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0A0A0A" }}
      data-ocid="about.page"
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #1A1A1A",
          background: "#0A0A0A",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-ocid="about.back.button"
          onClick={onBack}
          aria-label="Back to Profile"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#D4AF37",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 0",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <span
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 15,
            fontWeight: 700,
            color: "#D4AF37",
            letterSpacing: "0.04em",
            pointerEvents: "none",
          }}
        >
          About Stancard
        </span>
        {/* Spacer to balance the back button */}
        <div style={{ width: 56 }} />
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: "32px 16px 40px" }}
      >
        {/* Logo + wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <img
            src="/assets/generated/stancard-horse-logo-transparent.dim_120x120.png"
            alt="Stancard Horse Logo"
            style={{ width: 64, height: 64, objectFit: "contain" }}
          />
          <span
            style={{
              marginTop: 10,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.18em",
              background:
                "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textTransform: "uppercase",
            }}
          >
            Stancard
          </span>
          {/* Gold divider */}
          <div
            style={{
              marginTop: 14,
              width: "30%",
              height: 1,
              background:
                "linear-gradient(90deg, transparent, #D4AF37 50%, transparent)",
              opacity: 0.6,
            }}
          />
        </div>

        {/* Company info card */}
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 14,
            padding: "18px 16px",
            marginBottom: 14,
          }}
          data-ocid="about.company.card"
        >
          <div style={{ marginBottom: 12 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#7A7A7A",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Company
            </span>
            <p
              style={{
                marginTop: 4,
                fontSize: 15,
                fontWeight: 600,
                color: "#E8E8E8",
              }}
            >
              Stancard Space Ltd
            </p>
          </div>
          <div
            style={{
              width: "100%",
              height: 1,
              background: "#2A2A2A",
              marginBottom: 12,
            }}
          />
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#7A7A7A",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Founder
            </span>
            <p
              style={{
                marginTop: 4,
                fontSize: 15,
                fontWeight: 600,
                color: "#E8E8E8",
              }}
            >
              Ajao Abiodun Joseph Olajire
            </p>
          </div>
        </div>

        {/* Mission card */}
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderLeft: "3px solid #D4AF37",
            borderRadius: 14,
            padding: "18px 16px",
            marginBottom: 14,
          }}
          data-ocid="about.mission.card"
        >
          <span
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              color: "#D4AF37",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Our Mission
          </span>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "#C8C8C8",
              fontStyle: "italic",
            }}
          >
            &ldquo;Stancard exists to give every person on earth equal access to
            financial intelligence and seamless global payments &mdash;
            regardless of where they were born.&rdquo;
          </p>
        </div>

        {/* Contact card */}
        <div
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            borderRadius: 14,
            padding: "18px 16px",
            marginBottom: 28,
          }}
          data-ocid="about.contact.card"
        >
          <span
            style={{
              display: "block",
              fontSize: 10,
              fontWeight: 700,
              color: "#D4AF37",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Contact
          </span>
          <a
            href="mailto:stancardcreativeagency@gmail.com"
            data-ocid="about.contact.link"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#D4AF37",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Mail size={16} />
            stancardcreativeagency@gmail.com
          </a>
        </div>

        {/* Legal */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              color: "#5A5A5A",
              lineHeight: 1.7,
              letterSpacing: "0.02em",
            }}
          >
            Stancard&trade; is a trademark of Stancard Space Ltd
            <br />
            &copy; {new Date().getFullYear()} Stancard Space Ltd. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
