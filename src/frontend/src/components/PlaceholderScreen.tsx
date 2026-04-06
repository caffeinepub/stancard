import type { TabId } from "./BottomNav";

interface PlaceholderScreenProps {
  tab: TabId;
}

const tabConfig: Record<string, { heading: string; subtitle: string }> = {
  markets: {
    heading: "Markets",
    subtitle: "Real-time market data, charts & analytics — coming soon.",
  },
  pay: {
    heading: "Pay",
    subtitle: "Instant transfers, bill payments & more — coming soon.",
  },
  alerts: {
    heading: "Alerts",
    subtitle: "Smart price alerts & portfolio notifications — coming soon.",
  },
  profile: {
    heading: "Profile",
    subtitle: "Account settings, security & preferences — coming soon.",
  },
};

export function PlaceholderScreen({ tab }: PlaceholderScreenProps) {
  const config = tabConfig[tab] ?? { heading: tab, subtitle: "Coming soon." };

  return (
    <main
      className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-8 pb-8"
      data-ocid={`${tab}.page`}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Horse logo */}
        <img
          src="/assets/generated/stancard-horse-logo-transparent.dim_120x120.png"
          alt="Stancard"
          className="w-16 h-16 object-contain opacity-60"
          draggable={false}
        />

        {/* Tab heading */}
        <h1
          className="text-2xl font-bold tracking-wide"
          style={{ color: "#D4AF37" }}
        >
          {config.heading}
        </h1>

        {/* Decorative line */}
        <div
          className="w-12 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, #D4AF37, transparent)",
          }}
        />

        {/* Subtitle */}
        <p
          className="text-sm leading-relaxed max-w-[240px]"
          style={{ color: "#7A7A7A" }}
        >
          {config.subtitle}
        </p>

        {/* Coming soon badge */}
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
          style={{
            border: "1px solid #2A2A2A",
            color: "#6C6C6C",
            background: "#0F0F0F",
            letterSpacing: "0.15em",
          }}
        >
          Coming Soon
        </span>
      </div>
    </main>
  );
}
