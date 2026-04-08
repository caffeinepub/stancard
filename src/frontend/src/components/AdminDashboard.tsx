import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Package,
  RefreshCw,
  Shield,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminActor {
  getAllRiderVerifications: () => Promise<RiderVerificationWithStatus[]>;
  getAllSenderVerifications: () => Promise<SenderVerificationWithStatus[]>;
  approveRiderVerification: (
    riderPrincipal: string,
    notes: string,
  ) => Promise<AdminResult>;
  rejectRiderVerification: (
    riderPrincipal: string,
    reason: string,
  ) => Promise<AdminResult>;
  approveSenderVerification: (
    senderPrincipal: string,
    notes: string,
  ) => Promise<AdminResult>;
  rejectSenderVerification: (
    senderPrincipal: string,
    reason: string,
  ) => Promise<AdminResult>;
  getAllUsers: () => Promise<AdminUserSummary[]>;
  getAllRiderRoutes: () => Promise<AdminRiderRoute[]>;
  getAllPackages: () => Promise<AdminPackage[]>;
  getAllDeliveryRequests: () => Promise<AdminDelivery[]>;
}

interface AdminResult {
  ok?: string;
  err?: string;
}

interface VerificationStatus {
  type: "Pending" | "Approved" | "Rejected";
  notes?: string;
  reason?: string;
}

interface RiderVerificationWithStatus {
  riderPrincipal: { toText?: () => string } | string;
  nationalIdNumber: string;
  licenseNumber: string;
  licenseType: string;
  vehicleRegistrationNumber: string;
  nationalIdDocUrl?: string;
  licenseDocUrl?: string;
  vehicleRegDocUrl?: string;
  verifiedAt: bigint;
  status: VerificationStatus | string;
}

interface SenderVerificationWithStatus {
  senderPrincipal: { toText?: () => string } | string;
  phoneNumber: string;
  nationalIdNumber: string;
  nationalIdDocUrl?: string;
  verifiedAt: bigint;
  status: VerificationStatus | string;
}

interface AdminUserSummary {
  principalId: { toText?: () => string } | string;
  displayName: string;
  createdAt: bigint;
}

interface AdminRiderRoute {
  riderPrincipal: { toText?: () => string } | string;
  vehicleType: string;
  departureCity: string;
  departureCountry: string;
  destinationCity: string;
  destinationCountry: string;
  travelDate: string;
  cargoSpace: string;
}

interface AdminPackage {
  senderPrincipal: { toText?: () => string } | string;
  pickupLocation: string;
  destinationCity: string;
  destinationCountry: string;
  size: string;
  weightKg: number;
  description: string;
  packageId: string;
}

interface AdminDelivery {
  requestId: string;
  trackingCode?: string;
  status: string;
  senderPrincipal: { toText?: () => string } | string;
  riderPrincipal: { toText?: () => string } | string;
  packageId: string;
  routeId: string;
}

type AdminSection =
  | "verifications"
  | "users"
  | "routes"
  | "packages"
  | "deliveries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function principalText(p: { toText?: () => string } | string): string {
  if (typeof p === "string") return p;
  if (p && typeof p.toText === "function") return p.toText();
  return String(p);
}

