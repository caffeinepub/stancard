// ISSUE 8: DonutChart now accepts real wallet balances and isLoggedIn prop.
// When logged in with balances it shows currency allocation;
// when logged out or no balances it shows a placeholder.

const USD_RATES: Record<string, number> = {
  NGN: 1 / 1600,
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  CNY: 0.138,
};

const CURRENCY_COLORS: Record<string, string> = {
  NGN: "#D4AF37",
  USD: "#E8E8E8",
  EUR: "#B8871A",
  GBP: "#F2D37A",
  CNY: "#6C6C6C",
};

export interface DonutChartProps {
  balances?: { currency: string; amount: number }[];
  isLoggedIn?: boolean;
}

export function DonutChart({ balances, isLoggedIn }: DonutChartProps) {
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 52;
  const innerR = 30;

  // ─── Logged-out or no data placeholder ───────────────────────────────────
  if (!isLoggedIn || !balances || balances.length === 0) {
    return (
      <div className="flex items-center gap-6">
        <div
          className="relative flex-shrink-0"
          style={{ width: size, height: size }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="Portfolio allocation placeholder"
          >
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="#1A1A1A"
              strokeWidth={outerR - innerR}
            />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fill="#4A4A4A"
              fontSize="10"
              fontWeight="500"
            >
              Sign in
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              fill="#3A3A3A"
              fontSize="9"
            >
              to view
            </text>
          </svg>
        </div>
        <div className="flex flex-col gap-2.5 flex-1">
          {["NGN", "USD", "EUR", "GBP"].map((c) => (
            <div key={c} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: "#2A2A2A" }}
                />
                <span className="text-xs" style={{ color: "#3A3A3A" }}>
                  {c}
                </span>
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: "#3A3A3A" }}
              >
                —
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Compute segments from real balances ───────────────────────────────
  const usdValues = balances.map((b) => ({
    currency: b.currency,
    usd: b.amount * (USD_RATES[b.currency] ?? 1),
  }));
  const total = usdValues.reduce((s, v) => s + v.usd, 0);

  // All-zero case
  if (total === 0) {
    return (
      <div className="flex items-center gap-6">
        <div
          className="relative flex-shrink-0"
          style={{ width: size, height: size }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="Portfolio allocation placeholder"
          >
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="#1A1A1A"
              strokeWidth={outerR - innerR}
            />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fill="#4A4A4A"
              fontSize="10"
              fontWeight="500"
            >
              No
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              fill="#3A3A3A"
              fontSize="9"
            >
              balance yet
            </text>
          </svg>
        </div>
        <div className="flex-1">
          <span className="text-xs" style={{ color: "#4A4A4A" }}>
            Fund your wallet to see allocation.
          </span>
        </div>
      </div>
    );
  }

  const segments = usdValues
    .filter((v) => v.usd > 0)
    .map((v) => ({
      label: v.currency,
      percentage: (v.usd / total) * 100,
      color: CURRENCY_COLORS[v.currency] ?? "#5A5A5A",
    }));

  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      {/* SVG Donut */}
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Portfolio allocation donut chart"
        >
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={(outerR + innerR) / 2}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth={outerR - innerR}
          />
          {segments.map((seg) => {
            const startAngle = (cumulative / 100) * 360;
            const endAngle = ((cumulative + seg.percentage) / 100) * 360;
            cumulative += seg.percentage;

            const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
            const x1 = cx + outerR * Math.cos(toRad(startAngle));
            const y1 = cy + outerR * Math.sin(toRad(startAngle));
            const x2 = cx + outerR * Math.cos(toRad(endAngle));
            const y2 = cy + outerR * Math.sin(toRad(endAngle));
            const ix1 = cx + innerR * Math.cos(toRad(startAngle));
            const iy1 = cy + innerR * Math.sin(toRad(startAngle));
            const ix2 = cx + innerR * Math.cos(toRad(endAngle));
            const iy2 = cy + innerR * Math.sin(toRad(endAngle));
            const largeArc = seg.percentage > 50 ? 1 : 0;

            const d = [
              `M ${x1} ${y1}`,
              `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
              `L ${ix2} ${iy2}`,
              `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
              "Z",
            ].join(" ");

            return (
              <path
                key={seg.label}
                d={d}
                fill={seg.color}
                strokeWidth="1"
                stroke="#0A0A0A"
              />
            );
          })}
          {/* Center text */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill="#E8E8E8"
            fontSize="11"
            fontWeight="600"
          >
            Total
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill="#D4AF37"
            fontSize="10"
            fontWeight="700"
          >
            100%
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: seg.color }}
              />
              <span className="text-xs" style={{ color: "#B0B0B0" }}>
                {seg.label}
              </span>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: "#E8E8E8" }}
            >
              {seg.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
