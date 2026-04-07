import { Skeleton } from "@/components/ui/skeleton";

import {
  Bike,
  Car,
  ChevronRight,
  MapPin,
  Package,
  PackageCheck,
  Plane,
  Plus,
  Route,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { forwardGeocode, reverseGeocode } from "../utils/geocode";
import type { MapArc, MapMarker } from "./MoveMap";
import { MoveMap } from "./MoveMap";
// Types defined inline to avoid circular module issues
interface RiderRoute {
  routeId: string;
  riderPrincipal: { toString: () => string };
  vehicleType: string;
  departureCity: string;
  departureCountry: string;
  destinationCity: string;
  destinationCountry: string;
  travelDate: string;
  cargoSpace: string;
  createdAt: bigint;
}
interface PackageType {
  packageId: string;
  senderPrincipal: { toString: () => string };
  pickupLocation: string;
  destinationCity: string;
  destinationCountry: string;
  size: string;
  weightKg: number;
  description: string;
  createdAt: bigint;
}
interface DeliveryRequest {
  requestId: string;
  packageId: string;
  senderPrincipal: { toString: () => string };
  riderPrincipal: { toString: () => string };
  routeId: string;
  status: string;
  createdAt: bigint;
}
interface RequestWithPackage {
  requestId: string;
  packageId: string;
  senderPrincipal: { toString: () => string };
  routeId: string;
  status: string;
  createdAt: bigint;
  pickupLocation: string;
  destinationCity: string;
  destinationCountry: string;
  size: string;
  weightKg: number;
  description: string;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "rider" | "sender";

// ─── Tracking types ─────────────────────────────────────────────────────────

interface TrackingEntry {
  status: string;
  timestamp: bigint;
}

interface AcceptedDeliveryWithTracking {
  requestId: string;
  packageId: string;
  senderPrincipal: { toString: () => string };
  riderPrincipal: { toString: () => string };
  routeId: string;
  status: string;
  createdAt: bigint;
  trackingCode: string;
  trackingEntries: TrackingEntry[];
}

interface ShipmentTracking {
  trackingCode: string;
  requestId: string;
  packageId: string;
  entries: TrackingEntry[];
  currentStatus: string;
}

interface MoveActor {
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
  getRiderRoutes: () => Promise<RiderRoute[]>;
  getAllRoutes: () => Promise<RiderRoute[]>;
  postPackage: (
    pickupLocation: string,
    destinationCity: string,
    destinationCountry: string,
    size: string,
    weightKg: number,
    description: string,
  ) => Promise<{ ok: string } | { err: string }>;
  getSenderPackages: () => Promise<PackageType[]>;
  getMatchedRiders: (
    destinationCity: string,
    destinationCountry: string,
  ) => Promise<RiderRoute[]>;
  sendDeliveryRequest: (
    packageId: string,
    routeId: string,
    riderPrincipalText: string,
  ) => Promise<{ ok: string } | { err: string }>;
  getIncomingRequests: () => Promise<RequestWithPackage[]>;
  respondToRequest: (
    requestId: string,
    accept: boolean,
  ) => Promise<{ ok: string } | { err: string }>;
  getSenderRequests: () => Promise<DeliveryRequest[]>;
  getAcceptedDeliveries: () => Promise<DeliveryRequest[]>;
  getAcceptedDeliveriesWithTracking: () => Promise<
    AcceptedDeliveryWithTracking[]
  >;
  updateShipmentStatus: (
    requestId: string,
    newStatus: string,
  ) => Promise<{ ok: string } | { err: string }>;
  getSenderTrackings: () => Promise<ShipmentTracking[]>;
  getTrackingByCode: (code: string) => Promise<ShipmentTracking | undefined>;
  getWalletBalance: (currency: string) => Promise<number>;
  getMarketData: () => Promise<{
    forex: Array<{ symbol: string; rate: number }>;
    stocks: unknown[];
    crypto: unknown[];
    lastUpdated: bigint;
    success: boolean;
  }>;
  recordMovePayment: (
    packageId: string,
    routeId: string,
    riderPrincipalText: string,
    amount: number,
    currency: string,
    reference: string,
    method: string,
    dateStr: string,
  ) => Promise<{ ok: string } | { err: string }>;
}

interface MoveScreenProps {
  identity: unknown;
  actor: (MoveActor & Record<string, unknown>) | null;
  onTrackShipment?: (code: string) => void;
  // ISSUE 10: display name for Flutterwave customer
  displayName?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncatePrincipal(id: string): string {
  if (!id || id.length <= 14) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function vehicleIcon(type: string, size = 16) {
  switch (type.toLowerCase()) {
    case "car":
      return <Car size={size} />;
    case "truck":
      return <Truck size={size} />;
    case "plane":
      return <Plane size={size} />;
    case "bicycle":
      return <Bike size={size} />;
    case "ebike":
      return <Bike size={size} />;
    default:
      return <Truck size={size} />;
  }
}

function statusBadge(status: string) {
  const styles: Record<string, { bg: string; color: string }> = {
    Pending: { bg: "#2A2A1A", color: "#D4AF37" },
    Accepted: { bg: "#0A1A0A", color: "#4ADE80" },
    Declined: { bg: "#1A0A0A", color: "#F87171" },
  };
  const s = styles[status] ?? { bg: "#1A1A1A", color: "#9A9A9A" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}
    >
      {status}
    </span>
  );
}

function trackingStatusBadge(status: string) {
  const styles: Record<string, { bg: string; color: string }> = {
    Pending: { bg: "rgba(150,150,150,0.1)", color: "#9A9A9A" },
    Accepted: { bg: "rgba(74,144,217,0.12)", color: "#4A90D9" },
    "In Transit": { bg: "rgba(245,166,35,0.12)", color: "#F5A623" },
    Delivered: { bg: "rgba(126,211,33,0.12)", color: "#7ED321" },
    Declined: { bg: "#1A0A0A", color: "#F87171" },
  };
  const s = styles[status] ?? { bg: "#1A1A1A", color: "#9A9A9A" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        border: `1px solid ${s.color}22`,
      }}
    >
      {status}
    </span>
  );
}

const CARD_STYLE: React.CSSProperties = {
  background: "#111",
  border: "1px solid #1A1A1A",
  borderRadius: 12,
  padding: 16,
};

const MOVE_FEES: Record<string, number> = {
  Small: 2000,
  Medium: 5000,
  Large: 10000,
};

const GOLD_BTN: React.CSSProperties = {
  background: "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
  color: "#111",
  fontWeight: 600,
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  cursor: "pointer",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const SEC_BTN: React.CSSProperties = {
  background: "#1A1A1A",
  color: "#E8E8E8",
  border: "1px solid #2A2A2A",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  background: "#111",
  border: "1px solid #2A2A2A",
  borderRadius: 8,
  color: "#E8E8E8",
  fontSize: 14,
  padding: "10px 12px",
  width: "100%",
  outline: "none",
};

const SECTION_LABEL: React.CSSProperties = {
  color: "#D4AF37",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 12,
};

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.72)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

const MODAL_CARD: React.CSSProperties = {
  background: "#111",
  border: "1px solid #2A2A2A",
  borderRadius: 16,
  padding: 24,
  width: "100%",
  maxWidth: 480,
  maxHeight: "90vh",
  overflowY: "auto",
  position: "relative",
};

// ─── Geocoding spinner ───────────────────────────────────────────────────────

function GeoSpinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        border: "2px solid rgba(212,175,55,0.3)",
        borderTopColor: "#D4AF37",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ─── Location Search Input ───────────────────────────────────────────────────

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country?: string;
  };
}

interface LocationSearchInputProps {
  value: string;
  onChange: (text: string) => void;
  onSelectResult?: (
    displayName: string,
    coords: { lat: number; lng: number },
    address: { city?: string; country?: string },
  ) => void;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
  "data-ocid"?: string;
}