function truncatePrincipal(p: { toText?: () => string } | string): string {
  const text = principalText(p);
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function formatDate(ts: bigint): string {
  try {
    const ms = Number(ts) / 1_000_000;
    return new Date(ms).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function getStatusFromVariant(
  status: VerificationStatus | string,
): "Pending" | "Approved" | "Rejected" {
  if (typeof status === "string")
    return status as "Pending" | "Approved" | "Rejected";
  return status.type;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Primitive UI ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const config =
    s === "approved"
      ? {
          bg: "rgba(34,197,94,0.12)",
          border: "rgba(34,197,94,0.4)",
          color: "#22c55e",
        }
      : s === "rejected"
        ? {
            bg: "rgba(239,68,68,0.12)",
            border: "rgba(239,68,68,0.4)",
            color: "#ef4444",
          }
        : {
            bg: "rgba(212,175,55,0.12)",
            border: "rgba(212,175,55,0.4)",
            color: "#D4AF37",
          };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function SectionNav({
  active,
  onChange,
}: {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
}) {
  const sections: { id: AdminSection; label: string; icon: React.ReactNode }[] =
    [
      {
        id: "verifications",
        label: "Verifications",
        icon: <Shield size={14} />,
      },
      { id: "users", label: "Users", icon: <Users size={14} /> },
      { id: "routes", label: "Routes", icon: <Truck size={14} /> },
      { id: "packages", label: "Packages", icon: <Package size={14} /> },
      { id: "deliveries", label: "Deliveries", icon: <FileText size={14} /> },
    ];
  return (
    <div
      className="flex gap-1 overflow-x-auto"
      style={{
        scrollbarWidth: "none",
        WebkitOverflowScrolling:
          "touch" as React.CSSProperties["WebkitOverflowScrolling"],
      }}
      data-ocid="admin.section_nav"
    >
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className="flex items-center gap-1.5 flex-shrink-0 transition-all duration-200"
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: active === s.id ? 700 : 500,
            border: `1px solid ${active === s.id ? "rgba(212,175,55,0.5)" : "#2A2A2A"}`,
            background:
              active === s.id ? "rgba(212,175,55,0.1)" : "transparent",
            color: active === s.id ? "#D4AF37" : "#6C6C6C",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          data-ocid={`admin.nav.${s.id}`}
        >
          {s.icon}
          {s.label}
        </button>
      ))}
    </div>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 10,
        border: "1px solid #1A1A1A",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}
      >
        {children}
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#5A5A5A",
        background: "#111",
        borderBottom: "1px solid #1A1A1A",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  style,
}: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td
      style={{
        padding: "11px 14px",
        fontSize: 13,
        color: "#C8C8C8",
        borderBottom: "1px solid #161616",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {["a", "b", "c"].map((key) => (
        <tr key={key}>
          {Array.from({ length: cols }).map((_, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
            <td key={j} style={{ padding: "12px 14px" }}>
              <div
                style={{
                  height: 14,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.05)",
                  animation: "pulse 1.5s ease-in-out infinite",
                  width: j === 0 ? "60%" : "80%",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <XCircle size={32} style={{ color: "#ef4444", margin: "0 auto 12px" }} />
      <div style={{ fontSize: 14, color: "#C8C8C8", marginBottom: 16 }}>
        Failed to load data
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: "8px 20px",
          borderRadius: 8,
          background: "rgba(212,175,55,0.1)",
          border: "1px solid rgba(212,175,55,0.4)",
          color: "#D4AF37",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
        data-ocid="admin.error.retry_button"
      >
        <RefreshCw size={13} style={{ display: "inline", marginRight: 6 }} />
        Retry
      </button>
    </div>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      // Focus after paint
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function handleOverlayKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  function handleInnerKey(e: React.KeyboardEvent) {
    e.stopPropagation();
  }

  return (
    <dialog
      aria-label="Reject Verification"
      open
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onCancel}
      onKeyDown={handleOverlayKey}
      tabIndex={-1}
    >
      <div
        role="presentation"
        style={{
          background: "#111",
          border: "1px solid #2A2A2A",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth: 400,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleInnerKey}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#E8E8E8",
            marginBottom: 6,
          }}
        >
          Reject Verification
        </div>
        <div style={{ fontSize: 13, color: "#5A5A5A", marginBottom: 16 }}>
          Provide a reason for rejection. This will be visible to the user.
        </div>
        <textarea
          ref={inputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for rejection..."
          rows={4}
          style={{
            width: "100%",
            background: "#0A0A0A",
            border: "1px solid #2A2A2A",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#E8E8E8",
            fontSize: 13,
            resize: "vertical",
            outline: "none",
            marginBottom: 16,
            boxSizing: "border-box",
          }}
          data-ocid="admin.reject.reason_input"
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid #2A2A2A",
              color: "#6C6C6C",
              fontSize: 13,
              cursor: "pointer",
            }}
            data-ocid="admin.reject.cancel_button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (reason.trim()) {
                onConfirm(reason.trim());
                setReason("");
              }
            }}
            disabled={!reason.trim()}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: reason.trim()
                ? "rgba(239,68,68,0.15)"
                : "rgba(239,68,68,0.05)",
              border: `1px solid ${reason.trim() ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"}`,
              color: reason.trim() ? "#ef4444" : "#6C6C6C",
              fontSize: 13,
              fontWeight: 700,
              cursor: reason.trim() ? "pointer" : "not-allowed",
            }}
            data-ocid="admin.reject.confirm_button"
          >
            Reject
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Verifications Section ────────────────────────────────────────────────────

function VerificationsSection({ actor }: { actor: AdminActor }) {
  const [tab, setTab] = useState<"rider" | "sender">("rider");
  const [riderVerifs, setRiderVerifs] = useState<RiderVerificationWithStatus[]>(
    [],
  );
  const [senderVerifs, setSenderVerifs] = useState<
    SenderVerificationWithStatus[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    type: "rider" | "sender";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [riders, senders] = await Promise.all([
        withTimeout(actor.getAllRiderVerifications(), 8000, []),
        withTimeout(actor.getAllSenderVerifications(), 8000, []),
      ]);
      setRiderVerifs(riders);
      setSenderVerifs(senders);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(principalId: string, type: "rider" | "sender") {
    setActionLoading(`${type}-${principalId}`);
    try {
      const result =
        type === "rider"
          ? await withTimeout(
              actor.approveRiderVerification(principalId, "Approved by admin"),
              8000,
              { err: "Timeout" },
            )
          : await withTimeout(
              actor.approveSenderVerification(principalId, "Approved by admin"),
              8000,
              { err: "Timeout" },
            );
      if (result.ok) {
        setActionMsg("Verification approved.");
        void load();
      } else {
        setActionMsg(result.err ?? "Failed to approve.");
      }
    } catch {
      setActionMsg("An error occurred.");
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    const { id, type } = rejectTarget;
    setRejectTarget(null);
    setActionLoading(`${type}-${id}`);
    try {
      const result =
        type === "rider"
          ? await withTimeout(actor.rejectRiderVerification(id, reason), 8000, {
              err: "Timeout",
            })
          : await withTimeout(
              actor.rejectSenderVerification(id, reason),
              8000,
              { err: "Timeout" },
            );
      if (result.ok) {
        setActionMsg("Verification rejected.");
        void load();
      } else {
        setActionMsg(result.err ?? "Failed to reject.");
      }
    } catch {
      setActionMsg("An error occurred.");
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMsg(null), 3000);
    }
  }

  const verifs = tab === "rider" ? riderVerifs : senderVerifs;
  const colCount = tab === "rider" ? 8 : 7;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["rider", "sender"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "6px 16px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: tab === t ? 700 : 500,
              border: `1px solid ${tab === t ? "rgba(212,175,55,0.5)" : "#2A2A2A"}`,
              background: tab === t ? "rgba(212,175,55,0.08)" : "transparent",
              color: tab === t ? "#D4AF37" : "#6C6C6C",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
            data-ocid={`admin.verif.${t}_tab`}
          >
            {t === "rider" ? "Rider Verifications" : "Sender Verifications"}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 14px",
            background: "rgba(212,175,55,0.08)",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 8,
            fontSize: 13,
            color: "#D4AF37",
          }}
        >
          {actionMsg}
        </div>
      )}

      <TableWrapper>
        <thead>
          <tr>
            <Th>Principal</Th>
            <Th>National ID</Th>
            {tab === "rider" && (
              <>
                <Th>License</Th>
                <Th>Vehicle Reg</Th>
              </>
            )}
            {tab === "sender" && <Th>Phone</Th>}
            <Th>Submitted</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRows cols={colCount} />
          ) : error ? (
            <tr>
              <td colSpan={colCount} style={{ padding: 0 }}>
                <ErrorState onRetry={load} />
              </td>
            </tr>
          ) : verifs.length === 0 ? (
            <tr>
              <td
                colSpan={colCount}
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  color: "#5A5A5A",
                  fontSize: 13,
                }}
              >
                No verifications found
              </td>
            </tr>
          ) : (
            verifs.map((v) => {
              const pid =
                tab === "rider"
                  ? principalText(
                      (v as RiderVerificationWithStatus).riderPrincipal,
                    )
                  : principalText(
                      (v as SenderVerificationWithStatus).senderPrincipal,
                    );
              const rowKey = `${tab}-${pid}`;
              const status = getStatusFromVariant(v.status);
              const isActing = actionLoading === `${tab}-${pid}`;
              return (
                <tr key={rowKey}>
                  <Td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#A0A0A0",
                      }}
                    >
                      {truncatePrincipal(pid)}
                    </span>
                  </Td>
                  <Td>{v.nationalIdNumber}</Td>
                  {tab === "rider" && (
                    <>
                      <Td>
                        <span style={{ fontSize: 11, color: "#5A5A5A" }}>
                          {(v as RiderVerificationWithStatus).licenseType}
                        </span>
                        <br />
                        {(v as RiderVerificationWithStatus).licenseNumber}
                      </Td>
                      <Td>
                        {
                          (v as RiderVerificationWithStatus)
                            .vehicleRegistrationNumber
                        }
                      </Td>
                    </>
                  )}
                  {tab === "sender" && (
                    <Td>{(v as SenderVerificationWithStatus).phoneNumber}</Td>
                  )}
                  <Td>{formatDate(v.verifiedAt)}</Td>
                  <Td>
                    <StatusBadge status={status} />
                  </Td>
                  <Td>
                    {status === "Pending" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleApprove(pid, tab)}
                          disabled={isActing}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: "rgba(34,197,94,0.1)",
                            border: "1px solid rgba(34,197,94,0.35)",
                            color: "#22c55e",
                            cursor: isActing ? "not-allowed" : "pointer",
                            opacity: isActing ? 0.5 : 1,
                          }}
                          data-ocid={`admin.verif.approve.${rowKey}`}
                        >
                          <CheckCircle
                            size={10}
                            style={{ display: "inline", marginRight: 4 }}
                          />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRejectTarget({ id: pid, type: tab })
                          }
                          disabled={isActing}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.35)",
                            color: "#ef4444",
                            cursor: isActing ? "not-allowed" : "pointer",
                            opacity: isActing ? 0.5 : 1,
                          }}
                          data-ocid={`admin.verif.reject.${rowKey}`}
                        >
                          <XCircle
                            size={10}
                            style={{ display: "inline", marginRight: 4 }}
                          />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#3A3A3A" }}>—</span>
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableWrapper>

      <RejectModal
        open={!!rejectTarget}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────

function UsersSection({ actor }: { actor: AdminActor }) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await withTimeout(actor.getAllUsers(), 8000, []);
      setUsers(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = users.filter((u) => {
    const pid = principalText(u.principalId).toLowerCase();
    const name = (u.displayName || "").toLowerCase();
    const q = search.toLowerCase();
    return !q || pid.includes(q) || name.includes(q);
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search by principal or display name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#0A0A0A",
          border: "1px solid #2A2A2A",
          borderRadius: 8,
          padding: "8px 12px",
          color: "#E8E8E8",
          fontSize: 13,
          outline: "none",
          marginBottom: 14,
          boxSizing: "border-box",
        }}
        data-ocid="admin.users.search_input"
      />

      <TableWrapper>
        <thead>
          <tr>
            <Th>Principal</Th>
            <Th>Display Name</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRows cols={3} />
          ) : error ? (
            <tr>
              <td colSpan={3} style={{ padding: 0 }}>
                <ErrorState onRetry={load} />
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  color: "#5A5A5A",
                  fontSize: 13,
                }}
              >
                {search ? "No users match your search" : "No users found"}
              </td>
            </tr>
          ) : (
            filtered.map((u) => {
              const pid = principalText(u.principalId);
              return (
                <tr key={pid}>
                  <Td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#A0A0A0",
                      }}
                    >
                      {truncatePrincipal(u.principalId)}
                    </span>
                  </Td>
                  <Td>
                    {u.displayName || (
                      <span style={{ color: "#3A3A3A" }}>—</span>
                    )}
                  </Td>
                  <Td>{formatDate(u.createdAt)}</Td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableWrapper>
    </div>
  );
}