function LocationSearchInput({
  value,
  onChange,
  onSelectResult,
  placeholder,
  required,
  style,
  "data-ocid": dataOcid,
}: LocationSearchInputProps) {
  const [results, setResults] = useState<NominatimItem[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    onChange(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 3) {
      setOpen(false);
      setResults([]);
      setNoResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setOpen(true);
      setNoResults(false);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data: NominatimItem[] = await res.json();
        setResults(data);
        setNoResults(data.length === 0);
      } catch {
        setResults([]);
        setNoResults(true);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleSelect(item: NominatimItem) {
    const city =
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.county ||
      "";
    const country = item.address?.country || "";
    onChange(item.display_name);
    onSelectResult?.(
      item.display_name,
      { lat: Number.parseFloat(item.lat), lng: Number.parseFloat(item.lon) },
      { city, country },
    );
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          style={{
            ...INPUT_STYLE,
            paddingRight: searching ? 36 : 12,
            ...(style || {}),
          }}
          data-ocid={dataOcid}
          autoComplete="off"
        />
        {searching && (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <GeoSpinner />
          </span>
        )}
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#0D0D0D",
            border: "1px solid #2A2A2A",
            borderRadius: 8,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 500,
          }}
        >
          {noResults ? (
            <div
              style={{
                padding: "10px 12px",
                fontSize: 13,
                color: "#6C6C6C",
              }}
            >
              No locations found
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#E8E8E8",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid #1A1A1A",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(212,175,55,0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                {item.display_name.length > 60
                  ? `${item.display_name.slice(0, 60)}…`
                  : item.display_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Register Route Modal ────────────────────────────────────────────────────

interface RouteForm {
  vehicleType: string;
  departureCity: string;
  departureCountry: string;
  destinationCity: string;
  destinationCountry: string;
  travelDate: string;
  cargoSpace: string;
}

const EMPTY_ROUTE_FORM: RouteForm = {
  vehicleType: "Car",
  departureCity: "",
  departureCountry: "",
  destinationCity: "",
  destinationCountry: "",
  travelDate: "",
  cargoSpace: "Medium",
};

type PinStep = "idle" | "departure" | "destination" | "done";

function RouteModal({
  open,
  onClose,
  onSubmit,
  initial,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: RouteForm) => Promise<void>;
  initial?: RouteForm;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<RouteForm>(initial ?? EMPTY_ROUTE_FORM);
  const [step, setStep] = useState<1 | 2>(1);

  // Map pins state
  const [depPin, setDepPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destPin, setDestPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [pinStep, setPinStep] = useState<PinStep>("departure");
  const [geocodingDep, setGeocodingDep] = useState(false);
  const [geocodingDest, setGeocodingDest] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ?? EMPTY_ROUTE_FORM);
      setStep(1);
      setDepPin(null);
      setDestPin(null);
      setPinStep("departure");
      setGeocodingDep(false);
      setGeocodingDest(false);
    }
  }, [open, initial]);

  function field(key: keyof RouteForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleMapClick(lat: number, lng: number) {
    if (pinStep === "departure") {
      setDepPin({ lat, lng });
      setPinStep("destination");
      setGeocodingDep(true);
      let result: { city: string; country: string } | null = null;
      try {
        result = await reverseGeocode(lat, lng);
      } finally {
        setGeocodingDep(false);
      }
      if (result) {
        setForm((prev) => ({
          ...prev,
          departureCity: result.city || prev.departureCity,
          departureCountry: result.country || prev.departureCountry,
        }));
      }
    } else if (pinStep === "destination") {
      setDestPin({ lat, lng });
      setPinStep("done");
      setGeocodingDest(true);
      let result2: { city: string; country: string } | null = null;
      try {
        result2 = await reverseGeocode(lat, lng);
      } finally {
        setGeocodingDest(false);
      }
      if (result2) {
        setForm((prev) => ({
          ...prev,
          destinationCity: result2.city || prev.destinationCity,
          destinationCountry: result2.country || prev.destinationCountry,
        }));
      }
    }
  }

  const mapMarkers: MapMarker[] = [
    ...(depPin
      ? [
          {
            id: "dep",
            lat: depPin.lat,
            lng: depPin.lng,
            label: form.departureCity || "Departure",
            color: "gold" as const,
          },
        ]
      : []),
    ...(destPin
      ? [
          {
            id: "dest",
            lat: destPin.lat,
            lng: destPin.lng,
            label: form.destinationCity || "Destination",
            color: "red" as const,
          },
        ]
      : []),
  ];

  const mapArcs: MapArc[] =
    depPin && destPin ? [{ from: depPin, to: destPin }] : [];

  const isGeocoding = geocodingDep || geocodingDest;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    await onSubmit(form);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isGeocoding) {
      void onSubmit(form);
    }
  }

  if (!open) return null;

  return (
    <div
      style={OVERLAY}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      data-ocid="move.route_modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22 }}
        style={{
          ...MODAL_CARD,
          maxWidth: step === 2 ? 540 : 480,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flex: 1,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: step === 1 ? "#D4AF37" : "rgba(212,175,55,0.3)",
                color: step === 1 ? "#111" : "#D4AF37",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              1
            </div>
            <span
              style={{
                fontSize: 12,
                color: step === 1 ? "#D4AF37" : "#6C6C6C",
                fontWeight: step === 1 ? 600 : 400,
              }}
            >
              Route Details
            </span>
            <ChevronRight
              size={12}
              style={{ color: "#3A3A3A", margin: "0 2px" }}
            />
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: step === 2 ? "#D4AF37" : "rgba(212,175,55,0.15)",
                color: step === 2 ? "#111" : "#6C6C6C",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              2
            </div>
            <span
              style={{
                fontSize: 12,
                color: step === 2 ? "#D4AF37" : "#6C6C6C",
                fontWeight: step === 2 ? 600 : 400,
              }}
            >
              Pin on Map
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6C6C6C",
              padding: 4,
            }}
            data-ocid="move.route_modal.close_button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Form */}
        {step === 1 && (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <h3
              style={{
                color: "#E8E8E8",
                fontSize: 17,
                fontWeight: 700,
                margin: "0 0 4px",
              }}
            >
              {initial ? "Edit Route" : "Register a Route"}
            </h3>

            {/* Vehicle Type */}
            <div>
              <label
                htmlFor="rm-vehicle"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Vehicle Type
              </label>
              <select
                id="rm-vehicle"
                value={form.vehicleType}
                onChange={(e) => field("vehicleType", e.target.value)}
                style={{ ...INPUT_STYLE }}
                data-ocid="move.route_modal.vehicletype.select"
              >
                {["Car", "Truck", "Plane", "Bicycle", "Ebike"].map((v) => (
                  <option key={v} value={v} style={{ background: "#111" }}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Departure */}
            <div>
              <label
                htmlFor="rm-dep-city-search"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Departure City
              </label>
              <LocationSearchInput
                value={form.departureCity}
                onChange={(text) => field("departureCity", text)}
                onSelectResult={(_displayName, _coords, address) => {
                  if (address.city) field("departureCity", address.city);
                  if (address.country)
                    field("departureCountry", address.country);
                }}
                placeholder="Search departure city…"
                required
                data-ocid="move.route_modal.departure_city.input"
              />
              <input
                placeholder="Country (auto-filled or type manually)"
                value={form.departureCountry}
                onChange={(e) => field("departureCountry", e.target.value)}
                required
                style={{ ...INPUT_STYLE, marginTop: 8 }}
                data-ocid="move.route_modal.departure_country.input"
              />
            </div>

            {/* Destination */}
            <div>
              <label
                htmlFor="rm-dest-city-search"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Destination City
              </label>
              <LocationSearchInput
                value={form.destinationCity}
                onChange={(text) => field("destinationCity", text)}
                onSelectResult={(_displayName, _coords, address) => {
                  if (address.city) field("destinationCity", address.city);
                  if (address.country)
                    field("destinationCountry", address.country);
                }}
                placeholder="Search destination city…"
                required
                data-ocid="move.route_modal.destination_city.input"
              />
              <input
                placeholder="Country (auto-filled or type manually)"
                value={form.destinationCountry}
                onChange={(e) => field("destinationCountry", e.target.value)}
                required
                style={{ ...INPUT_STYLE, marginTop: 8 }}
                data-ocid="move.route_modal.destination_country.input"
              />
            </div>

            {/* Travel Date */}
            <div>
              <label
                htmlFor="rm-travel-date"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Travel Date
              </label>
              <input
                id="rm-travel-date"
                type="date"
                value={form.travelDate}
                onChange={(e) => field("travelDate", e.target.value)}
                required
                style={{ ...INPUT_STYLE, colorScheme: "dark" }}
                data-ocid="move.route_modal.traveldate.input"
              />
            </div>

            {/* Cargo Space */}
            <div>
              <label
                htmlFor="rm-cargo"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Available Cargo Space
              </label>
              <select
                id="rm-cargo"
                value={form.cargoSpace}
                onChange={(e) => field("cargoSpace", e.target.value)}
                style={INPUT_STYLE}
                data-ocid="move.route_modal.cargospace.select"
              >
                {["Small", "Medium", "Large"].map((v) => (
                  <option key={v} value={v} style={{ background: "#111" }}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              style={{
                ...GOLD_BTN,
                width: "100%",
                justifyContent: "center",
                marginTop: 4,
              }}
              data-ocid="move.route_modal.next_button"
            >
              <MapPin size={15} /> Next: Pin on Map →
            </button>
          </form>
        )}

        {/* Step 2: Map */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9A9A9A",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "0 0 0 0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                data-ocid="move.route_modal.back_button"
              >
                ← Back
              </button>
              <h3
                style={{
                  color: "#E8E8E8",
                  fontSize: 17,
                  fontWeight: 700,
                  margin: 0,
                  flex: 1,
                }}
              >
                Pin Your Route
              </h3>
            </div>

            {/* Instruction */}
            <div
              style={{
                background: "rgba(212,175,55,0.07)",
                border: "1px solid rgba(212,175,55,0.18)",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MapPin size={14} style={{ color: "#D4AF37", flexShrink: 0 }} />
              <p
                style={{
                  color: "#D4AF37",
                  fontSize: 12,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {pinStep === "departure"
                  ? "Tap the map to set your departure point"
                  : pinStep === "destination"
                    ? "Now tap to set your destination"
                    : "Both pins placed! You can still edit the fields below."}
              </p>
            </div>

            {/* Map */}
            <MoveMap
              markers={mapMarkers}
              arcs={mapArcs}
              onMapClick={handleMapClick}
              height={300}
              interactive={true}
            />

            {/* Editable preview of geocoded city/country */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {/* Departure */}
              <div>
                <div
                  style={{
                    color: "#9A9A9A",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#D4AF37",
                      flexShrink: 0,
                    }}
                  />
                  Departure
                  {geocodingDep && <GeoSpinner />}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <LocationSearchInput
                    value={form.departureCity}
                    onChange={(text) => field("departureCity", text)}
                    onSelectResult={(_displayName, coords, address) => {
                      if (address.city) field("departureCity", address.city);
                      if (address.country)
                        field("departureCountry", address.country);
                      setDepPin({ lat: coords.lat, lng: coords.lng });
                      if (!destPin) setPinStep("destination");
                      else setPinStep("done");
                    }}
                    placeholder="Search departure city…"
                    style={{ fontSize: 12, padding: "8px 10px" }}
                    data-ocid="move.route_modal.map_departure_city.input"
                  />
                  <input
                    placeholder="Country"
                    value={form.departureCountry}
                    onChange={(e) => field("departureCountry", e.target.value)}
                    style={{
                      ...INPUT_STYLE,
                      fontSize: 12,
                      padding: "8px 10px",
                    }}
                    data-ocid="move.route_modal.map_departure_country.input"
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <div
                  style={{
                    color: "#9A9A9A",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#F87171",
                      flexShrink: 0,
                    }}
                  />
                  Destination
                  {geocodingDest && <GeoSpinner />}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <LocationSearchInput
                    value={form.destinationCity}
                    onChange={(text) => field("destinationCity", text)}
                    onSelectResult={(_displayName, coords, address) => {
                      if (address.city) field("destinationCity", address.city);
                      if (address.country)
                        field("destinationCountry", address.country);
                      setDestPin({ lat: coords.lat, lng: coords.lng });
                      setPinStep("done");
                    }}
                    placeholder="Search destination city…"
                    style={{ fontSize: 12, padding: "8px 10px" }}
                    data-ocid="move.route_modal.map_destination_city.input"
                  />
                  <input
                    placeholder="Country"
                    value={form.destinationCountry}
                    onChange={(e) =>
                      field("destinationCountry", e.target.value)
                    }
                    style={{
                      ...INPUT_STYLE,
                      fontSize: 12,
                      padding: "8px 10px",
                    }}
                    data-ocid="move.route_modal.map_destination_country.input"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={isLoading || isGeocoding}
              style={{
                ...GOLD_BTN,
                width: "100%",
                justifyContent: "center",
                marginTop: 4,
                opacity: isLoading || isGeocoding ? 0.7 : 1,
              }}
              data-ocid="move.route_modal.submit_button"
            >
              {isLoading
                ? "Saving..."
                : isGeocoding
                  ? "Resolving location..."
                  : initial
                    ? "Save Changes"
                    : "Confirm & Register"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Post Package Modal ──────────────────────────────────────────────────────

interface PackageForm {
  pickupLocation: string;
  destinationCity: string;
  destinationCountry: string;
  size: string;
  weightKg: number | "";
  description: string;
}

const EMPTY_PKG_FORM: PackageForm = {
  pickupLocation: "",
  destinationCity: "",
  destinationCountry: "",
  size: "Medium",
  weightKg: "",
  description: "",
};

function PackageModal({
  open,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: PackageForm) => Promise<void>;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<PackageForm>(EMPTY_PKG_FORM);
  const [step, setStep] = useState<1 | 2>(1);
  const [pickupPin, setPickupPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destPin, setDestPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [pinStep, setPinStep] = useState<"pickup" | "destination" | "done">(
    "pickup",
  );
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDest, setGeocodingDest] = useState(false);
  const [actorError, setActorError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_PKG_FORM);
      setStep(1);
      setPickupPin(null);
      setDestPin(null);
      setPinStep("pickup");
      setGeocodingPickup(false);
      setGeocodingDest(false);
      setActorError(null);
    }
  }, [open]);

  function field(key: keyof PackageForm, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleMapClick(lat: number, lng: number) {
    if (pinStep === "pickup") {
      setPickupPin({ lat, lng });
      setPinStep("destination");
      setGeocodingPickup(true);
      let pickupResult: { city: string; country: string } | null = null;
      try {
        pickupResult = await reverseGeocode(lat, lng);
      } finally {
        setGeocodingPickup(false);
      }
      if (pickupResult) {
        setForm((prev) => ({
          ...prev,
          pickupLocation: pickupResult.city
            ? `${pickupResult.city}, ${pickupResult.country}`
            : prev.pickupLocation,
        }));
      }
    } else if (pinStep === "destination") {
      setDestPin({ lat, lng });
      setPinStep("done");
      setGeocodingDest(true);
      let destResult: { city: string; country: string } | null = null;
      try {
        destResult = await reverseGeocode(lat, lng);
      } finally {
        setGeocodingDest(false);
      }
      if (destResult) {
        setForm((prev) => ({
          ...prev,
          destinationCity: destResult.city || prev.destinationCity,
          destinationCountry: destResult.country || prev.destinationCountry,
        }));
      }
    }
  }

  const pkgMapMarkers: MapMarker[] = [
    ...(pickupPin
      ? [
          {
            id: "pickup",
            lat: pickupPin.lat,
            lng: pickupPin.lng,
            label: form.pickupLocation || "Pickup",
            color: "green" as const,
          },
        ]
      : []),
    ...(destPin
      ? [
          {
            id: "dest",
            lat: destPin.lat,
            lng: destPin.lng,
            label: form.destinationCity || "Destination",
            color: "red" as const,
          },
        ]
      : []),
  ];

  const pkgMapArcs: MapArc[] =
    pickupPin && destPin ? [{ from: pickupPin, to: destPin }] : [];

  const isGeocoding = geocodingPickup || geocodingDest;

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  async function handleConfirmPost() {
    await onSubmit(form);
  }

  if (!open) return null;

  return (
    <div
      style={OVERLAY}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      data-ocid="move.package_modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22 }}
        style={{
          ...MODAL_CARD,
          maxWidth: step === 2 ? 540 : 480,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div
            style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: step === 1 ? "#D4AF37" : "rgba(212,175,55,0.3)",
                color: step === 1 ? "#111" : "#D4AF37",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              1
            </div>
            <span
              style={{
                fontSize: 12,
                color: step === 1 ? "#D4AF37" : "#6C6C6C",
                fontWeight: step === 1 ? 600 : 400,
              }}
            >
              Package Details
            </span>
            <ChevronRight
              size={12}
              style={{ color: "#3A3A3A", margin: "0 2px" }}
            />
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: step === 2 ? "#D4AF37" : "rgba(212,175,55,0.15)",
                color: step === 2 ? "#111" : "#6C6C6C",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              2
            </div>
            <span
              style={{
                fontSize: 12,
                color: step === 2 ? "#D4AF37" : "#6C6C6C",
                fontWeight: step === 2 ? 600 : 400,
              }}
            >
              Pin on Map
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6C6C6C",
              padding: 4,
            }}
            data-ocid="move.package_modal.close_button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Form */}
        {step === 1 && (
          <form
            onSubmit={handleStep1Submit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <h3
              style={{
                color: "#E8E8E8",
                fontSize: 17,
                fontWeight: 700,
                margin: "0 0 4px",
              }}
            >
              Post a Package
            </h3>

            {/* Pickup */}
            <div>
              <label
                htmlFor="pm-pickup-search"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Pickup Location
              </label>
              <LocationSearchInput
                value={form.pickupLocation}
                onChange={(text) => field("pickupLocation", text)}
                onSelectResult={(_displayName, coords, address) => {
                  const cityStr = address.city
                    ? `${address.city}${address.country ? `, ${address.country}` : ""}`
                    : _displayName;
                  field("pickupLocation", cityStr);
                  setPickupPin({ lat: coords.lat, lng: coords.lng });
                }}
                placeholder="Search pickup location…"
                required
                data-ocid="move.package_modal.pickup.input"
              />
            </div>

            {/* Destination */}
            <div>
              <label
                htmlFor="pm-dest-city-search"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Destination City
              </label>
              <LocationSearchInput
                value={form.destinationCity}
                onChange={(text) => field("destinationCity", text)}
                onSelectResult={(_displayName, coords, address) => {
                  if (address.city) field("destinationCity", address.city);
                  if (address.country)
                    field("destinationCountry", address.country);
                  setDestPin({ lat: coords.lat, lng: coords.lng });
                }}
                placeholder="Search destination city…"
                required
                data-ocid="move.package_modal.destination_city.input"
              />
              <input
                placeholder="Country (auto-filled or type manually)"
                value={form.destinationCountry}
                onChange={(e) => field("destinationCountry", e.target.value)}
                required
                style={{ ...INPUT_STYLE, marginTop: 8 }}
                data-ocid="move.package_modal.destination_country.input"
              />
            </div>

            {/* Size & Weight */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <label
                  htmlFor="pm-size"
                  style={{
                    color: "#9A9A9A",
                    fontSize: 12,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Package Size
                </label>
                <select
                  id="pm-size"
                  value={form.size}
                  onChange={(e) => field("size", e.target.value)}
                  style={INPUT_STYLE}
                  data-ocid="move.package_modal.size.select"
                >
                  {["Small", "Medium", "Large"].map((v) => (
                    <option key={v} value={v} style={{ background: "#111" }}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="pm-weight"
                  style={{
                    color: "#9A9A9A",
                    fontSize: 12,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Weight (kg)
                </label>
                <input
                  id="pm-weight"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="0.0"
                  value={form.weightKg}
                  onChange={(e) =>
                    field("weightKg", Number.parseFloat(e.target.value) || "")
                  }
                  required
                  style={INPUT_STYLE}
                  data-ocid="move.package_modal.weight.input"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="pm-desc"
                style={{
                  color: "#9A9A9A",
                  fontSize: 12,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Description
              </label>
              <textarea
                id="pm-desc"
                placeholder="Briefly describe the package contents"
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                required
                rows={3}
                style={{ ...INPUT_STYLE, resize: "none" }}
                data-ocid="move.package_modal.description.textarea"
              />
            </div>

            <button
              type="submit"
              style={{
                ...GOLD_BTN,
                width: "100%",
                justifyContent: "center",
                marginTop: 4,
              }}
              data-ocid="move.package_modal.next_button"
            >
              <MapPin size={15} /> Next: Pin on Map →
            </button>
          </form>
        )}

        {/* Step 2: Map */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9A9A9A",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                data-ocid="move.package_modal.back_button"
              >
                ← Back
              </button>
              <h3
                style={{
                  color: "#E8E8E8",
                  fontSize: 17,
                  fontWeight: 700,
                  margin: 0,
                  flex: 1,
                }}
              >
                Pin Locations
              </h3>
            </div>

            {/* Instruction */}
            <div
              style={{
                background: "rgba(212,175,55,0.07)",
                border: "1px solid rgba(212,175,55,0.18)",
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MapPin size={14} style={{ color: "#D4AF37", flexShrink: 0 }} />
              <p
                style={{
                  color: "#D4AF37",
                  fontSize: 12,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {pinStep === "pickup"
                  ? "Tap the map to set your pickup point"
                  : pinStep === "destination"
                    ? "Now tap to set your destination"
                    : "Both pins placed! You can still edit the fields below."}
              </p>
            </div>

            {/* Map */}
            <MoveMap
              markers={pkgMapMarkers}
              arcs={pkgMapArcs}
              onMapClick={handleMapClick}
              height={300}
              interactive={true}
            />

            {/* Editable fields below map */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {/* Pickup */}
              <div>
                <div
                  style={{
                    color: "#9A9A9A",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#4ADE80",
                      flexShrink: 0,
                    }}
                  />
                  Pickup
                  {geocodingPickup && <GeoSpinner />}
                </div>
                <LocationSearchInput
                  value={form.pickupLocation}
                  onChange={(text) => field("pickupLocation", text)}
                  onSelectResult={(_displayName, coords, address) => {
                    const cityStr = address.city
                      ? `${address.city}${address.country ? `, ${address.country}` : ""}`
                      : _displayName;
                    field("pickupLocation", cityStr);
                    setPickupPin({ lat: coords.lat, lng: coords.lng });
                    if (!destPin) setPinStep("destination");
                    else setPinStep("done");
                  }}
                  placeholder="Search pickup…"
                  style={{ fontSize: 12, padding: "8px 10px" }}
                  data-ocid="move.package_modal.map_pickup.input"
                />
              </div>

              {/* Destination */}
              <div>
                <div
                  style={{
                    color: "#9A9A9A",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#F87171",
                      flexShrink: 0,
                    }}
                  />
                  Destination
                  {geocodingDest && <GeoSpinner />}
                </div>
                <LocationSearchInput
                  value={form.destinationCity}
                  onChange={(text) => field("destinationCity", text)}
                  onSelectResult={(_displayName, coords, address) => {
                    if (address.city) field("destinationCity", address.city);
                    if (address.country)
                      field("destinationCountry", address.country);
                    setDestPin({ lat: coords.lat, lng: coords.lng });
                    setPinStep("done");
                  }}
                  placeholder="Search destination…"
                  style={{ fontSize: 12, padding: "8px 10px" }}
                  data-ocid="move.package_modal.map_destination.input"
                />
                <input
                  placeholder="Country"
                  value={form.destinationCountry}
                  onChange={(e) => field("destinationCountry", e.target.value)}
                  style={{
                    ...INPUT_STYLE,
                    fontSize: 12,
                    padding: "8px 10px",
                    marginTop: 6,
                  }}
                  data-ocid="move.package_modal.map_destination_country.input"
                />
              </div>
            </div>

            {/* Actor error */}
            {actorError && (
              <div
                style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#F87171",
                  fontSize: 13,
                }}
                data-ocid="move.package_modal.error_state"
              >
                {actorError}
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmPost}
              disabled={isLoading || isGeocoding}
              style={{
                ...GOLD_BTN,
                width: "100%",
                justifyContent: "center",
                marginTop: 4,
                opacity: isLoading || isGeocoding ? 0.7 : 1,
                cursor: isLoading || isGeocoding ? "not-allowed" : "pointer",
              }}
              data-ocid="move.package_modal.submit_button"
            >
              {isLoading
                ? "Posting..."
                : isGeocoding
                  ? "Geocoding…"
                  : "Confirm & Post Package"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Confirm Delete Modal ────────────────────────────────────────────────────

function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!open) return null;
  return (
    <div
      style={OVERLAY}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      data-ocid="move.delete_modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        style={{ ...MODAL_CARD, maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#1A0A0A",
              border: "1px solid #F87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Trash2 size={20} style={{ color: "#F87171" }} />
          </div>
          <h3
            style={{
              color: "#E8E8E8",
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Delete Route?
          </h3>
          <p style={{ color: "#6C6C6C", fontSize: 13, marginBottom: 24 }}>
            This route and all associated requests will be removed.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...SEC_BTN, flex: 1, justifyContent: "center" }}
              data-ocid="move.delete_modal.cancel_button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                background: "#1A0A0A",
                color: "#F87171",
                border: "1px solid #F87171",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                opacity: isLoading ? 0.7 : 1,
              }}
              data-ocid="move.delete_modal.confirm_button"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delivery Mini Map ───────────────────────────────────────────────────────

function DeliveryMiniMap({
  pickup,
  destination,
}: {
  pickup: string;
  destination: string;
}) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [arcs, setArcs] = useState<MapArc[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pickupCoord, destCoord] = await Promise.all([
        forwardGeocode(pickup),
        forwardGeocode(destination),
      ]);
      if (!mountedRef.current) return;
      const newMarkers: MapMarker[] = [];
      const newArcs: MapArc[] = [];
      if (pickupCoord) {
        newMarkers.push({
          id: "pickup",
          lat: pickupCoord.lat,
          lng: pickupCoord.lng,
          label: pickup,
          color: "green",
        });
      }
      if (destCoord) {
        newMarkers.push({
          id: "dest",
          lat: destCoord.lat,
          lng: destCoord.lng,
          label: destination,
          color: "red",
        });
      }
      if (pickupCoord && destCoord) {
        newArcs.push({ from: pickupCoord, to: destCoord });
      }
      setMarkers(newMarkers);
      setArcs(newArcs);
      setLoading(false);
    }
    void load();
  }, [pickup, destination]);

  if (loading) {
    return (
      <div
        style={{
          height: 160,
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(212,175,55,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GeoSpinner />
      </div>
    );
  }

  return (
    <MoveMap markers={markers} arcs={arcs} height={160} interactive={false} />
  );
}

// ─── Matched Riders Panel ────────────────────────────────────────────────────

// ─── MovePaymentModal ────────────────────────────────────────────────────────

function MovePaymentModal({
  pkg,
  route,
  actor,
  onSuccess,
  onClose,
  displayName,
}: {
  pkg: PackageType;
  route: RiderRoute;
  actor: MoveActor;
  onSuccess: () => void;
  onClose: () => void;
  // ISSUE 10: use real display name for Flutterwave customer
  displayName?: string;
}) {
  const fee = MOVE_FEES[pkg.size] ?? 2000;
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [ngnRate, setNgnRate] = useState<number>(1600);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const scriptLoadedRef = useRef(false);

  // Load Flutterwave script
  useEffect(() => {
    if (scriptLoadedRef.current) return;
    const existing = document.querySelector(
      'script[src="https://checkout.flutterwave.com/v3.js"]',
    );
    if (existing) {
      scriptLoadedRef.current = true;
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
    };
    document.body.appendChild(script);
    return () => {
      // Don't remove — keep cached for subsequent opens
    };
  }, []);

  // Fetch wallet balance and forex rate in parallel
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [balance, marketData] = await Promise.allSettled([
          actor.getWalletBalance("NGN"),
          actor.getMarketData(),
        ]);
        if (balance.status === "fulfilled") {
          setWalletBalance(balance.value);
        } else {
          setWalletBalance(0);
        }
        if (marketData.status === "fulfilled") {
          const ngn = marketData.value.forex.find((f) => f.symbol === "NGN");
          if (ngn && ngn.rate > 0) {
            setNgnRate(ngn.rate);
          }
        }
      } catch {
        setWalletBalance(0);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [actor]);

  function generateTxRef() {
    return `MOVE-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function handleWalletPay() {
    setError(null);
    setPaying(true);
    const ref = generateTxRef();
    const dateStr = new Date().toISOString();
    try {
      const result = await actor.recordMovePayment(
        pkg.packageId,
        route.routeId,
        route.riderPrincipal.toString(),
        fee,
        "NGN",
        ref,
        "wallet",
        dateStr,
      );
      if ("err" in result) {
        setError(result.err);
      } else {
        setSuccess(true);
        setTimeout(() => onSuccess(), 1800);
      }
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  function handleFlutterwavePay() {
    setError(null);
    if (typeof window.FlutterwaveCheckout !== "function") {
      setError("Payment system is loading. Please try again in a moment.");
      return;
    }
    const ref = generateTxRef();
    const dateStr = new Date().toISOString();
    window.FlutterwaveCheckout({
      public_key: "FLWPUBK-811e445867156c0d669a1d1c7876bcb7-X",
      tx_ref: ref,
      amount: fee,
      currency: "NGN",
      customer: {
        email: "user@stancard.app",
        name: displayName || "Stancard User",
      },
      customizations: {
        title: "Stancard Move",
        description: `Delivery fee - ${pkg.packageId}`,
        logo: "",
      },
      callback: async (data) => {
        if (data.status === "successful" || data.status === "completed") {
          setPaying(true);
          try {
            const result = await actor.recordMovePayment(
              pkg.packageId,
              route.routeId,
              route.riderPrincipal.toString(),
              fee,
              "NGN",
              ref,
              "flutterwave",
              dateStr,
            );
            if ("err" in result) {
              setError(result.err);
            } else {
              setSuccess(true);
              setTimeout(() => onSuccess(), 1800);
            }
          } catch {
            setError(
              `Failed to record payment. Contact support with ref: ${ref}`,
            );
          } finally {
            setPaying(false);
          }
        } else {
          setError(
            "Payment was cancelled. Please try again or choose a different payment method.",
          );
        }
      },
      onclose: () => {
        // User closed without completing — stay on modal
      },
    });
  }

  const canPayFromWallet = walletBalance !== null && walletBalance >= fee;
  const usdEquiv = (fee / ngnRate).toFixed(2);

  if (success) {
    return (
      <div style={OVERLAY} role="presentation">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ ...MODAL_CARD, maxWidth: 400, textAlign: "center" }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3
            style={{
              color: "#D4AF37",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Payment Successful
          </h3>
          <p style={{ color: "#9A9A9A", fontSize: 14 }}>
            Your delivery request has been sent to the rider.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={OVERLAY}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      data-ocid="move.payment_modal"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.22 }}
        style={{ ...MODAL_CARD, maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <h3
              style={{
                color: "#E8E8E8",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Delivery Fee
            </h3>
            <p style={{ color: "#6C6C6C", fontSize: 12, marginTop: 4 }}>
              Complete payment to send your request
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6C6C6C",
              padding: 4,
            }}
            data-ocid="move.payment_modal.close_button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Fee Summary Card */}
        <div
          style={{
            background: "#0A0A0A",
            border: "1px solid #2A2A2A",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <p
                style={{
                  color: "#6C6C6C",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  margin: 0,
                }}
              >
                Package Size
              </p>
              <p
                style={{
                  color: "#D4AF37",
                  fontSize: 16,
                  fontWeight: 700,
                  margin: "4px 0 0",
                }}
              >
                {pkg.size}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  color: "#6C6C6C",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  margin: 0,
                }}
              >
                Rider
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                  justifyContent: "flex-end",
                }}
              >
                <span style={{ color: "#D4AF37" }}>
                  {vehicleIcon(route.vehicleType, 14)}
                </span>
                <p
                  style={{
                    color: "#E8E8E8",
                    fontSize: 14,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {route.vehicleType}
                </p>
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #2A2A2A",
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div>
              <p style={{ color: "#6C6C6C", fontSize: 11, margin: 0 }}>
                Delivery Fee
              </p>
              <p
                style={{
                  color: "#F2D37A",
                  fontSize: 26,
                  fontWeight: 800,
                  margin: "2px 0 0",
                  letterSpacing: "-0.02em",
                }}
              >
                ₦{fee.toLocaleString()}
              </p>
            </div>
            <p style={{ color: "#6C6C6C", fontSize: 13, margin: 0 }}>
              ≈ ${usdEquiv} USD
            </p>
          </div>
          <p
            style={{
              color: "#6C6C6C",
              fontSize: 11,
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            {route.departureCity} → {route.destinationCity} · {route.travelDate}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              color: "#F87171",
              fontSize: 13,
            }}
            data-ocid="move.payment_modal.error_state"
          >
            {error}
          </div>
        )}

        {/* Payment Buttons */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton
              style={{ height: 44, borderRadius: 8, background: "#1A1A1A" }}
            />
            <Skeleton
              style={{ height: 44, borderRadius: 8, background: "#1A1A1A" }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {canPayFromWallet && (
              <button
                type="button"
                onClick={handleWalletPay}
                disabled={paying}
                style={{
                  ...GOLD_BTN,
                  width: "100%",
                  justifyContent: "center",
                  padding: "12px 18px",
                  fontSize: 14,
                  opacity: paying ? 0.7 : 1,
                }}
                data-ocid="move.payment_modal.wallet_button"
              >
                {paying
                  ? "Processing..."
                  : `Pay from Wallet (₦${fee.toLocaleString()})`}
              </button>
            )}
            <button
              type="button"
              onClick={handleFlutterwavePay}
              disabled={paying}
              style={{
                background: "transparent",
                border: "1px solid #D4AF37",
                color: "#D4AF37",
                borderRadius: 8,
                padding: "12px 18px",
                cursor: paying ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: paying ? 0.7 : 1,
              }}
              data-ocid="move.payment_modal.flutterwave_button"
            >
              Pay via Flutterwave
            </button>
            {canPayFromWallet && (
              <p
                style={{
                  color: "#6C6C6C",
                  fontSize: 11,
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Wallet balance: ₦
                {walletBalance !== null ? walletBalance.toLocaleString() : "—"}
              </p>
            )}
            {!canPayFromWallet && walletBalance !== null && (
              <p
                style={{
                  color: "#6C6C6C",
                  fontSize: 11,
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Insufficient wallet balance (₦{walletBalance.toLocaleString()})
                — use Flutterwave
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function MatchedRidersPanel({
  pkg,
  actor,
  senderRequests,
  onRequestSent,
  onClose,
  displayName,
}: {
  pkg: PackageType;
  actor: MoveActor;
  senderRequests: DeliveryRequest[];
  onRequestSent: () => void;
  onClose: () => void;
  displayName?: string;
}) {
  const [riders, setRiders] = useState<RiderRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentRoute, setPaymentRoute] = useState<RiderRoute | null>(null);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [mapArcs, setMapArcs] = useState<MapArc[]>([]);
  const [highlightedRouteId, setHighlightedRouteId] = useState<string | null>(
    null,
  );
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await actor.getMatchedRiders(
          pkg.destinationCity,
          pkg.destinationCountry,
        );
        setRiders(data);

        // Geocode all rider routes for map
        const geocodeResults = await Promise.allSettled(
          data.map(async (route) => {
            const [depCoord, destCoord] = await Promise.all([
              forwardGeocode(
                `${route.departureCity}, ${route.departureCountry}`,
              ),
              forwardGeocode(
                `${route.destinationCity}, ${route.destinationCountry}`,
              ),
            ]);
            return { route, depCoord, destCoord };
          }),
        );

        const newMarkers: MapMarker[] = [];
        const newArcs: MapArc[] = [];

        for (const result of geocodeResults) {
          if (result.status !== "fulfilled") continue;
          const { route, depCoord, destCoord } = result.value;
          if (destCoord) {
            newMarkers.push({
              id: route.routeId,
              lat: destCoord.lat,
              lng: destCoord.lng,
              label: `${route.vehicleType} → ${route.destinationCity}`,
              color: "gold",
            });
          }
          if (depCoord && destCoord) {
            newArcs.push({ from: depCoord, to: destCoord });
          }
        }

        setMapMarkers(newMarkers);
        setMapArcs(newArcs);
      } catch {
        toast.error("Failed to load matched riders");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [actor, pkg.destinationCity, pkg.destinationCountry]);

  function handleRequest(route: RiderRoute) {
    setPaymentRoute(route);
  }

  // Check if a request already sent to a rider for this package
  function getRequestStatus(routeId: string): string | null {
    const req = senderRequests.find(
      (r) => r.packageId === pkg.packageId && r.routeId === routeId,
    );
    return req ? req.status : null;
  }

  function handleMarkerClick(routeId: string) {
    setHighlightedRouteId(routeId);
    const el = cardRefs.current.get(routeId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  return (
    <>
      <div
        style={OVERLAY}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="presentation"
        data-ocid="move.matched_riders_panel"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22 }}
          style={{ ...MODAL_CARD, maxWidth: 540 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div>
              <h3
                style={{
                  color: "#E8E8E8",
                  fontSize: 17,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Matched Riders
              </h3>
              <p style={{ color: "#6C6C6C", fontSize: 12, marginTop: 2 }}>
                {pkg.destinationCity}, {pkg.destinationCountry}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6C6C6C",
                padding: 4,
              }}
              data-ocid="move.matched_riders_panel.close_button"
            >
              <X size={20} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton
                style={{
                  height: 220,
                  borderRadius: 12,
                  background: "#1A1A1A",
                  marginBottom: 4,
                }}
              />
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  style={{
                    height: 80,
                    borderRadius: 10,
                    background: "#1A1A1A",
                  }}
                />
              ))}
            </div>
          ) : riders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Route
                size={32}
                style={{ color: "#D4AF37", margin: "0 auto 12px" }}
              />
              <p style={{ color: "#9A9A9A", fontSize: 14 }}>
                No riders going to this destination yet.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Map above cards */}
              {mapMarkers.length > 0 && (
                <MoveMap
                  markers={mapMarkers}
                  arcs={mapArcs}
                  onMarkerClick={handleMarkerClick}
                  height={220}
                  interactive={true}
                />
              )}

              {/* Rider cards */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {riders.map((route, i) => {
                  const reqStatus = getRequestStatus(route.routeId);
                  const isHighlighted = highlightedRouteId === route.routeId;
                  return (
                    <div
                      key={route.routeId}
                      ref={(el) => {
                        if (el) cardRefs.current.set(route.routeId, el);
                      }}
                      style={{
                        ...CARD_STYLE,
                        border: isHighlighted
                          ? "1px solid #D4AF37"
                          : "1px solid #1A1A1A",
                        transition: "border-color 0.2s ease",
                      }}
                      data-ocid={`move.matched_rider.item.${i + 1}`}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "#1A1A1A",
                            border: "1px solid #2A2A2A",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#D4AF37",
                            flexShrink: 0,
                          }}
                        >
                          {vehicleIcon(route.vehicleType, 16)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              color: "#E8E8E8",
                              fontSize: 13,
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {route.departureCity} → {route.destinationCity}
                          </div>
                          <div
                            style={{
                              color: "#6C6C6C",
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {route.departureCountry} →{" "}
                            {route.destinationCountry}
                          </div>
                        </div>
                        <span
                          style={{
                            background: "#1A1A1A",
                            color: "#D4AF37",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {route.cargoSpace}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6C6C6C", fontSize: 12 }}>
                          📅 {route.travelDate}
                        </span>
                        {reqStatus ? (
                          statusBadge(reqStatus)
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRequest(route)}
                            style={{
                              ...GOLD_BTN,
                              padding: "7px 14px",
                              fontSize: 13,
                            }}
                            data-ocid={`move.matched_rider.request_button.${i + 1}`}
                          >
                            Request Rider
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
      {paymentRoute && (
        <AnimatePresence>
          <MovePaymentModal
            pkg={pkg}
            route={paymentRoute}
            actor={actor}
            onSuccess={() => {
              setPaymentRoute(null);
              onRequestSent();
            }}
            onClose={() => setPaymentRoute(null)}
            displayName={displayName}
          />
        </AnimatePresence>
      )}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MoveScreen({
  identity,
  actor,
  onTrackShipment,
  displayName,
}: MoveScreenProps) {
  const isLoggedIn = identity !== null && identity !== undefined;
  const [role, setRole] = useState<Role>("rider");

  // Rider state
  const [riderRoutes, setRiderRoutes] = useState<RiderRoute[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<
    RequestWithPackage[]
  >([]);
  const [acceptedDeliveries, setAcceptedDeliveries] = useState<
    AcceptedDeliveryWithTracking[]
  >([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Sender state
  const [senderPackages, setSenderPackages] = useState<PackageType[]>([]);
  const [senderRequests, setSenderRequests] = useState<DeliveryRequest[]>([]);
  const [senderTrackings, setSenderTrackings] = useState<ShipmentTracking[]>(
    [],
  );
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Browse state
  const [allRoutes, setAllRoutes] = useState<RiderRoute[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(true);

  // Modal state
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RiderRoute | null>(null);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [matchingPkg, setMatchingPkg] = useState<PackageType | null>(null);

  // Loading state for actions
  const [routeModalLoading, setRouteModalLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pkgModalLoading, setPkgModalLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load browse routes on mount (always)
  useEffect(() => {
    if (!actor) return;
    void loadAllRoutes();
  }, [actor]);

  // Load rider data when logged in
  useEffect(() => {
    if (!actor || !isLoggedIn) return;
    void loadRiderData();
    void loadSenderData();
  }, [actor, isLoggedIn]);

  async function loadAllRoutes() {
    if (!actor) return;
    setLoadingBrowse(true);
    try {
      const data = await actor.getAllRoutes();
      if (mountedRef.current) setAllRoutes(data);
    } catch {
      // silent fail for browse
    } finally {
      if (mountedRef.current) setLoadingBrowse(false);
    }
  }

  async function loadRiderData() {
    if (!actor) return;
    setLoadingRoutes(true);
    setLoadingRequests(true);
    try {
      const [routes, requests, accepted] = await Promise.all([
        actor.getRiderRoutes(),
        actor.getIncomingRequests(),
        actor.getAcceptedDeliveriesWithTracking(),
      ]);
      if (mountedRef.current) {
        setRiderRoutes(routes);
        setIncomingRequests(requests);
        setAcceptedDeliveries(accepted);
      }
    } catch {
      toast.error("Failed to load rider data");
    } finally {
      if (mountedRef.current) {
        setLoadingRoutes(false);
        setLoadingRequests(false);
      }
    }
  }

  async function loadSenderData() {
    if (!actor) return;
    setLoadingPackages(true);
    try {
      const [pkgs, requests, trackings] = await Promise.all([
        actor.getSenderPackages(),
        actor.getSenderRequests(),
        actor.getSenderTrackings(),
      ]);
      if (mountedRef.current) {
        setSenderPackages(pkgs);
        setSenderRequests(requests);
        setSenderTrackings(trackings);
      }
    } catch {
      toast.error("Failed to load sender data");
    } finally {
      if (mountedRef.current) setLoadingPackages(false);
    }
  }

  async function handleUpdateStatus(requestId: string, newStatus: string) {
    if (!actor) return;
    setUpdatingStatusId(requestId);
    try {
      const result = await actor.updateShipmentStatus(requestId, newStatus);
      if ("err" in result) {
        toast.error(result.err);
      } else {
        toast.success(`Marked as ${newStatus}`);
        await loadRiderData();
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleRegisterRoute(form: RouteForm) {
    if (!actor) {
      toast.error("Unable to connect. Please try again in a moment.");
      return;
    }
    setRouteModalLoading(true);
    try {
      const result = editingRoute
        ? await actor.updateRoute(
            editingRoute.routeId,
            form.vehicleType,
            form.departureCity,
            form.departureCountry,
            form.destinationCity,
            form.destinationCountry,
            form.travelDate,
            form.cargoSpace,
          )
        : await actor.registerRoute(
            form.vehicleType,
            form.departureCity,
            form.departureCountry,
            form.destinationCity,
            form.destinationCountry,
            form.travelDate,
            form.cargoSpace,
          );
      if ("err" in result) {
        toast.error(result.err);
      } else {
        toast.success(editingRoute ? "Route updated!" : "Route registered!");
        setShowRouteModal(false);
        setEditingRoute(null);
        await Promise.all([loadRiderData(), loadAllRoutes()]);
      }
    } catch {
      toast.error("Failed to save route");
    } finally {
      setRouteModalLoading(false);
    }
  }

  async function handleDeleteRoute() {
    if (!actor || !deletingRouteId) return;
    setDeleteLoading(true);
    try {
      const result = await actor.deleteRoute(deletingRouteId);
      if ("err" in result) {
        toast.error(result.err);
      } else {
        toast.success("Route deleted");
        setDeletingRouteId(null);
        await Promise.all([loadRiderData(), loadAllRoutes()]);
      }
    } catch {
      toast.error("Failed to delete route");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handlePostPackage(form: PackageForm) {
    if (!actor) {
      toast.error(
        "Unable to connect. Please check your connection and try again.",
      );
      return;
    }
    setPkgModalLoading(true);
    try {
      const result = await actor.postPackage(
        form.pickupLocation,
        form.destinationCity,
        form.destinationCountry,
        form.size,
        Number(form.weightKg),
        form.description,
      );
      if ("err" in result) {
        toast.error(result.err);
      } else {
        toast.success("Package posted!");
        setShowPkgModal(false);
        await loadSenderData();
      }
    } catch {
      toast.error("Failed to post package");
    } finally {
      setPkgModalLoading(false);
    }
  }

  async function handleRespond(requestId: string, accept: boolean) {
    if (!actor) return;
    setRespondingId(requestId);
    try {
      const result = await actor.respondToRequest(requestId, accept);
      if ("err" in result) {
        toast.error(result.err);
      } else {
        toast.success(accept ? "Request accepted!" : "Request declined");
        await loadRiderData();
      }
    } catch {
      toast.error("Failed to respond to request");
    } finally {
      setRespondingId(null);
    }
  }

  function guardAction(action: () => void) {
    if (!isLoggedIn) {
      toast.error("Sign in to continue", {
        description: "Log in via the Profile tab.",
      });
      return;
    }
    action();
  }

  // ── Rider view ─────────────────────────────────────────────────────────────

  const riderView = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header action */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => guardAction(() => setShowRouteModal(true))}
          style={GOLD_BTN}
          data-ocid="move.rider.register_route.button"
        >
          <Plus size={16} /> Register a Route
        </button>
      </div>

      {/* My Routes */}
      <section data-ocid="move.rider.routes.section">
        <p style={SECTION_LABEL}>My Routes</p>
        {loadingRoutes ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2].map((i) => (
              <Skeleton
                key={i}
                style={{ height: 90, borderRadius: 12, background: "#1A1A1A" }}
              />
            ))}
          </div>
        ) : !isLoggedIn ? (
          <div
            style={{ ...CARD_STYLE, textAlign: "center", padding: 32 }}
            data-ocid="move.rider.routes.empty_state"
          >
            <Route
              size={28}
              style={{ color: "#D4AF37", margin: "0 auto 10px" }}
            />
            <p style={{ color: "#6C6C6C", fontSize: 13 }}>
              Sign in to manage your routes
            </p>
          </div>
        ) : riderRoutes.length === 0 ? (
          <div
            style={{ ...CARD_STYLE, textAlign: "center", padding: 32 }}
            data-ocid="move.rider.routes.empty_state"
          >
            <Route
              size={28}
              style={{ color: "#D4AF37", margin: "0 auto 10px" }}
            />
            <p style={{ color: "#6C6C6C", fontSize: 13 }}>
              No active routes yet. Register your first route!
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
            data-ocid="move.rider.routes.list"
          >
            {riderRoutes.map((route, i) => (
              <motion.div
                key={route.routeId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={CARD_STYLE}
                data-ocid={`move.rider.route.item.${i + 1}`}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: "#1A1A1A",
                      border: "1px solid #2A2A2A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#D4AF37",
                      flexShrink: 0,
                    }}
                  >
                    {vehicleIcon(route.vehicleType, 18)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "#E8E8E8",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {route.departureCity}, {route.departureCountry}
                      <ChevronRight
                        size={12}
                        style={{
                          display: "inline",
                          margin: "0 4px",
                          color: "#D4AF37",
                        }}
                      />
                      {route.destinationCity}, {route.destinationCountry}
                    </div>
                    <div
                      style={{ color: "#6C6C6C", fontSize: 12, marginTop: 3 }}
                    >
                      {route.vehicleType} · 📅 {route.travelDate}
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#1A1A1A",
                      color: "#D4AF37",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {route.cargoSpace}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoute(route);
                      setShowRouteModal(true);
                    }}
                    style={SEC_BTN}
                    data-ocid={`move.rider.route.edit_button.${i + 1}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingRouteId(route.routeId)}
                    style={{
                      ...SEC_BTN,
                      color: "#F87171",
                      borderColor: "#F87171",
                      background: "#1A0A0A",
                    }}
                    data-ocid={`move.rider.route.delete_button.${i + 1}`}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Incoming Requests */}
      {isLoggedIn && (
        <section data-ocid="move.rider.incoming_requests.section">
          <p style={SECTION_LABEL}>Incoming Requests</p>
          {loadingRequests ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2].map((i) => (
                <Skeleton
                  key={i}
                  style={{
                    height: 120,
                    borderRadius: 12,
                    background: "#1A1A1A",
                  }}
                />
              ))}
            </div>
          ) : incomingRequests.filter((r) => r.status === "Pending").length ===
            0 ? (
            <div
              style={{ ...CARD_STYLE, textAlign: "center", padding: 24 }}
              data-ocid="move.rider.incoming_requests.empty_state"
            >
              <Package
                size={24}
                style={{ color: "#D4AF37", margin: "0 auto 10px" }}
              />
              <p style={{ color: "#6C6C6C", fontSize: 13 }}>
                No pending delivery requests
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {incomingRequests
                .filter((r) => r.status === "Pending")
                .map((req, i) => (
                  <motion.div
                    key={req.requestId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={CARD_STYLE}
                    data-ocid={`move.rider.incoming_request.item.${i + 1}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#E8E8E8",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 2,
                          }}
                        >
                          {req.destinationCity}, {req.destinationCountry}
                        </div>
                        <div style={{ color: "#6C6C6C", fontSize: 12 }}>
                          From: {req.pickupLocation}
                        </div>
                      </div>
                      <span
                        style={{
                          background: "#1A1A1A",
                          color: "#D4AF37",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {req.size}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: "#9A9A9A", fontSize: 12 }}>
                        ⚖️ {req.weightKg} kg
                      </span>
                      <span
                        style={{
                          color: "#9A9A9A",
                          fontSize: 12,
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        📦 {req.description}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#5A5A5A",
                        fontSize: 11,
                        marginBottom: 12,
                      }}
                    >
                      Sender:{" "}
                      {truncatePrincipal(req.senderPrincipal.toString())}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleRespond(req.requestId, false)}
                        disabled={respondingId === req.requestId}
                        style={{
                          ...SEC_BTN,
                          flex: 1,
                          justifyContent: "center",
                          opacity: respondingId === req.requestId ? 0.6 : 1,
                        }}
                        data-ocid={`move.rider.incoming_request.decline_button.${i + 1}`}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespond(req.requestId, true)}
                        disabled={respondingId === req.requestId}
                        style={{
                          ...GOLD_BTN,
                          flex: 1,
                          justifyContent: "center",
                          opacity: respondingId === req.requestId ? 0.6 : 1,
                        }}
                        data-ocid={`move.rider.incoming_request.accept_button.${i + 1}`}
                      >
                        {respondingId === req.requestId ? "..." : "Accept"}
                      </button>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Accepted Deliveries */}
      {isLoggedIn && acceptedDeliveries.length > 0 && (
        <section data-ocid="move.rider.accepted_deliveries.section">
          <p style={SECTION_LABEL}>Accepted Deliveries</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {acceptedDeliveries.map((d, i) => {
              // Cross-reference with incomingRequests for full details
              const fullReq = incomingRequests.find(
                (r) => r.requestId === d.requestId,
              );
              // Cross-reference with riderRoutes for route departure/destination
              const route = riderRoutes.find((r) => r.routeId === d.routeId);
              const pickupStr = fullReq
                ? fullReq.pickupLocation
                : route
                  ? `${route.departureCity}, ${route.departureCountry}`
                  : null;
              const destStr = fullReq
                ? `${fullReq.destinationCity}, ${fullReq.destinationCountry}`
                : route
                  ? `${route.destinationCity}, ${route.destinationCountry}`
                  : null;
              const isUpdating = updatingStatusId === d.requestId;
              const trackingStatus =
                d.trackingEntries.length > 0
                  ? d.trackingEntries[d.trackingEntries.length - 1].status
                  : d.status;
              return (
                <motion.div
                  key={d.requestId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={CARD_STYLE}
                  data-ocid={`move.rider.accepted_delivery.item.${i + 1}`}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#E8E8E8",
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        Package #{d.packageId.slice(-6)}
                      </div>
                      <div
                        style={{
                          color: "#6C6C6C",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        Sender:{" "}
                        {truncatePrincipal(d.senderPrincipal.toString())}
                      </div>
                      {/* Tracking code */}
                      {d.trackingCode && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          <span
                            style={{
                              color: "#D4AF37",
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: "monospace",
                              letterSpacing: "0.06em",
                              background: "rgba(212,175,55,0.08)",
                              border: "1px solid rgba(212,175,55,0.2)",
                              borderRadius: 6,
                              padding: "2px 8px",
                            }}
                          >
                            {d.trackingCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard
                                .writeText(d.trackingCode)
                                .then(() => {
                                  toast.success("Tracking code copied!");
                                })
                                .catch(() => toast.error("Failed to copy"));
                            }}
                            style={{
                              background: "none",
                              border: "1px solid #2A2A2A",
                              borderRadius: 5,
                              cursor: "pointer",
                              color: "#9A9A9A",
                              padding: "2px 6px",
                              fontSize: 11,
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                            data-ocid={`move.rider.accepted_delivery.copy_tracking.${i + 1}`}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                              role="presentation"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 6,
                        flexShrink: 0,
                        marginLeft: 10,
                      }}
                    >
                      {trackingStatusBadge(trackingStatus)}
                      <PackageCheck size={14} style={{ color: "#4ADE80" }} />
                    </div>
                  </div>

                  {pickupStr && destStr && (
                    <div style={{ marginBottom: 12 }}>
                      <DeliveryMiniMap
                        pickup={pickupStr}
                        destination={destStr}
                      />
                    </div>
                  )}

                  {/* Contextual status action button */}
                  {trackingStatus === "Accepted" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(d.requestId, "In Transit")
                      }
                      disabled={isUpdating}
                      style={{
                        ...GOLD_BTN,
                        width: "100%",
                        justifyContent: "center",
                        opacity: isUpdating ? 0.7 : 1,
                        fontSize: 13,
                        padding: "9px 16px",
                      }}
                      data-ocid={`move.rider.accepted_delivery.mark_in_transit.${i + 1}`}
                    >
                      {isUpdating ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              border: "2px solid rgba(0,0,0,0.3)",
                              borderTopColor: "#111",
                              borderRadius: "50%",
                              animation: "spin 0.7s linear infinite",
                              display: "inline-block",
                            }}
                          />
                          Updating...
                        </span>
                      ) : (
                        "🚚 Mark as In Transit"
                      )}
                    </button>
                  )}
                  {trackingStatus === "In Transit" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(d.requestId, "Delivered")
                      }
                      disabled={isUpdating}
                      style={{
                        ...GOLD_BTN,
                        width: "100%",
                        justifyContent: "center",
                        opacity: isUpdating ? 0.7 : 1,
                        fontSize: 13,
                        padding: "9px 16px",
                        background:
                          "linear-gradient(135deg, #84E080 0%, #5CB85C 100%)",
                        color: "#fff",
                      }}
                      data-ocid={`move.rider.accepted_delivery.mark_delivered.${i + 1}`}
                    >
                      {isUpdating ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTopColor: "#fff",
                              borderRadius: "50%",
                              animation: "spin 0.7s linear infinite",
                              display: "inline-block",
                            }}
                          />
                          Updating...
                        </span>
                      ) : (
                        "✅ Mark as Delivered"
                      )}
                    </button>
                  )}
                  {trackingStatus === "Delivered" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        background: "rgba(126,211,33,0.08)",
                        border: "1px solid rgba(126,211,33,0.2)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: "#7ED321",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      ✅ Delivered
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );

  // ── Sender view ─────────────────────────────────────────────────────────────

  const senderView = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header action */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => guardAction(() => setShowPkgModal(true))}
          style={GOLD_BTN}
          data-ocid="move.sender.post_package.button"
        >
          <Plus size={16} /> Post a Package
        </button>
      </div>

      {/* My Packages */}
      <section data-ocid="move.sender.packages.section">
        <p style={SECTION_LABEL}>My Packages</p>
        {loadingPackages ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2].map((i) => (
              <Skeleton
                key={i}
                style={{ height: 100, borderRadius: 12, background: "#1A1A1A" }}
              />
            ))}
          </div>
        ) : !isLoggedIn ? (
          <div
            style={{ ...CARD_STYLE, textAlign: "center", padding: 32 }}
            data-ocid="move.sender.packages.empty_state"
          >
            <Package
              size={28}
              style={{ color: "#D4AF37", margin: "0 auto 10px" }}
            />
            <p style={{ color: "#6C6C6C", fontSize: 13 }}>
              Sign in to manage your packages
            </p>
          </div>
        ) : senderPackages.length === 0 ? (
          <div
            style={{ ...CARD_STYLE, textAlign: "center", padding: 32 }}
            data-ocid="move.sender.packages.empty_state"
          >
            <Package
              size={28}
              style={{ color: "#D4AF37", margin: "0 auto 10px" }}
            />
            <p style={{ color: "#6C6C6C", fontSize: 13 }}>
              No packages posted yet. Post your first package!
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
            data-ocid="move.sender.packages.list"
          >
            {senderPackages.map((pkg, i) => {
              const pkgRequests = senderRequests.filter(
                (r) => r.packageId === pkg.packageId,
              );
              // Find accepted request for mini map and tracking
              const acceptedReq = pkgRequests.find(
                (r) =>
                  r.status === "Accepted" ||
                  r.status === "In Transit" ||
                  r.status === "Delivered",
              );
              // Find tracking for this package
              const pkgTracking = acceptedReq
                ? senderTrackings.find(
                    (t) => t.requestId === acceptedReq.requestId,
                  )
                : null;
              return (
                <motion.div
                  key={pkg.packageId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={CARD_STYLE}
                  data-ocid={`move.sender.package.item.${i + 1}`}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#E8E8E8",
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 3,
                        }}
                      >
                        {pkg.destinationCity}, {pkg.destinationCountry}
                      </div>
                      <div style={{ color: "#6C6C6C", fontSize: 12 }}>
                        From: {pkg.pickupLocation}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span
                        style={{
                          background: "#1A1A1A",
                          color: "#D4AF37",
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {pkg.size}
                      </span>
                      <span
                        style={{
                          color: "#9A9A9A",
                          fontSize: 12,
                          paddingTop: 3,
                        }}
                      >
                        {pkg.weightKg} kg
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      color: "#6C6C6C",
                      fontSize: 12,
                      marginBottom: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pkg.description}
                  </div>

                  {/* Tracking code + Track Shipment button */}
                  {pkgTracking && (
                    <div
                      style={{
                        background: "rgba(212,175,55,0.05)",
                        border: "1px solid rgba(212,175,55,0.15)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            color: "#D4AF37",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {pkgTracking.trackingCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(pkgTracking.trackingCode)
                              .then(() => {
                                toast.success("Tracking code copied!");
                              })
                              .catch(() => toast.error("Failed to copy"));
                          }}
                          style={{
                            background: "none",
                            border: "1px solid #2A2A2A",
                            borderRadius: 5,
                            cursor: "pointer",
                            color: "#9A9A9A",
                            padding: "2px 6px",
                            fontSize: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                          data-ocid={`move.sender.tracking.copy.${i + 1}`}
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                            role="presentation"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {trackingStatusBadge(pkgTracking.currentStatus)}
                        <button
                          type="button"
                          onClick={() =>
                            onTrackShipment?.(pkgTracking.trackingCode)
                          }
                          style={{
                            background: "rgba(212,175,55,0.1)",
                            border: "1px solid rgba(212,175,55,0.25)",
                            borderRadius: 6,
                            color: "#D4AF37",
                            cursor: "pointer",
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          data-ocid={`move.sender.track_shipment.${i + 1}`}
                        >
                          📍 Track Shipment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Request statuses */}
                  {pkgRequests.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      {pkgRequests.map((req) => (
                        <div
                          key={req.requestId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: "#5A5A5A", fontSize: 12 }}>
                            Rider:{" "}
                            {truncatePrincipal(req.riderPrincipal.toString())}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            {pkgTracking
                              ? trackingStatusBadge(pkgTracking.currentStatus)
                              : statusBadge(req.status)}
                            {req.status === "Declined" && (
                              <button
                                type="button"
                                onClick={() => setMatchingPkg(pkg)}
                                style={{
                                  ...SEC_BTN,
                                  padding: "4px 10px",
                                  fontSize: 11,
                                }}
                                data-ocid={`move.sender.request_another_rider.button.${i + 1}`}
                              >
                                Request Another
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mini map for accepted delivery */}
                  {acceptedReq && (
                    <div style={{ marginBottom: 12 }}>
                      <DeliveryMiniMap
                        pickup={pkg.pickupLocation}
                        destination={`${pkg.destinationCity}, ${pkg.destinationCountry}`}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => guardAction(() => setMatchingPkg(pkg))}
                    style={{
                      ...SEC_BTN,
                      width: "100%",
                      justifyContent: "center",
                    }}
                    data-ocid={`move.sender.find_riders.button.${i + 1}`}
                  >
                    <Route size={14} /> Find Riders
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );

  // ── Browse Section ──────────────────────────────────────────────────────────

  const browseSection = (
    <section style={{ marginTop: 32 }} data-ocid="move.browse.section">
      <p style={SECTION_LABEL}>Browse Available Riders</p>
      {loadingBrowse ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 10,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              style={{ height: 90, borderRadius: 12, background: "#1A1A1A" }}
            />
          ))}
        </div>
      ) : allRoutes.length === 0 ? (
        <div
          style={{ ...CARD_STYLE, textAlign: "center", padding: 40 }}
          data-ocid="move.browse.empty_state"
        >
          <Route
            size={32}
            style={{ color: "#D4AF37", margin: "0 auto 12px" }}
          />
          <p style={{ color: "#9A9A9A", fontSize: 14 }}>
            No riders registered yet. Be the first to add a route!
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 10,
          }}
        >
          {allRoutes.map((route, i) => (
            <motion.div
              key={route.routeId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={CARD_STYLE}
              data-ocid={`move.browse.route.item.${i + 1}`}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "#1A1A1A",
                    border: "1px solid #2A2A2A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#D4AF37",
                    flexShrink: 0,
                  }}
                >
                  {vehicleIcon(route.vehicleType, 15)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#E8E8E8",
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {route.departureCity} → {route.destinationCity}
                  </div>
                  <div style={{ color: "#6C6C6C", fontSize: 11, marginTop: 2 }}>
                    {route.departureCountry} → {route.destinationCountry}
                  </div>
                </div>
                <span
                  style={{
                    background: "#1A1A1A",
                    color: "#D4AF37",
                    borderRadius: 6,
                    padding: "2px 7px",
                    fontSize: 10,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {route.cargoSpace}
                </span>
              </div>
              <div style={{ color: "#6C6C6C", fontSize: 11, marginBottom: 10 }}>
                {route.vehicleType} · 📅 {route.travelDate}
              </div>
              {/* ISSUE 16: Request Rider button on browse cards */}
              <button
                type="button"
                data-ocid={`move.browse.request_button.${i + 1}`}
                onClick={() => {
                  if (!isLoggedIn) {
                    toast.error("Sign in to send a delivery request");
                    return;
                  }
                  if (senderPackages.length === 0) {
                    toast.error(
                      "Post a package first to send a delivery request",
                    );
                    return;
                  }
                  // Open payment modal for first available package + this route
                  setMatchingPkg(senderPackages[0]);
                  setRole("sender");
                }}
                style={{
                  width: "100%",
                  padding: "7px 0",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid rgba(212,175,55,0.4)",
                  background: "transparent",
                  color: "#D4AF37",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  transition: "border-color 0.2s",
                }}
              >
                Request Rider
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoggedIn && (
        <div
          style={{
            marginTop: 16,
            background: "#111",
            border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 10,
            padding: "14px 16px",
            textAlign: "center",
          }}
          data-ocid="move.browse.signin_prompt"
        >
          <p style={{ color: "#9A9A9A", fontSize: 13 }}>
            <span style={{ color: "#D4AF37" }}>Sign in</span> via the Profile
            tab to post a package or register a route.
          </p>
        </div>
      )}
    </section>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        padding: "20px 16px 32px",
        minHeight: "100%",
        background: "#0A0A0A",
      }}
      data-ocid="move.page"
    >
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, #F2D37A 0%, #D4AF37 55%, #B8871A 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Truck size={18} style={{ color: "#111" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                color: "#E8E8E8",
                fontSize: 22,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Stancard Move
            </h1>
            <p
              style={{
                color: "#D4AF37",
                fontSize: 12,
                margin: 0,
                fontWeight: 500,
              }}
            >
              Deliver. Connect. Move.
            </p>
          </div>
          {/* Track Shipment button */}
          <button
            type="button"
            onClick={() => onTrackShipment?.("")}
            style={{
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: 9,
              color: "#D4AF37",
              cursor: "pointer",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
            }}
            data-ocid="move.track_shipment.button"
          >
            📍 Track
          </button>
        </div>
      </div>

      {/* Role toggle */}
      <div
        style={{
          display: "inline-flex",
          background: "#111",
          border: "1px solid #1A1A1A",
          borderRadius: 10,
          padding: 4,
          marginBottom: 24,
          gap: 4,
        }}
        data-ocid="move.role.toggle"
      >
        {(["rider", "sender"] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            style={{
              background: role === r ? "#D4AF37" : "#1A1A1A",
              color: role === r ? "#111" : "#6C6C6C",
              border: "none",
              borderRadius: 7,
              padding: "8px 22px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              transition: "all 0.18s ease",
              textTransform: "capitalize",
            }}
            data-ocid={`move.role.${r}.tab`}
          >
            {r === "rider" ? "🚗 Rider" : "📦 Sender"}
          </button>
        ))}
      </div>

      {/* Role content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, x: role === "rider" ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: role === "rider" ? 12 : -12 }}
          transition={{ duration: 0.2 }}
        >
          {role === "rider" ? riderView : senderView}
        </motion.div>
      </AnimatePresence>

      {/* Browse section — always visible */}
      {browseSection}

      {/* Modals */}
      <AnimatePresence>
        {showRouteModal && (
          <RouteModal
            open={showRouteModal}
            onClose={() => {
              setShowRouteModal(false);
              setEditingRoute(null);
            }}
            onSubmit={handleRegisterRoute}
            initial={
              editingRoute
                ? {
                    vehicleType: editingRoute.vehicleType,
                    departureCity: editingRoute.departureCity,
                    departureCountry: editingRoute.departureCountry,
                    destinationCity: editingRoute.destinationCity,
                    destinationCountry: editingRoute.destinationCountry,
                    travelDate: editingRoute.travelDate,
                    cargoSpace: editingRoute.cargoSpace,
                  }
                : undefined
            }
            isLoading={routeModalLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingRouteId && (
          <ConfirmDeleteModal
            open={!!deletingRouteId}
            onClose={() => setDeletingRouteId(null)}
            onConfirm={handleDeleteRoute}
            isLoading={deleteLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPkgModal && (
          <PackageModal
            open={showPkgModal}
            onClose={() => setShowPkgModal(false)}
            onSubmit={handlePostPackage}
            isLoading={pkgModalLoading}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchingPkg && actor && (
          <MatchedRidersPanel
            pkg={matchingPkg}
            actor={actor as MoveActor}
            senderRequests={senderRequests}
            onRequestSent={() => {
              void loadSenderData();
              setMatchingPkg(null);
            }}
            onClose={() => setMatchingPkg(null)}
            displayName={displayName}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