// ─── Routes Section ───────────────────────────────────────────────────────────

function RoutesSection({ actor }: { actor: AdminActor }) {
  const [routes, setRoutes] = useState<AdminRiderRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await withTimeout(actor.getAllRiderRoutes(), 8000, []);
      setRoutes(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TableWrapper>
      <thead>
        <tr>
          <Th>Rider</Th>
          <Th>Vehicle</Th>
          <Th>Departure</Th>
          <Th>Destination</Th>
          <Th>Travel Date</Th>
          <Th>Cargo Space</Th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <LoadingRows cols={6} />
        ) : error ? (
          <tr>
            <td colSpan={6} style={{ padding: 0 }}>
              <ErrorState onRetry={load} />
            </td>
          </tr>
        ) : routes.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "#5A5A5A",
                fontSize: 13,
              }}
            >
              No routes found
            </td>
          </tr>
        ) : (
          routes.map((r) => {
            const pid = principalText(r.riderPrincipal);
            const rowKey = `${pid}-${r.travelDate}-${r.destinationCity}`;
            return (
              <tr key={rowKey}>
                <Td>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#A0A0A0",
                    }}
                  >
                    {truncatePrincipal(r.riderPrincipal)}
                  </span>
                </Td>
                <Td>{r.vehicleType}</Td>
                <Td>
                  {r.departureCity}, {r.departureCountry}
                </Td>
                <Td>
                  {r.destinationCity}, {r.destinationCountry}
                </Td>
                <Td>{r.travelDate}</Td>
                <Td>
                  <StatusBadge status={r.cargoSpace} />
                </Td>
              </tr>
            );
          })
        )}
      </tbody>
    </TableWrapper>
  );
}

// ─── Packages Section ─────────────────────────────────────────────────────────

function PackagesSection({ actor }: { actor: AdminActor }) {
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await withTimeout(actor.getAllPackages(), 8000, []);
      setPackages(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TableWrapper>
      <thead>
        <tr>
          <Th>Sender</Th>
          <Th>Pickup</Th>
          <Th>Destination</Th>
          <Th>Size</Th>
          <Th>Weight (kg)</Th>
          <Th>Description</Th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <LoadingRows cols={6} />
        ) : error ? (
          <tr>
            <td colSpan={6} style={{ padding: 0 }}>
              <ErrorState onRetry={load} />
            </td>
          </tr>
        ) : packages.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "#5A5A5A",
                fontSize: 13,
              }}
            >
              No packages found
            </td>
          </tr>
        ) : (
          packages.map((p) => (
            <tr key={p.packageId}>
              <Td>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#A0A0A0",
                  }}
                >
                  {truncatePrincipal(p.senderPrincipal)}
                </span>
              </Td>
              <Td style={{ maxWidth: 120 }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.pickupLocation}
                </span>
              </Td>
              <Td>
                {p.destinationCity}, {p.destinationCountry}
              </Td>
              <Td>
                <StatusBadge status={p.size} />
              </Td>
              <Td>{p.weightKg}</Td>
              <Td style={{ maxWidth: 160 }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.description}
                </span>
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

// ─── Deliveries Section ───────────────────────────────────────────────────────

function DeliveriesSection({ actor }: { actor: AdminActor }) {
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await withTimeout(
        actor.getAllDeliveryRequests(),
        8000,
        [],
      );
      setDeliveries(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <TableWrapper>
      <thead>
        <tr>
          <Th>Tracking Code</Th>
          <Th>Status</Th>
          <Th>Sender</Th>
          <Th>Rider</Th>
          <Th>Package ID</Th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <LoadingRows cols={5} />
        ) : error ? (
          <tr>
            <td colSpan={5} style={{ padding: 0 }}>
              <ErrorState onRetry={load} />
            </td>
          </tr>
        ) : deliveries.length === 0 ? (
          <tr>
            <td
              colSpan={5}
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "#5A5A5A",
                fontSize: 13,
              }}
            >
              No deliveries found
            </td>
          </tr>
        ) : (
          deliveries.map((d) => (
            <tr key={d.requestId}>
              <Td>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#D4AF37",
                  }}
                >
                  {d.trackingCode || "—"}
                </span>
              </Td>
              <Td>
                <StatusBadge status={d.status} />
              </Td>
              <Td>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#A0A0A0",
                  }}
                >
                  {truncatePrincipal(d.senderPrincipal)}
                </span>
              </Td>
              <Td>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#A0A0A0",
                  }}
                >
                  {truncatePrincipal(d.riderPrincipal)}
                </span>
              </Td>
              <Td>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#5A5A5A",
                  }}
                >
                  {d.packageId.slice(0, 12)}...
                </span>
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrapper>
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

interface AdminDashboardProps {
  actor: unknown;
  onExit: () => void;
  isAdmin: boolean;
}

export function AdminDashboard({
  actor,
  onExit,
  isAdmin,
}: AdminDashboardProps) {
  const [section, setSection] = useState<AdminSection>("verifications");
  const adminActor = actor as AdminActor | null;
  const containerRef = useRef<HTMLDivElement>(null);

  function handleSectionChange(s: AdminSection) {
    setSection(s);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          padding: 40,
          textAlign: "center",
        }}
        data-ocid="admin.access_denied"
      >
        <Shield size={48} style={{ color: "#3A3A3A", marginBottom: 16 }} />
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#E8E8E8",
            marginBottom: 8,
          }}
        >
          Access Denied
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#5A5A5A",
            marginBottom: 24,
            maxWidth: 320,
          }}
        >
          You do not have permission to access the admin dashboard. Contact your
          administrator if this is an error.
        </div>
        <button
          type="button"
          onClick={onExit}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            background: "rgba(212,175,55,0.1)",
            border: "1px solid rgba(212,175,55,0.35)",
            color: "#D4AF37",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
          data-ocid="admin.access_denied.back_button"
        >
          <ArrowLeft size={14} style={{ display: "inline", marginRight: 6 }} />
          Go Back
        </button>
      </div>
    );
  }

  if (!adminActor) {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5A5A5A",
          fontSize: 14,
          padding: 40,
          textAlign: "center",
        }}
      >
        <div>
          <RefreshCw
            size={24}
            style={{
              margin: "0 auto 12px",
              animation: "spin 1s linear infinite",
            }}
          />
          Connecting to backend...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ minHeight: "100%", background: "#050505", overflowY: "auto" }}
      data-ocid="admin.dashboard"
    >
      {/* Sticky Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#0A0A0A",
          borderBottom: "1px solid #1A1A1A",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          type="button"
          onClick={onExit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 7,
            background: "transparent",
            border: "1px solid #2A2A2A",
            color: "#6C6C6C",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
          }}
          data-ocid="admin.exit_button"
        >
          <ArrowLeft size={13} />
          Exit Admin
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Shield size={18} style={{ color: "#D4AF37", flexShrink: 0 }} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#E8E8E8",
              letterSpacing: "0.02em",
            }}
          >
            Admin Dashboard
          </span>
          <span
            style={{
              display: "inline-flex",
              padding: "2px 8px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: "#D4AF37",
              marginLeft: 2,
            }}
          >
            Stancard Staff
          </span>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <SectionNav active={section} onChange={handleSectionChange} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#E8E8E8",
              margin: 0,
              textTransform: "capitalize",
            }}
          >
            {section}
          </h2>
          <div
            style={{
              width: 28,
              height: 2,
              background: "#D4AF37",
              marginTop: 5,
              borderRadius: 1,
            }}
          />
        </div>

        {section === "verifications" && (
          <VerificationsSection actor={adminActor} />
        )}
        {section === "users" && <UsersSection actor={adminActor} />}
        {section === "routes" && <RoutesSection actor={adminActor} />}
        {section === "packages" && <PackagesSection actor={adminActor} />}
        {section === "deliveries" && <DeliveriesSection actor={adminActor} />}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
